import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CanvasObject, ShapeType, ToolType } from '../models/whiteboard.models';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-floating-tool-dock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <!-- Main Floating Bottom Tool Dock (Exact replica of image.png) -->
    <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center bg-white/95 dark:bg-[#1a1b1e]/95 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.09),0_1px_3px_rgba(0,0,0,0.05)] px-2 py-1.5 backdrop-blur-xl gap-1 select-none">
      
      <!-- 1. SELECT TOOL (V) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">V</span>
        <button
          (click)="setTool('select')"
          [title]="'Select (V)'"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'select'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'select'"
          [class.shadow-2xs]="store.activeTool() === 'select'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'select'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'select'"
        >
          <svg class="w-4 h-4 fill-neutral-800 dark:fill-neutral-100" viewBox="0 0 24 24">
            <path d="M4 2 L19 12 L12 13.5 L8.5 21 L5.5 19.5 L8.5 13 L4 11.5 Z"/>
          </svg>
        </button>
      </div>

      <!-- 2. HAND / PAN TOOL (H) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">H</span>
        <button
          (click)="setTool('hand')"
          [title]="'Hand / Pan (H)'"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'hand'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'hand'"
          [class.shadow-2xs]="store.activeTool() === 'hand'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'hand'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'hand'"
        >
          <svg class="w-5 h-5 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M18 11V6a2 2 0 0 0-4 0v5"/>
            <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
            <path d="M18 8a2 2 0 0 1 4 4v4a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.8-6.2-2.8L3 17.5a1.5 1.5 0 0 1 2.3-1.9L7 17"/>
          </svg>
        </button>
      </div>

      <!-- 3. TASK CARD (⇧ T) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">⇧ T</span>
        <button
          (click)="addTaskCard()"
          title="Task Card (Shift+T)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'task'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'task'"
          [class.shadow-2xs]="store.activeTool() === 'task'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'task'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'task'"
        >
          <div class="relative w-7 h-7 flex items-center justify-center">
            <!-- Back stacked card -->
            <div class="absolute inset-0 translate-x-0.5 -translate-y-0.5 rounded border border-neutral-300/80 bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700"></div>
            <!-- Front task card -->
            <div class="relative w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs p-0.5 flex flex-col justify-between">
              <div class="flex items-center gap-0.5">
                <svg class="w-2.5 h-2.5 text-neutral-700 dark:text-neutral-300 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="text-[6.5px] font-bold text-neutral-800 dark:text-neutral-200 leading-none">Task</span>
              </div>
              <div class="flex items-center gap-0.5">
                <div class="h-1 flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                <div class="h-1.5 w-3 bg-[#0070f3] rounded-xs shrink-0"></div>
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- 4. DRAW / PENCIL (D) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">D</span>
        <button
          (click)="togglePenTray()"
          title="Draw / Pencil (D) - Click to toggle tray"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="isPenActive()"
          [class.dark:bg-neutral-800]="isPenActive()"
          [class.shadow-2xs]="isPenActive()"
          [class.hover:bg-neutral-100]="!isPenActive()"
          [class.dark:hover:bg-neutral-800/60]="!isPenActive()"
        >
          <div class="relative w-7 h-7 flex items-center justify-center">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <!-- Wooden sharpened collar -->
              <path d="M7 21 L12 6 L17 21 Z" fill="#f8f4eb" stroke="#d5c8b5" stroke-width="0.8" stroke-linejoin="round"/>
              <!-- Black graphite tip -->
              <path d="M10 12 L12 6 L14 12 Z" fill="#2d3139"/>
              <!-- Wood grain detail line -->
              <line x1="12" y1="12" x2="12" y2="21" stroke="#e8dfd1" stroke-width="0.75"/>
            </svg>
          </div>
        </button>
      </div>

      <!-- 5. RECTANGLE / SHAPES (R) -->
      <div class="flex flex-col items-center relative">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">R</span>
        <button
          (click)="toggleShapeMenu()"
          title="Shapes (R)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'shape'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'shape'"
          [class.shadow-2xs]="store.activeTool() === 'shape'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'shape'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'shape'"
        >
          <div class="w-6 h-6 rounded-md bg-[#2b303a] shadow-xs border border-neutral-700/50"></div>
        </button>

        <!-- Shape Submenu Dropdown -->
        @if (showShapeMenu()) {
          <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
            <button (click)="selectShape('rectangle')" class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300" title="Rectangle">
              <mat-icon class="text-base">crop_din</mat-icon>
            </button>
            <button (click)="selectShape('circle')" class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300" title="Circle">
              <mat-icon class="text-base">radio_button_unchecked</mat-icon>
            </button>
            <button (click)="selectShape('triangle')" class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300" title="Triangle">
              <mat-icon class="text-base">change_history</mat-icon>
            </button>
            <button (click)="selectShape('diamond')" class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300" title="Diamond">
              <mat-icon class="text-base">square</mat-icon>
            </button>
          </div>
        }
      </div>

      <!-- 6. ARROW / CONNECTOR (A) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">A</span>
        <button
          (click)="addArrow()"
          title="Arrow Connector (A)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'arrow'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'arrow'"
          [class.shadow-2xs]="store.activeTool() === 'arrow'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'arrow'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'arrow'"
        >
          <svg class="w-5 h-6 text-[#2b303a] dark:text-neutral-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="20" x2="12" y2="5"/>
            <polyline points="6 11 12 5 18 11"/>
          </svg>
        </button>
      </div>

      <!-- 7. STICKY NOTE (N) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">N</span>
        <button
          (click)="addStickyNote()"
          title="Sticky Note (N)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'sticky'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'sticky'"
          [class.shadow-2xs]="store.activeTool() === 'sticky'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'sticky'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'sticky'"
        >
          <div class="relative w-6 h-6 flex items-center justify-center">
            <svg class="w-6 h-6 drop-shadow-2xs" viewBox="0 0 24 24">
              <path d="M4 3h16v18H9l-5-5V3z" fill="#facc15"/>
              <path d="M4 16h5v5l-5-5z" fill="#eab308"/>
              <path d="M9 16l-5 5" stroke="#ca8a04" stroke-width="0.75"/>
            </svg>
          </div>
        </button>
      </div>

      <!-- 8. TEXT (T) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">T</span>
        <button
          (click)="addText()"
          title="Text (T)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'text'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'text'"
          [class.shadow-2xs]="store.activeTool() === 'text'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'text'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'text'"
        >
          <div class="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 shadow-2xs flex items-center justify-center">
            <span class="font-serif font-black text-sm text-neutral-900 dark:text-neutral-100 leading-none select-none">T</span>
          </div>
        </button>
      </div>

      <!-- 9. FRAME / ARTBOARD (F) -->
      <div class="flex flex-col items-center">
        <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 h-3 leading-3 tracking-wide">F</span>
        <button
          (click)="addFrame()"
          title="Frame / Section (F)"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-[#e5e7eb]]="store.activeTool() === 'frame'"
          [class.dark:bg-neutral-800]="store.activeTool() === 'frame'"
          [class.shadow-2xs]="store.activeTool() === 'frame'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'frame'"
          [class.dark:hover:bg-neutral-800/60]="store.activeTool() !== 'frame'"
        >
          <div class="relative w-6 h-7 flex items-center justify-center">
            <div class="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 relative">
              <div class="absolute -top-1 left-0.5 w-3 h-1.5 rounded-t-xs bg-neutral-400 dark:bg-neutral-500"></div>
            </div>
          </div>
        </button>
      </div>

      <!-- 10. MEDIA / PHOTO CARD -->
      <div class="flex flex-col items-center">
        <span class="h-3"></span>
        <button
          (click)="triggerImageUpload()"
          title="Upload / Insert Image"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
        >
          <div class="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 shadow-2xs overflow-hidden relative flex flex-col justify-end">
            <!-- Sky and Sun -->
            <div class="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-200/40 dark:from-neutral-700 dark:to-neutral-800"></div>
            <div class="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400/90 shadow-2xs"></div>
            <!-- Mountain waves -->
            <svg class="relative w-full h-3" viewBox="0 0 24 12" preserveAspectRatio="none">
              <path d="M0 12 L0 6 C4 4, 8 8, 12 5 C16 2, 20 7, 24 4 L24 12 Z" fill="#3b82f6"/>
              <path d="M0 12 L0 8 C6 6, 14 10, 24 7 L24 12 Z" fill="#1d4ed8" opacity="0.6"/>
            </svg>
          </div>
          <input #fileInput type="file" accept="image/*" (change)="onImageSelected($event)" class="hidden" />
        </button>
      </div>

      <!-- 11. DIAGRAMS & FLOWCHARTS (STACKED TEMPLATE CARDS) -->
      <div class="flex flex-col items-center">
        <span class="h-3"></span>
        <button
          (click)="store.showTemplateModal.set(true)"
          title="Templates & Diagrams"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
        >
          <div class="relative w-7 h-7 flex items-center justify-center">
            <!-- Back stacked card -->
            <div class="absolute inset-0 translate-x-0.5 -translate-y-0.5 rounded border border-neutral-300/70 bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700"></div>
            <!-- Front diagram card -->
            <div class="relative w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs p-0.5 flex flex-col justify-between overflow-hidden">
              <div class="flex items-center justify-between px-0.5">
                <div class="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                <div class="w-2 h-0.5 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                <div class="w-1.5 h-1.5 rounded-xs bg-rose-400"></div>
              </div>
              <div class="flex items-center justify-between px-0.5">
                <div class="w-2 h-1 bg-purple-400 rounded-xs"></div>
                <div class="w-1 h-1 rounded-full bg-blue-500"></div>
                <div class="w-2 h-1 bg-emerald-400 rounded-xs"></div>
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- 12. AI / SMART WIDGETS (RAINBOW FLOWER) -->
      <div class="flex flex-col items-center">
        <span class="h-3"></span>
        <button
          (click)="store.showCompanionModal.set(true)"
          title="Smart Tools & AI Companion"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
        >
          <div class="relative w-7 h-7 flex items-center justify-center">
            <!-- Magenta card behind -->
            <div class="absolute bottom-0 right-0 w-4 h-4 rounded bg-gradient-to-tr from-pink-500 to-purple-500 opacity-90 shadow-2xs rotate-6"></div>
            <!-- Rainbow gradient starburst flower -->
            <svg class="relative w-5 h-5 drop-shadow-xs" viewBox="0 0 24 24">
              <circle cx="12" cy="7" r="3.2" fill="#3b82f6"/>
              <circle cx="17" cy="12" r="3.2" fill="#a855f7"/>
              <circle cx="12" cy="17" r="3.2" fill="#ec4899"/>
              <circle cx="7" cy="12" r="3.2" fill="#06b6d4"/>
              <circle cx="12" cy="12" r="2.2" fill="#ffffff"/>
            </svg>
          </div>
        </button>
      </div>

      <!-- 13. VERTICAL DIVIDER -->
      <div class="w-px h-8 bg-neutral-200 dark:bg-neutral-800 mx-1 self-center"></div>

      <!-- 14. VERTICALLY STACKED UNDO / REDO -->
      <div class="flex flex-col items-center justify-center gap-0.5 px-0.5">
        <button
          (click)="store.undo()"
          [disabled]="!store.canUndo()"
          title="Undo (Ctrl+Z)"
          class="p-0.5 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <mat-icon class="text-sm scale-90">undo</mat-icon>
        </button>
        <button
          (click)="store.redo()"
          [disabled]="!store.canRedo()"
          title="Redo (Ctrl+Y)"
          class="p-0.5 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <mat-icon class="text-sm scale-90">redo</mat-icon>
        </button>
      </div>

    </div>
  `
})
export class FloatingToolDock {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  readonly store = inject(WhiteboardStore);
  readonly showShapeMenu = signal<boolean>(false);

  isPenActive(): boolean {
    return ['pen', 'pencil', 'highlighter'].includes(this.store.activeTool());
  }

  togglePenTray(): void {
    const isDrawing = this.isPenActive();
    if (!isDrawing) {
      this.store.activeTool.set('pen');
      this.store.showPenTray.set(true);
    } else {
      // Pressed pen again: toggle pen tray open/close, and keep working (activeTool stays pen)!
      this.store.showPenTray.update(v => !v);
    }
    this.showShapeMenu.set(false);
  }

  setTool(tool: ToolType): void {
    this.store.activeTool.set(tool);
    this.showShapeMenu.set(false);
    if (!['pen', 'pencil', 'highlighter'].includes(tool)) {
      this.store.showPenTray.set(false);
    }
  }

  toggleShapeMenu(): void {
    this.store.showPenTray.set(false);
    if (this.store.activeTool() !== 'shape') {
      this.store.activeTool.set('shape');
      this.showShapeMenu.set(true);
    } else {
      this.showShapeMenu.update(v => !v);
    }
  }

  selectShape(type: ShapeType): void {
    this.store.selectedShapeType.set(type);
    this.store.activeTool.set('shape');
    this.showShapeMenu.set(false);
    this.store.showPenTray.set(false);
  }

  addTaskCard(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 90;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 50;

    const taskObj: CanvasObject = {
      id: 'task-' + Date.now(),
      type: 'task',
      x: cx,
      y: cy,
      width: 180,
      height: 100,
      rotation: 0,
      zIndex: Date.now(),
      content: '✓ Research Ideas\n☐ Create mockups\n☐ Ship to production',
      style: {
        fill: '#ffffff',
        stroke: '#cbd5e1',
        strokeWidth: 1.5,
        borderRadius: 12,
        textColor: '#1e293b',
        fontSize: 13,
        fontWeight: '500'
      }
    };
    this.store.addObject(taskObj);
    this.store.activeTool.set('select');
    this.store.showToast('Added Task Card to canvas', 'info');
  }

  addStickyNote(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 75;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 75;

    const sticky: CanvasObject = {
      id: 'sticky-' + Date.now(),
      type: 'sticky',
      x: cx,
      y: cy,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: Date.now(),
      content: 'Brainstorm idea...',
      style: {
        fill: '#fef08a',
        stroke: '#facc15',
        strokeWidth: 1,
        borderRadius: 8,
        textColor: '#1f2937',
        fontSize: 14
      }
    };
    this.store.addObject(sticky);
    this.store.activeTool.set('select');
    this.store.showToast('Added Sticky Note to canvas', 'info');
  }

  addText(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 60;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 20;

    const textObj: CanvasObject = {
      id: 'text-' + Date.now(),
      type: 'text',
      x: cx,
      y: cy,
      width: 160,
      height: 40,
      rotation: 0,
      zIndex: Date.now(),
      content: 'Type something...',
      style: {
        textColor: '#0f172a',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'sans-serif'
      }
    };
    this.store.addObject(textObj);
    this.store.activeTool.set('select');
    this.store.showToast('Added Text to canvas', 'info');
  }

  addFrame(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 240;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 160;
    const count = this.store.frames().length + 1;

    const frameObj: CanvasObject = {
      id: 'frame-' + Date.now(),
      type: 'frame',
      x: cx,
      y: cy,
      width: 480,
      height: 320,
      rotation: 0,
      zIndex: 1,
      content: `Frame ${count}`,
      style: {
        fill: '#ffffff',
        stroke: '#cbd5e1',
        strokeWidth: 2,
        borderRadius: 8,
        textColor: '#64748b',
        fontSize: 14,
        fontWeight: 'bold'
      },
      metadata: {
        frameNumber: count
      }
    };
    this.store.addObject(frameObj);
    this.store.showToast('Added Frame artboard', 'info');
  }

  addArrow(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 50;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 50;

    const arrowObj: CanvasObject = {
      id: 'arrow-' + Date.now(),
      type: 'shape',
      x: cx,
      y: cy,
      width: 120,
      height: 50,
      rotation: 0,
      zIndex: Date.now(),
      content: '→ Next',
      style: {
        fill: '#f1f5f9',
        stroke: '#2563eb',
        strokeWidth: 2,
        borderRadius: 8,
        textColor: '#1e293b',
        fontSize: 13
      },
      metadata: {
        shapeType: 'rounded-rect'
      }
    };
    this.store.addObject(arrowObj);
    this.store.activeTool.set('select');
    this.store.showToast('Added Connector / Flow Arrow', 'info');
  }

  triggerImageUpload(): void {
    this.fileInput?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const vp = this.store.currentBoard().viewport;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const cx = (screenW / 2 - vp.x) / vp.zoom - 100;
        const cy = (screenH / 2 - vp.y) / vp.zoom - 75;

        const imgObj: CanvasObject = {
          id: 'image-' + Date.now(),
          type: 'image',
          x: cx,
          y: cy,
          width: 200,
          height: 150,
          rotation: 0,
          zIndex: Date.now(),
          content: dataUrl,
          style: {
            fill: '#ffffff',
            stroke: '#e2e8f0',
            strokeWidth: 1,
            borderRadius: 8
          }
        };
        this.store.addObject(imgObj);
        this.store.showToast('Image inserted onto canvas', 'success');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }
}
