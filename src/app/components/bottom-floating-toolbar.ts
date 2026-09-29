import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-bottom-floating-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 select-none max-w-[95vw]">
      <!-- 1. OBJECT EDITING BAR (When an object is selected) -->
      @if (store.selectedObject(); as obj) {
        <div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 text-xs backdrop-blur-md">
          <!-- Fill Color -->
          <div class="flex items-center gap-1.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <span class="text-neutral-500 font-medium text-[11px]">Fill</span>
            <input
              type="color"
              [value]="obj.style.fill || '#ffffff'"
              (input)="updateObjFill($event)"
              class="w-6 h-6 rounded cursor-pointer border border-neutral-300"
            />
          </div>

          <!-- Stroke Color -->
          <div class="flex items-center gap-1.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <span class="text-neutral-500 font-medium text-[11px]">Border</span>
            <input
              type="color"
              [value]="obj.style.stroke || '#000000'"
              (input)="updateObjStroke($event)"
              class="w-6 h-6 rounded cursor-pointer border border-neutral-300"
            />
          </div>

          <!-- Font Size (if has text or shape/sticky) -->
          @if (obj.content !== undefined || obj.type === 'sticky' || obj.type === 'text') {
            <div class="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-700">
              <button
                (click)="stepFontSize(-2)"
                title="Decrease Font Size"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <mat-icon class="text-sm">text_decrease</mat-icon>
              </button>
              <span class="font-mono text-xs w-6 text-center">{{ obj.style.fontSize || 14 }}</span>
              <button
                (click)="stepFontSize(2)"
                title="Increase Font Size"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <mat-icon class="text-sm">text_increase</mat-icon>
              </button>
            </div>
          }

          <!-- Layer Arrange -->
          <div class="flex items-center gap-0.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <button
              (click)="store.bringToFront(obj.id)"
              title="Bring to Front"
              class="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            >
              <mat-icon class="text-base">flip_to_front</mat-icon>
            </button>
            <button
              (click)="store.sendToBack(obj.id)"
              title="Send to Back"
              class="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            >
              <mat-icon class="text-base">flip_to_back</mat-icon>
            </button>
          </div>

          <!-- Actions: Duplicate, Lock, Delete -->
          <div class="flex items-center gap-0.5">
            <button
              (click)="store.duplicateSelectedObject()"
              title="Duplicate (Ctrl+D)"
              class="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            >
              <mat-icon class="text-base">content_copy</mat-icon>
            </button>
            <button
              (click)="store.toggleLockSelectedObject()"
              [title]="obj.locked ? 'Unlock Object' : 'Lock Object'"
              class="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
              [class.text-amber-600]="obj.locked"
              [class.text-neutral-600]="!obj.locked"
            >
              <mat-icon class="text-base">{{ obj.locked ? 'lock' : 'lock_open' }}</mat-icon>
            </button>
            <button
              (click)="store.deleteSelectedObject()"
              title="Delete (Delete / Backspace)"
              class="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 transition-colors"
            >
              <mat-icon class="text-base">delete</mat-icon>
            </button>
          </div>
        </div>
      }
      <!-- 2. DRAWING SETTINGS BAR (When a drawing tool is active) -->
      @else if (isDrawingMode()) {
        <div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-3 backdrop-blur-md">
          <!-- Color Swatches -->
          <div class="flex items-center gap-1.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            @for (c of palette; track c) {
              <button
                (click)="store.penColor.set(c)"
                class="w-6 h-6 rounded-full transition-transform hover:scale-110 cursor-pointer relative flex items-center justify-center border border-black/10"
                [style.background-color]="c"
                [class.ring-2]="store.penColor() === c"
                [class.ring-blue-500]="store.penColor() === c"
                [class.scale-110]="store.penColor() === c"
              >
                @if (store.penColor() === c) {
                  <mat-icon class="text-white text-xs scale-75">check</mat-icon>
                }
              </button>
            }

            <!-- Custom Color Picker -->
            <label title="Custom Color Picker" class="w-6 h-6 rounded-full border border-dashed border-neutral-400 hover:border-neutral-600 flex items-center justify-center cursor-pointer overflow-hidden relative">
              <mat-icon class="text-xs text-neutral-500">colorize</mat-icon>
              <input
                type="color"
                [value]="store.penColor()"
                (input)="onCustomColor($event)"
                class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          <!-- Stroke Width Slider (1px to 50px) -->
          <div class="flex items-center gap-2 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <span class="text-[11px] text-neutral-500 font-mono w-6 text-right">{{ store.strokeWidth() }}px</span>
            <input
              type="range"
              min="1"
              max="40"
              [value]="store.strokeWidth()"
              (input)="onWidthChange($event)"
              class="w-20 md:w-28 accent-blue-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
            />
          </div>

          <!-- Pressure Sensitivity Badge & Toggle -->
          <button
            (click)="togglePressure()"
            [title]="store.pressureSensitivity() ? 'Stylus Pressure ON (Note9 / Windows Pen)' : 'Fixed Width'"
            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            [class.bg-emerald-50]="store.pressureSensitivity()"
            [class.text-emerald-700]="store.pressureSensitivity()"
            [class.bg-neutral-100]="!store.pressureSensitivity()"
            [class.text-neutral-600]="!store.pressureSensitivity()"
          >
            <mat-icon class="text-sm">speed</mat-icon>
            <span class="hidden md:inline">{{ store.pressureSensitivity() ? 'Pressure' : 'Fixed' }}</span>
          </button>

          <!-- Handwriting Smoothing Toggle -->
          <button
            (click)="toggleSmoothing()"
            [title]="store.strokeSmoothing() ? 'Handwriting Smoothing ON' : 'Handwriting Smoothing OFF'"
            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            [class.bg-blue-50]="store.strokeSmoothing()"
            [class.text-blue-700]="store.strokeSmoothing()"
            [class.bg-neutral-100]="!store.strokeSmoothing()"
            [class.text-neutral-600]="!store.strokeSmoothing()"
          >
            <mat-icon class="text-sm">gesture</mat-icon>
            <span class="hidden md:inline">Smooth</span>
          </button>
        </div>
      }
      <!-- 3. DEFAULT CANVAS BACKGROUND & STATUS BAR -->
      @else {
        <div class="bg-white/90 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-lg px-3 py-1.5 flex items-center gap-3 backdrop-blur-md">
          <!-- Background Pattern -->
          <div class="flex items-center gap-1 text-xs">
            <span class="text-neutral-400 text-[11px] font-medium mr-1 hidden sm:inline">Grid:</span>
            <button
              (click)="store.setBackground('dots')"
              title="Dots Pattern"
              class="px-2 py-1 rounded-md text-xs font-medium transition-colors"
              [class.bg-neutral-100]="store.currentBoard().background === 'dots'"
              [class.dark:bg-neutral-700]="store.currentBoard().background === 'dots'"
              [class.text-blue-600]="store.currentBoard().background === 'dots'"
            >
              Dots
            </button>
            <button
              (click)="store.setBackground('grid')"
              title="Subtle Grid"
              class="px-2 py-1 rounded-md text-xs font-medium transition-colors"
              [class.bg-neutral-100]="store.currentBoard().background === 'grid'"
              [class.dark:bg-neutral-700]="store.currentBoard().background === 'grid'"
              [class.text-blue-600]="store.currentBoard().background === 'grid'"
            >
              Grid
            </button>
            <button
              (click)="store.setBackground('blank')"
              title="Blank Canvas"
              class="px-2 py-1 rounded-md text-xs font-medium transition-colors"
              [class.bg-neutral-100]="store.currentBoard().background === 'blank'"
              [class.dark:bg-neutral-700]="store.currentBoard().background === 'blank'"
              [class.text-blue-600]="store.currentBoard().background === 'blank'"
            >
              Blank
            </button>
          </div>

          <div class="h-3 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block"></div>

          <!-- Hardware Status Note -->
          <div class="hidden md:flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
            <mat-icon class="text-xs text-blue-500">touch_app</mat-icon>
            <span>Touchscreen &amp; Stylus Ready</span>
          </div>
        </div>
      }
    </div>
  `
})
export class BottomFloatingToolbar {
  readonly store = inject(WhiteboardStore);

  readonly palette = [
    '#0f172a', // Slate black
    '#dc2626', // Red
    '#ea580c', // Orange
    '#ca8a04', // Yellow
    '#16a34a', // Green
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#ec4899'  // Pink
  ];

  isDrawingMode(): boolean {
    const t = this.store.activeTool();
    return ['pen', 'pencil', 'highlighter', 'eraser', 'laser'].includes(t);
  }

  onCustomColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.penColor.set(input.value);
  }

  onWidthChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.strokeWidth.set(Number(input.value));
  }

  togglePressure(): void {
    this.store.pressureSensitivity.update((v) => !v);
  }

  toggleSmoothing(): void {
    this.store.strokeSmoothing.update((v) => !v);
  }

  updateObjFill(event: Event): void {
    const input = event.target as HTMLInputElement;
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fill: input.value }
    });
  }

  updateObjStroke(event: Event): void {
    const input = event.target as HTMLInputElement;
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.updateObject(obj.id, {
      style: { ...obj.style, stroke: input.value }
    });
  }

  stepFontSize(delta: number): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    const curr = obj.style.fontSize || 14;
    const next = Math.max(10, Math.min(48, curr + delta));
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fontSize: next }
    });
  }
}
