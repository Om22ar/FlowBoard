import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  AfterViewInit,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { DrawingPoint } from '../models/whiteboard.models';

@Component({
  selector: 'app-touchpad-floating-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showTouchpadOverlay()) {
      <div
        class="fixed bottom-20 right-6 z-40 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-md w-80 md:w-96 overflow-hidden flex flex-col select-none transition-all animate-bounce-in"
      >
        <!-- TouchPad Header -->
        <div class="px-4 py-2.5 bg-neutral-100/90 dark:bg-neutral-800/90 border-b border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <mat-icon class="text-xs">laptop_chromebook</mat-icon>
            </div>
            <div>
              <h4 class="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                Laptop TouchPad Mode
                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Direct Finger Draw
                </span>
              </h4>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button
              (click)="toggleCollapse()"
              class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md"
              [title]="isCollapsed() ? 'Expand Pad' : 'Minimize Pad'"
            >
              <mat-icon class="text-sm">{{ isCollapsed() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
            <button
              (click)="store.showTouchpadOverlay.set(false)"
              class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md"
              title="Close TouchPad Pad"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>
        </div>

        @if (!isCollapsed()) {
          <div class="p-3 space-y-2.5">
            <!-- Quick Tool & Color Selection -->
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800 text-xs">
              <div class="flex items-center gap-1">
                <button
                  (click)="store.activeTool.set('pen')"
                  title="Pen Tool"
                  class="p-1.5 rounded-lg transition-colors cursor-pointer"
                  [class.bg-blue-100]="store.activeTool() === 'pen'"
                  [class.text-blue-700]="store.activeTool() === 'pen'"
                  [class.text-neutral-600]="store.activeTool() !== 'pen'"
                >
                  <mat-icon class="text-base">brush</mat-icon>
                </button>
                <button
                  (click)="store.activeTool.set('highlighter')"
                  title="Highlighter"
                  class="p-1.5 rounded-lg transition-colors cursor-pointer"
                  [class.bg-amber-100]="store.activeTool() === 'highlighter'"
                  [class.text-amber-700]="store.activeTool() === 'highlighter'"
                  [class.text-neutral-600]="store.activeTool() !== 'highlighter'"
                >
                  <mat-icon class="text-base">format_paint</mat-icon>
                </button>
                <button
                  (click)="store.activeTool.set('eraser')"
                  title="Eraser"
                  class="p-1.5 rounded-lg transition-colors cursor-pointer"
                  [class.bg-rose-100]="store.activeTool() === 'eraser'"
                  [class.text-rose-700]="store.activeTool() === 'eraser'"
                  [class.text-neutral-600]="store.activeTool() !== 'eraser'"
                >
                  <mat-icon class="text-base">auto_fix_normal</mat-icon>
                </button>
              </div>

              <!-- Color Palette -->
              <div class="flex items-center gap-1">
                @for (c of palette; track c) {
                  <button
                    (click)="store.penColor.set(c)"
                    class="w-4 h-4 rounded-full border border-black/10 transition-transform hover:scale-125"
                    [style.background-color]="c"
                    [class.ring-2]="store.penColor() === c"
                    [class.ring-blue-500]="store.penColor() === c"
                    [attr.aria-label]="'Select color ' + c"
                  ></button>
                }
              </div>
            </div>

            <!-- Touchpad Glide Drawing Canvas Area -->
            <div
              #padContainer
              class="relative w-full h-44 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden cursor-crosshair touch-none shadow-inner flex flex-col justify-between p-2"
              (pointerdown)="onPadPointerDown($event)"
              (pointermove)="onPadPointerMove($event)"
              (pointerup)="onPadPointerUp($event)"
              (pointercancel)="onPadPointerUp($event)"
            >
              <canvas #miniCanvas class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

              <div class="relative z-10 flex items-center justify-between text-[10px] text-neutral-400 font-mono pointer-events-none">
                <span>Glide finger / trackpad</span>
                <span class="text-emerald-400 font-semibold">{{ currentSpeedLabel() }}</span>
              </div>

              <div class="relative z-10 text-center text-[10px] text-neutral-500 font-sans pointer-events-none">
                Draw here or anywhere on the main whiteboard
              </div>
            </div>

            <!-- Dynamics & Sensitivity Controls -->
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="flex items-center justify-between px-2 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span class="text-neutral-500">Pressure:</span>
                <button
                  (click)="cycleSensitivity()"
                  class="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer capitalize"
                >
                  {{ store.touchpadSensitivity() }}
                </button>
              </div>

              <div class="flex items-center justify-between px-2 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span class="text-neutral-500">Smoothing:</span>
                <button
                  (click)="cycleSmoothing()"
                  class="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer capitalize"
                >
                  {{ store.touchpadSmoothingLevel() }}
                </button>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="flex items-center justify-between pt-1 text-xs">
              <button
                (click)="clearMiniPad()"
                class="px-2.5 py-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <mat-icon class="text-xs">delete_sweep</mat-icon>
                <span>Clear</span>
              </button>

              <button
                (click)="store.undo()"
                class="px-2.5 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Undo last stroke"
              >
                <mat-icon class="text-xs">undo</mat-icon>
                <span>Undo</span>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class TouchpadFloatingPad implements AfterViewInit {
  readonly store = inject(WhiteboardStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('miniCanvas') miniCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('padContainer') padContainerRef?: ElementRef<HTMLDivElement>;

  readonly isCollapsed = signal<boolean>(false);
  readonly currentSpeedLabel = signal<string>('Ready');

  readonly palette = ['#0f172a', '#dc2626', '#16a34a', '#2563eb', '#ca8a04', '#7c3aed'];

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private activePoints: DrawingPoint[] = [];
  private lastPt: { x: number; y: number; time: number } | null = null;
  private lastPressure = 0.5;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.initCanvas(), 100);
  }

  private initCanvas(): void {
    if (!this.isBrowser || !this.miniCanvasRef) return;
    const canvas = this.miniCanvasRef.nativeElement;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  onPadPointerDown(e: PointerEvent): void {
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const normX = Math.max(0, Math.min(1, x / rect.width));
    const normY = Math.max(0, Math.min(1, y / rect.height));

    this.isDrawing = true;
    this.lastPt = { x: e.clientX, y: e.clientY, time: Date.now() };
    this.lastPressure = 0.5;
    this.activePoints = [{ x: normX, y: normY, pressure: 0.5, time: Date.now() }];

    if (!this.ctx && this.miniCanvasRef) {
      this.initCanvas();
    }

    if (this.store.activeTool() === 'eraser') {
      this.store.executeCompanionCommand('REMOTE_ERASE', { x: normX, y: normY });
      if (this.ctx) {
        this.ctx.clearRect(x - 12, y - 12, 24, 24);
      }
    } else {
      this.store.executeCompanionCommand('REMOTE_DRAW_START', {
        x: normX,
        y: normY,
        color: this.store.penColor(),
        width: this.store.strokeWidth(),
        tool: this.store.activeTool(),
        pressure: 0.5
      });

      if (this.ctx) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.store.strokeWidth() / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.store.penColor();
        this.ctx.fill();
      }
    }
  }

  onPadPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const normX = Math.max(0, Math.min(1, x / rect.width));
    const normY = Math.max(0, Math.min(1, y / rect.height));

    let pressure = 0.5;
    if (this.lastPt) {
      const dt = Math.max(1, Date.now() - this.lastPt.time);
      const dist = Math.hypot(e.clientX - this.lastPt.x, e.clientY - this.lastPt.y);
      const speed = dist / dt;

      if (this.store.touchpadSensitivity() === 'expressive') {
        pressure = Math.max(0.2, Math.min(0.95, 0.85 - (speed * 0.18)));
        this.currentSpeedLabel.set(speed > 1.2 ? 'Fast Flick' : 'Controlled');
      } else if (this.store.touchpadSensitivity() === 'light') {
        pressure = Math.max(0.15, Math.min(0.7, 0.6 - (speed * 0.15)));
        this.currentSpeedLabel.set('Light Touch');
      } else {
        pressure = 0.6;
        this.currentSpeedLabel.set('Balanced');
      }

      pressure = this.lastPressure * 0.6 + pressure * 0.4;
      this.lastPressure = pressure;
    }

    this.lastPt = { x: e.clientX, y: e.clientY, time: Date.now() };
    this.activePoints.push({ x: normX, y: normY, pressure, time: Date.now() });

    if (this.store.activeTool() === 'eraser') {
      this.store.executeCompanionCommand('REMOTE_ERASE', { x: normX, y: normY });
      if (this.ctx) {
        this.ctx.clearRect(x - 12, y - 12, 24, 24);
      }
    } else {
      this.store.executeCompanionCommand('REMOTE_DRAW_MOVE', {
        x: normX,
        y: normY,
        pressure,
        color: this.store.penColor(),
        width: this.store.strokeWidth(),
        tool: this.store.activeTool()
      });

      if (this.ctx && this.activePoints.length >= 2) {
        const prev = this.activePoints[this.activePoints.length - 2];
        const prevX = prev.x * rect.width;
        const prevY = prev.y * rect.height;

        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = this.store.penColor();
        this.ctx.lineWidth = Math.max(1.5, this.store.strokeWidth() * (pressure || 0.6));
        this.ctx.stroke();
      }
    }
  }

  onPadPointerUp(e: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastPt = null;
    this.currentSpeedLabel.set('Ready');

    if (this.store.activeTool() !== 'eraser' && this.activePoints.length > 0) {
      const strokeObj = {
        strokeId: 'touchpad-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        points: [...this.activePoints],
        color: this.store.penColor(),
        width: this.store.strokeWidth(),
        tool: this.store.activeTool(),
        opacity: this.store.activeTool() === 'highlighter' ? 0.45 : this.store.penOpacity()
      };

      this.store.executeCompanionCommand('REMOTE_STROKE_COMMIT', strokeObj);
      this.activePoints = [];
    }

    try {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  clearMiniPad(): void {
    if (this.ctx && this.miniCanvasRef) {
      const canvas = this.miniCanvasRef.nativeElement;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  cycleSensitivity(): void {
    const current = this.store.touchpadSensitivity();
    if (current === 'expressive') this.store.touchpadSensitivity.set('normal');
    else if (current === 'normal') this.store.touchpadSensitivity.set('light');
    else this.store.touchpadSensitivity.set('expressive');
  }

  cycleSmoothing(): void {
    const current = this.store.touchpadSmoothingLevel();
    if (current === 'standard') this.store.touchpadSmoothingLevel.set('high');
    else if (current === 'high') this.store.touchpadSmoothingLevel.set('ultra');
    else this.store.touchpadSmoothingLevel.set('standard');
  }
}
