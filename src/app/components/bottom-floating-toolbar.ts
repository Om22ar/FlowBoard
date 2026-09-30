import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-bottom-floating-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 select-none max-w-[95vw]">
      
      <!-- 1. DRAWING PEN TRAY (Exactly matching Image 1 & Image 2) -->
      @if (store.showPenTray()) {
        <div class="bg-white/95 dark:bg-[#1a1b1e]/95 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.04)] px-3 py-1.5 flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 relative">
          
          <!-- Drawing Sub-tools: Pen, Highlighter, Eraser, Fine tip -->
          <div class="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-800">
            <!-- Pen / Pencil -->
            <button
              (click)="store.activeTool.set('pen')"
              title="Pen / Pencil"
              class="h-8 px-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer transition-colors"
              [class.bg-neutral-100]="store.activeTool() === 'pen'"
              [class.dark:bg-neutral-800]="store.activeTool() === 'pen'"
              [class.hover:bg-neutral-50]="store.activeTool() !== 'pen'"
            >
              <div class="w-5 h-6 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M7 21 L12 6 L17 21 Z" fill="#f8f4eb" stroke="#d5c8b5" stroke-width="0.8"/>
                  <path d="M10 12 L12 6 L14 12 Z" fill="#2d3139"/>
                </svg>
              </div>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Highlighter -->
            <button
              (click)="store.activeTool.set('highlighter')"
              title="Highlighter"
              class="h-8 px-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer transition-colors"
              [class.bg-neutral-100]="store.activeTool() === 'highlighter'"
              [class.dark:bg-neutral-800]="store.activeTool() === 'highlighter'"
              [class.hover:bg-neutral-50]="store.activeTool() !== 'highlighter'"
            >
              <div class="w-5 h-6 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="8" y="10" width="8" height="11" rx="1" fill="#fef08a" stroke="#facc15" stroke-width="0.75"/>
                  <polygon points="9,10 15,10 13,4 11,4" fill="#eab308"/>
                </svg>
              </div>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Eraser -->
            <button
              (click)="store.activeTool.set('eraser')"
              title="Eraser"
              class="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              [class.bg-neutral-100]="store.activeTool() === 'eraser'"
              [class.dark:bg-neutral-800]="store.activeTool() === 'eraser'"
              [class.hover:bg-neutral-50]="store.activeTool() !== 'eraser'"
            >
              <div class="w-5 h-4 rounded-xs border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 shadow-2xs rotate-[-12deg] flex items-center justify-center">
                <div class="w-2.5 h-full bg-neutral-200 dark:bg-neutral-600 border-r border-neutral-300 dark:border-neutral-500"></div>
              </div>
            </button>

            <!-- Laser / Fine Pointer -->
            <button
              (click)="store.activeTool.set('laser')"
              title="Laser Pointer"
              class="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              [class.bg-neutral-100]="store.activeTool() === 'laser'"
              [class.dark:bg-neutral-800]="store.activeTool() === 'laser'"
              [class.hover:bg-neutral-50]="store.activeTool() !== 'laser'"
            >
              <div class="w-4 h-5 rounded-xs border border-neutral-400/80 bg-neutral-200 dark:bg-neutral-700 flex flex-col items-center justify-between p-0.5">
                <div class="w-1.5 h-1 bg-red-500 rounded-xs"></div>
                <div class="w-full h-1 bg-neutral-400 dark:bg-neutral-600"></div>
              </div>
            </button>
          </div>

          <!-- 12 Color Swatches (Exact replica of Image 1 & 2) -->
          <div class="flex items-center gap-1.5 px-1">
            @for (c of palette; track c) {
              <button
                (click)="store.penColor.set(c)"
                class="w-5 h-5 rounded-full transition-all cursor-pointer relative shrink-0"
                [style.background-color]="c"
                [class.ring-2]="store.penColor() === c"
                [class.ring-offset-2]="store.penColor() === c"
                [class.ring-neutral-800]="store.penColor() === c"
                [class.dark:ring-white]="store.penColor() === c"
                [class.scale-110]="store.penColor() === c"
                [attr.aria-label]="'Select color ' + c"
              ></button>
            }

            <!-- Custom Color Picker -->
            <label title="Custom Color Picker" class="w-5 h-5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 flex items-center justify-center cursor-pointer overflow-hidden relative ml-0.5">
              <mat-icon class="text-[11px] text-neutral-500">colorize</mat-icon>
              <input
                type="color"
                [value]="store.penColor()"
                (input)="onCustomColor($event)"
                class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          <!-- Line Style Dropdown & Floating Popup (Drawn / Dashed / Dotted / Solid) -->
          <div class="relative pl-1 border-l border-neutral-200 dark:border-neutral-800">
            <button
              (click)="toggleLineStylePopup()"
              title="Line Style"
              class="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showLineStylePopup()"
            >
              @switch (store.strokeLineStyle()) {
                @case ('dashed') {
                  <svg class="w-4 h-3 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 5"><line x1="2" y1="6" x2="22" y2="6"/></svg>
                }
                @case ('dotted') {
                  <svg class="w-4 h-3 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"><line x1="2" y1="6" x2="22" y2="6"/></svg>
                }
                @case ('solid') {
                  <svg class="w-4 h-3 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="2" y1="6" x2="22" y2="6"/></svg>
                }
                @default {
                  <!-- Drawn curve -->
                  <svg class="w-4 h-3 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 9 C 7 3, 15 11, 21 3"/></svg>
                }
              }
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Line Style Popup Pill (From Image 1: [ Drawn ] [ Dashed ] [ Dotted ] [ Solid ]) -->
            @if (showLineStylePopup()) {
              <div class="absolute bottom-full mb-2 right-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                <button
                  (click)="setLineStyle('drawn')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  [class.bg-neutral-100]="store.strokeLineStyle() === 'drawn'"
                  [class.dark:bg-neutral-800]="store.strokeLineStyle() === 'drawn'"
                  [class.text-neutral-900]="store.strokeLineStyle() === 'drawn'"
                  [class.dark:text-white]="store.strokeLineStyle() === 'drawn'"
                  [class.text-neutral-600]="store.strokeLineStyle() !== 'drawn'"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 18 C 7 6, 17 22, 21 6"/></svg>
                  <span>Drawn</span>
                </button>
                <button
                  (click)="setLineStyle('dashed')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  [class.bg-neutral-100]="store.strokeLineStyle() === 'dashed'"
                  [class.dark:bg-neutral-800]="store.strokeLineStyle() === 'dashed'"
                  [class.text-neutral-900]="store.strokeLineStyle() === 'dashed'"
                  [class.dark:text-white]="store.strokeLineStyle() === 'dashed'"
                  [class.text-neutral-600]="store.strokeLineStyle() !== 'dashed'"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 5"><line x1="2" y1="12" x2="22" y2="12"/></svg>
                  <span>Dashed</span>
                </button>
                <button
                  (click)="setLineStyle('dotted')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  [class.bg-neutral-100]="store.strokeLineStyle() === 'dotted'"
                  [class.dark:bg-neutral-800]="store.strokeLineStyle() === 'dotted'"
                  [class.text-neutral-900]="store.strokeLineStyle() === 'dotted'"
                  [class.dark:text-white]="store.strokeLineStyle() === 'dotted'"
                  [class.text-neutral-600]="store.strokeLineStyle() !== 'dotted'"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"><line x1="2" y1="12" x2="22" y2="12"/></svg>
                  <span>Dotted</span>
                </button>
                <button
                  (click)="setLineStyle('solid')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  [class.bg-neutral-100]="store.strokeLineStyle() === 'solid'"
                  [class.dark:bg-neutral-800]="store.strokeLineStyle() === 'solid'"
                  [class.text-neutral-900]="store.strokeLineStyle() === 'solid'"
                  [class.dark:text-white]="store.strokeLineStyle() === 'solid'"
                  [class.text-neutral-600]="store.strokeLineStyle() !== 'solid'"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="2" y1="12" x2="22" y2="12"/></svg>
                  <span>Solid</span>
                </button>
              </div>
            }
          </div>

          <!-- Stroke Thickness Presets (Image 2 Pill: [·] [•] [⬤] [⬤]) + Space-Saving Scroll -->
          <div class="relative pl-1 border-l border-neutral-200 dark:border-neutral-800">
            <button
              (click)="toggleThicknessPopup()"
              (wheel)="onStrokeWheel($event)"
              title="Stroke Size (Click for presets or scroll mouse wheel)"
              class="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
              [class.bg-neutral-100]="showThicknessPopup()"
            >
              <div
                class="rounded-full bg-neutral-800 dark:bg-neutral-200"
                [style.width.px]="Math.max(3, Math.min(10, store.strokeWidth()))"
                [style.height.px]="Math.max(3, Math.min(10, store.strokeWidth()))"
              ></div>
              <span class="font-mono text-[11px]">{{ store.strokeWidth() }}px</span>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Floating Thickness Presets Pill (From Image 2: [·] [•] [⬤] [⬤] + Scroll Slider) -->
            @if (showThicknessPopup()) {
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 flex items-center gap-2 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                @for (th of [2, 4, 8, 16]; track th) {
                  <button
                    (click)="setThickness(th)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-neutral-100]="store.strokeWidth() === th"
                    [class.dark:bg-neutral-800]="store.strokeWidth() === th"
                  >
                    <div class="rounded-full bg-neutral-800 dark:bg-neutral-200" [style.width.px]="th" [style.height.px]="th"></div>
                  </button>
                }
                <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-700"></div>
                <!-- Scroll wheel slider to save space -->
                <input
                  type="range"
                  min="1"
                  max="40"
                  [value]="store.strokeWidth()"
                  (input)="onWidthChange($event)"
                  (wheel)="onStrokeWheel($event)"
                  class="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer appearance-none accent-blue-600"
                />
              </div>
            }
          </div>

          <!-- Pressure Sensitivity Button ("keep pressure") -->
          <div class="pl-1 border-l border-neutral-200 dark:border-neutral-800 flex items-center gap-1">
            <button
              (click)="togglePressure()"
              title="Toggle Pen Pressure Sensitivity"
              class="h-7 px-2 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
              [class.bg-emerald-500]="store.pressureSensitivity()"
              [class.text-white]="store.pressureSensitivity()"
              [class.shadow-2xs]="store.pressureSensitivity()"
              [class.bg-neutral-100]="!store.pressureSensitivity()"
              [class.dark:bg-neutral-800]="!store.pressureSensitivity()"
              [class.text-neutral-500]="!store.pressureSensitivity()"
            >
              <mat-icon class="text-xs">speed</mat-icon>
              <span>Pressure</span>
            </button>

            <!-- Smoothing Button -->
            <button
              (click)="toggleSmoothing()"
              title="Toggle Stroke Smoothing"
              class="h-7 px-2 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
              [class.bg-blue-600]="store.strokeSmoothing()"
              [class.text-white]="store.strokeSmoothing()"
              [class.shadow-2xs]="store.strokeSmoothing()"
              [class.bg-neutral-100]="!store.strokeSmoothing()"
              [class.dark:bg-neutral-800]="!store.strokeSmoothing()"
              [class.text-neutral-500]="!store.strokeSmoothing()"
            >
              <mat-icon class="text-xs">gesture</mat-icon>
              <span class="hidden sm:inline">Smooth</span>
            </button>
          </div>

        </div>
      }

      <!-- 2. OBJECT EDITING BAR (When an object is selected) -->
      @else if (store.selectedObject(); as obj) {
        <div class="bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.04)] px-3 py-1.5 flex items-center gap-2 text-xs backdrop-blur-xl animate-in fade-in duration-150 relative">
          
          <!-- Fill Color (Selector 2 child 1) -->
          <div class="flex items-center gap-1.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <span class="text-neutral-500 font-medium text-[11px]">Fill</span>
            <input
              type="color"
              [value]="obj.style.fill || '#ffffff'"
              (input)="updateObjFill($event)"
              class="w-5 h-5 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600"
            />
          </div>

          <!-- Stroke Color (Selector 2 child 2) -->
          <div class="flex items-center gap-1.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <span class="text-neutral-500 font-medium text-[11px]">Border</span>
            <input
              type="color"
              [value]="obj.style.stroke || '#000000'"
              (input)="updateObjStroke($event)"
              class="w-5 h-5 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600"
            />
          </div>

          <!-- Space-saving Font Size Pop Up with Scroll Slider -->
          @if (obj.content !== undefined || obj.type === 'sticky' || obj.type === 'text') {
            <div class="relative flex items-center pr-2 border-r border-neutral-200 dark:border-neutral-700">
              <button
                (click)="toggleFontSizePopup()"
                (wheel)="onFontSizeWheel($event)"
                title="Text Size (Click for scroll slider, or scroll mouse wheel)"
                class="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
                [class.bg-neutral-100]="showFontSizePopup()"
                [class.dark:bg-neutral-800]="showFontSizePopup()"
              >
                <mat-icon class="text-sm text-neutral-500">format_size</mat-icon>
                <span class="font-mono text-xs">{{ obj.style.fontSize || 14 }}</span>
                <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              <!-- Floating Text Size Scroll/Slider Popup (Saves space for others) -->
              @if (showFontSizePopup()) {
                <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                  <span class="text-[11px] font-mono text-neutral-500 w-8 text-center">{{ obj.style.fontSize || 14 }}px</span>
                  <input
                    type="range"
                    min="10"
                    max="96"
                    [value]="obj.style.fontSize || 14"
                    (input)="onFontSizeSliderChange($event)"
                    (wheel)="onFontSizeWheel($event)"
                    class="w-32 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer appearance-none accent-blue-600"
                  />
                </div>
              }
            </div>
          }

          <!-- Layer Arrange -->
          <div class="flex items-center gap-0.5 pr-2 border-r border-neutral-200 dark:border-neutral-700">
            <button
              (click)="store.bringToFront(obj.id)"
              title="Bring to Front"
              class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            >
              <mat-icon class="text-sm">flip_to_front</mat-icon>
            </button>
            <button
              (click)="store.sendToBack(obj.id)"
              title="Send to Back"
              class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            >
              <mat-icon class="text-sm">flip_to_back</mat-icon>
            </button>
          </div>

          <!-- Actions: Duplicate, Lock, Delete -->
          <div class="flex items-center gap-0.5">
            <button
              (click)="store.duplicateSelectedObject()"
              title="Duplicate (Ctrl+D)"
              class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            >
              <mat-icon class="text-sm">content_copy</mat-icon>
            </button>
            <button
              (click)="store.toggleLockSelectedObject()"
              [title]="obj.locked ? 'Unlock Object' : 'Lock Object'"
              class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              [class.text-amber-600]="obj.locked"
              [class.text-neutral-600]="!obj.locked"
            >
              <mat-icon class="text-sm">{{ obj.locked ? 'lock' : 'lock_open' }}</mat-icon>
            </button>
            <button
              (click)="store.deleteSelectedObject()"
              title="Delete (Delete / Backspace)"
              class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm">delete</mat-icon>
            </button>
          </div>

        </div>
      }

    </div>
  `
})
export class BottomFloatingToolbar {
  readonly store = inject(WhiteboardStore);
  readonly Math = Math;

  // Exact 12-color palette from Image 1 & 2
  readonly palette = [
    '#ef4444', // Red
    '#ec4899', // Hot Pink / Magenta
    '#f97316', // Orange
    '#eab308', // Amber Yellow
    '#059669', // Deep Green
    '#86efac', // Mint Green
    '#2563eb', // Royal Blue
    '#93c5fd', // Sky Blue
    '#7c3aed', // Purple / Violet
    '#c4b5fd', // Lavender
    '#64748b', // Slate Gray
    '#1e293b'  // Dark Charcoal
  ];

  readonly showLineStylePopup = signal<boolean>(false);
  readonly showThicknessPopup = signal<boolean>(false);
  readonly showFontSizePopup = signal<boolean>(false);

  toggleLineStylePopup(): void {
    this.showLineStylePopup.update(v => !v);
    this.showThicknessPopup.set(false);
  }

  toggleThicknessPopup(): void {
    this.showThicknessPopup.update(v => !v);
    this.showLineStylePopup.set(false);
  }

  toggleFontSizePopup(): void {
    this.showFontSizePopup.update(v => !v);
  }

  setLineStyle(style: 'drawn' | 'dashed' | 'dotted' | 'solid'): void {
    this.store.strokeLineStyle.set(style);
    this.showLineStylePopup.set(false);
  }

  setThickness(px: number): void {
    this.store.strokeWidth.set(px);
    this.showThicknessPopup.set(false);
  }

  onStrokeWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1 : -1;
    const next = Math.max(1, Math.min(50, this.store.strokeWidth() + delta));
    this.store.strokeWidth.set(next);
  }

  onFontSizeWheel(event: WheelEvent): void {
    event.preventDefault();
    const obj = this.store.selectedObject();
    if (!obj) return;
    const delta = event.deltaY < 0 ? 2 : -2;
    const next = Math.max(8, Math.min(120, (obj.style.fontSize || 14) + delta));
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fontSize: next }
    });
  }

  onFontSizeSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fontSize: Number(input.value) }
    });
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
}
