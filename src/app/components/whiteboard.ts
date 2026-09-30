import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  OnDestroy,
  ChangeDetectionStrategy,
  NgZone,
  effect,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import * as fabric from 'fabric';
import { WhiteboardStore } from '../services/whiteboard-store';
import { InputService, NormalizedInputEvent } from '../services/input-service';
import { CanvasObject, DrawingStroke } from '../models/whiteboard.models';
import { Subscription } from 'rxjs';

/**
 * Extended interfaces to support Infinite Workspace rendering in Fabric.js.
 */
export interface InfiniteCanvasObject extends fabric.Object {
  id: string;
  isLocked?: boolean;
}

@Component({
  selector: 'app-whiteboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  host: {
    '(window:keydown)': 'onKeyDown($event)'
  },
  template: `
    <div
      #container
      class="w-full h-full relative overflow-hidden bg-[#f8f9fa] dark:bg-[#121212] select-none touch-none"
      (pointerleave)="eraserCursorPos.set(null)"
    >
      <canvas #canvasElement></canvas>

      <!-- Visual Eraser Reticle Overlay -->
      @if (isEraserActive() && eraserCursorPos(); as pos) {
        <div
          class="pointer-events-none absolute rounded-full border-2 border-rose-500 bg-rose-500/15 -translate-x-1/2 -translate-y-1/2 shadow-xs transition-none z-20 flex items-center justify-center"
          [style.left.px]="pos.x"
          [style.top.px]="pos.y"
          [style.width.px]="eraserRadius() * 2"
          [style.height.px]="eraserRadius() * 2"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
        </div>
      }
      
      <!-- Viewport Controls Overlay -->
      <div class="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
         <div class="flex items-center bg-white/90 dark:bg-neutral-800/90 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 gap-3">
           <button (click)="zoomOut()" class="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-400">
             <mat-icon class="text-sm">remove</mat-icon>
           </button>
           <span class="text-[11px] font-mono w-10 text-center text-neutral-500">{{ zoomPercent() }}%</span>
           <button (click)="zoomIn()" class="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-400">
             <mat-icon class="text-sm">add</mat-icon>
           </button>
           <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-700"></div>
           <button (click)="resetViewport()" class="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-400" title="Reset View">
             <mat-icon class="text-sm">center_focus_strong</mat-icon>
           </button>
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .canvas-container { position: absolute !important; inset: 0; }
  `]
})
export class Whiteboard implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private canvas!: fabric.Canvas;
  readonly store = inject(WhiteboardStore);
  private readonly inputService = inject(InputService);
  private readonly ngZone = inject(NgZone);
  private subscription = new Subscription();
  
  // Scene Graph Map: ID -> Fabric Object
  private objectMap = new Map<string, fabric.Object>();

  // Interaction State
  private isPanning = false;
  private lastPanPos = { x: 0, y: 0 };
  private activePenId: number | null = null;
  private isDrawing = false;
  private isErasing = false;
  private currentPath: fabric.Path | null = null;
  private pathData: string[] = [];

  readonly eraserCursorPos = signal<{ x: number; y: number } | null>(null);
  readonly isEraserActive = computed(() => this.store.activeTool() === 'eraser');
  readonly eraserRadius = computed(() => Math.max(20, this.store.strokeWidth()));
  readonly zoomPercent = () => Math.round((this.canvas?.getZoom() || 1) * 100);

  constructor() {
    // Reactive sync with store objects
    effect(() => {
      const board = this.store.currentBoard();
      this.ngZone.runOutsideAngular(() => {
        this.syncSceneGraph(board.objects, board.strokes);
      });
    });

    // Reactive sync with tool selection
    effect(() => {
      const tool = this.store.activeTool();
      this.ngZone.runOutsideAngular(() => {
        if (this.canvas) {
          this.canvas.isDrawingMode = false;
          this.canvas.selection = tool === 'select';
          if (tool === 'hand') {
            this.canvas.defaultCursor = 'grab';
          } else if (tool === 'eraser') {
            this.canvas.defaultCursor = 'crosshair';
          } else if (tool === 'pen' || tool === 'pencil' || tool === 'highlighter') {
            this.canvas.defaultCursor = 'crosshair';
          } else {
            this.canvas.defaultCursor = 'default';
          }
        }
      });
      if (tool !== 'eraser') {
        this.eraserCursorPos.set(null);
      }
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initFabric();
      this.setupNativeInputListeners();
    });

    this.subscription.add(
      this.inputService.inputEvents$.subscribe((event) => {
        this.ngZone.run(() => this.handleNormalizedInput(event));
      })
    );
  }

  private initFabric(): void {
    const el = this.canvasElement.nativeElement;
    const parent = this.container.nativeElement;

    this.canvas = new fabric.Canvas(el, {
      width: parent.clientWidth,
      height: parent.clientHeight,
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      backgroundColor: 'transparent'
    });

    this.canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.05) zoom = 0.05;
      
      this.canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      this.canvas.requestRenderAll();
    });

    // Object modification sync
    this.canvas.on('object:modified', (opt) => {
      const fObj = opt.target as unknown as InfiniteCanvasObject;
      if (!fObj || !fObj.id) return;

      this.store.updateObject(fObj.id, {
        x: fObj.left,
        y: fObj.top,
        width: fObj.width * (fObj.scaleX || 1),
        height: fObj.height * (fObj.scaleY || 1),
        rotation: fObj.angle
      });
    });

    // Selection sync
    this.canvas.on('selection:created', (opt) => {
      const fObj = opt.selected?.[0] as unknown as InfiniteCanvasObject;
      if (fObj && fObj.id) this.store.selectedObjectId.set(fObj.id);
    });
    this.canvas.on('selection:updated', (opt) => {
      const fObj = opt.selected?.[0] as unknown as InfiniteCanvasObject;
      if (fObj && fObj.id) this.store.selectedObjectId.set(fObj.id);
    });
    this.canvas.on('selection:cleared', () => {
      this.store.selectedObjectId.set(null);
    });

    // Sync initial state
    const board = this.store.currentBoard();
    this.syncSceneGraph(board.objects, board.strokes);
  }

  private syncSceneGraph(objects: CanvasObject[], strokes: DrawingStroke[]): void {
    if (!this.canvas) return;

    // 1. Identify objects to remove
    const currentIds = new Set([...objects.map(o => o.id), ...strokes.map(s => s.id)]);
    for (const [id, fObj] of this.objectMap.entries()) {
      if (!currentIds.has(id)) {
        this.canvas.remove(fObj);
        this.objectMap.delete(id);
      }
    }

    // 2. Add or update shapes/objects
    objects.forEach(obj => {
      let fObj = this.objectMap.get(obj.id);
      if (!fObj) {
        fObj = this.createFabricObject(obj);
        if (fObj) {
          (fObj as InfiniteCanvasObject).id = obj.id;
          this.canvas.add(fObj);
          this.objectMap.set(obj.id, fObj);
        }
      } else {
        this.updateFabricObject(fObj, obj);
      }
    });

    // 3. Add or update strokes
    strokes.forEach(stroke => {
      if (!this.objectMap.has(stroke.id)) {
        const pathData = this.convertStrokeToPathData(stroke);
        const fPath = new fabric.Path(pathData, {
          stroke: stroke.color,
          strokeWidth: stroke.width,
          fill: '',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: true,
          evented: true,
          objectCaching: false
        });
        (fPath as unknown as InfiniteCanvasObject).id = stroke.id;
        this.canvas.add(fPath);
        this.objectMap.set(stroke.id, fPath);
      }
    });

    this.canvas.requestRenderAll();
  }

  private createFabricObject(obj: CanvasObject): fabric.Object | undefined {
    const common = {
      left: obj.x,
      top: obj.y,
      width: obj.width,
      height: obj.height,
      angle: obj.rotation,
      fill: obj.style.fill || '#ffffff',
      stroke: obj.style.stroke || '#000000',
      strokeWidth: obj.style.strokeWidth || 1,
      opacity: obj.style.opacity || 1
    };

    switch (obj.type) {
      case 'shape':
        if (obj.metadata?.shapeType === 'circle') {
          return new fabric.Circle({ ...common, radius: obj.width / 2 });
        }
        return new fabric.Rect(common);
      
      case 'sticky':
        return new fabric.Rect({
          ...common,
          shadow: new fabric.Shadow({ blur: 10, color: 'rgba(0,0,0,0.1)', offsetX: 2, offsetY: 2 })
        });

      case 'text':
        return new fabric.IText(obj.content || '', {
          ...common,
          fontSize: obj.style.fontSize || 20,
          fontFamily: obj.style.fontFamily || 'sans-serif'
        });

      default:
        return undefined;
    }
  }

  private updateFabricObject(fObj: fabric.Object, obj: CanvasObject): void {
    fObj.set({
      left: obj.x,
      top: obj.y,
      width: obj.width,
      height: obj.height,
      angle: obj.rotation,
      fill: obj.style.fill,
      stroke: obj.style.stroke,
      opacity: obj.style.opacity
    });
    if (fObj instanceof fabric.IText && obj.content !== undefined) {
      fObj.set({ text: obj.content });
    }
  }

  private convertStrokeToPathData(stroke: DrawingStroke): string {
    if (stroke.points.length === 0) return '';
    const points = stroke.points;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }

  private setupNativeInputListeners(): void {
    const el = this.canvas.upperCanvasEl;
    const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    events.forEach(type => {
      el.addEventListener(type, (e: Event) => {
        const pe = e as PointerEvent;
        const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        this.inputService.processPointerEvent(pe, el, { x: vpt[4], y: vpt[5], zoom: this.canvas.getZoom() });
      }, { passive: false });
    });

    const ro = new ResizeObserver(() => {
      this.ngZone.runOutsideAngular(() => {
        this.canvas.setDimensions({ width: this.container.nativeElement.clientWidth, height: this.container.nativeElement.clientHeight });
        this.canvas.requestRenderAll();
      });
    });
    ro.observe(this.container.nativeElement);
  }

  private handleNormalizedInput(event: NormalizedInputEvent): void {
    const { type, pointerType, originalEvent } = event;
    if (pointerType === 'pen') this.activePenId = originalEvent.pointerId;
    else if (this.activePenId !== null && pointerType === 'touch' && this.store.activeTool() === 'pen') return;

    switch (type) {
      case 'down': this.onDown(event); break;
      case 'move': this.onMove(event); break;
      case 'up':
      case 'cancel': this.onUp(event); break;
    }
  }

  private onDown(event: NormalizedInputEvent): void {
    const tool = this.store.activeTool();
    const isPanAction = tool === 'hand' || event.button === 1 || event.button === 2;
    if (isPanAction) {
      this.isPanning = true;
      this.lastPanPos = { x: event.originalEvent.clientX, y: event.originalEvent.clientY };
      this.canvas.selection = false;
      return;
    }

    const isEraser =
      tool === 'eraser' ||
      event.originalEvent.buttons === 32 ||
      (event.originalEvent as PointerEvent & { pointerType?: string }).pointerType === 'eraser';

    if (isEraser) {
      this.isErasing = true;
      this.store.snapshotHistory();
      this.performErase(event.canvasX, event.canvasY, event.originalEvent);
      return;
    }

    if (tool === 'shape') {
      this.createShapeAt(event.canvasX, event.canvasY);
      return;
    }

    if (this.isDrawingTool(tool)) {
      this.isDrawing = true;
      this.startStroke(event);
    }
  }

  private performErase(canvasX: number, canvasY: number, originalEvent?: PointerEvent): void {
    const radius = Math.max(24, this.store.strokeWidth());
    
    // 1. Erase strokes geometrically
    const strokesErased = this.store.eraseStrokesAt(canvasX, canvasY, radius, false);

    // 2. Erase objects geometrically
    const objectsErased = this.store.eraseObjectsAt(canvasX, canvasY, radius, false);

    // 3. Fallback: check Fabric object under pointer
    if (!strokesErased && !objectsErased && originalEvent) {
      const target = this.canvas.findTarget(originalEvent) as unknown as InfiniteCanvasObject;
      if (target && target.id) {
        this.store.deleteObjectById(target.id);
      }
    }
  }

  private createShapeAt(x: number, y: number): void {
    const type = this.store.selectedShapeType();
    const id = 'shape-' + Date.now();
    const newObj: CanvasObject = {
      id,
      type: 'shape',
      x,
      y,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: Date.now(),
      style: {
        fill: '#ffffff',
        stroke: this.store.penColor(),
        strokeWidth: 2,
        opacity: 1
      },
      metadata: {
        shapeType: type
      }
    };
    this.store.addObject(newObj);
  }

  private onMove(event: NormalizedInputEvent): void {
    // Update visual eraser reticle position on canvas
    if (this.store.activeTool() === 'eraser') {
      const rect = this.container.nativeElement.getBoundingClientRect();
      this.eraserCursorPos.set({
        x: event.originalEvent.clientX - rect.left,
        y: event.originalEvent.clientY - rect.top
      });
    }

    if (this.isPanning) {
      const dx = event.originalEvent.clientX - this.lastPanPos.x;
      const dy = event.originalEvent.clientY - this.lastPanPos.y;
      this.canvas.relativePan(new fabric.Point(dx, dy));
      this.lastPanPos = { x: event.originalEvent.clientX, y: event.originalEvent.clientY };
      return;
    }

    if (this.isErasing) {
      this.performErase(event.canvasX, event.canvasY, event.originalEvent);
      return;
    }

    if (this.isDrawing) this.updateStroke(event);
  }

  private onUp(event: NormalizedInputEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.selection = this.store.activeTool() === 'select';
    }
    if (this.isErasing) {
      this.isErasing = false;
    }
    if (this.isDrawing) {
      this.isDrawing = false;
      this.commitStroke();
    }
    if (event.pointerType === 'pen') this.activePenId = null;
  }

  onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.store.deleteSelectedObject();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        this.store.redo();
      } else {
        this.store.undo();
      }
      e.preventDefault();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      this.store.redo();
      e.preventDefault();
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'e':
        this.store.activeTool.set('eraser');
        break;
      case 'p':
        this.store.activeTool.set('pen');
        break;
      case 'v':
        this.store.activeTool.set('select');
        break;
      case 'h':
        this.store.activeTool.set('hand');
        break;
    }
  }

  private isDrawingTool(tool: string): boolean {
    return ['pen', 'pencil', 'highlighter'].includes(tool);
  }

  private startStroke(event: NormalizedInputEvent): void {
    const { canvasX, canvasY, pressure } = event;
    this.pathData = [`M ${canvasX} ${canvasY}`];
    this.currentPath = new fabric.Path(this.pathData.join(' '), {
      stroke: this.store.penColor(),
      strokeWidth: this.store.strokeWidth() * (pressure || 1),
      fill: '',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false,
      objectCaching: false
    });
    this.canvas.add(this.currentPath);
  }

  private updateStroke(event: NormalizedInputEvent): void {
    if (!this.currentPath) return;
    this.pathData.push(`L ${event.canvasX} ${event.canvasY}`);
    this.currentPath.set({ path: this.parsePathData(this.pathData) } as Partial<fabric.Path>);
    this.canvas.requestRenderAll();
  }

  private commitStroke(): void {
    if (this.currentPath) {
      const stroke: DrawingStroke = {
        id: 'stroke-' + Date.now(),
        points: this.pathData.map(p => {
          const parts = p.split(' ');
          return { x: parseFloat(parts[1]), y: parseFloat(parts[2]), pressure: 0.5, time: Date.now() };
        }),
        color: this.store.penColor(),
        width: this.store.strokeWidth(),
        opacity: 1,
        tool: 'pen',
        smoothing: true
      };
      this.store.addStroke(stroke);
      this.canvas.remove(this.currentPath);
      this.currentPath = null;
    }
  }

  private parsePathData(data: string[]): (string | number)[][] {
    return data.map(cmd => {
      const parts = cmd.split(' ');
      return [parts[0], parseFloat(parts[1]), parseFloat(parts[2])];
    });
  }

  zoomIn(): void { this.canvas.setZoom(this.canvas.getZoom() * 1.1); this.canvas.requestRenderAll(); }
  zoomOut(): void { this.canvas.setZoom(this.canvas.getZoom() * 0.9); this.canvas.requestRenderAll(); }
  resetViewport(): void { this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); this.canvas.setZoom(1); this.canvas.requestRenderAll(); }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.canvas) this.canvas.dispose();
  }
}

