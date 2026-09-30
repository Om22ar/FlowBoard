import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CanvasObject } from '../models/whiteboard.models';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-bottom-floating-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 select-none max-w-[95vw]">
      
      <!-- 1. DRAWING PEN TRAY (When Pen / Draw tool is active) -->
      @if (store.showPenTray()) {
        <div class="bg-white/95 dark:bg-[#1a1b1e]/95 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.04)] px-3 py-1.5 flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 relative">
          
          <!-- Drawing Sub-tools: Pen, Highlighter, Eraser, Fine tip -->
          <div class="flex items-center gap-1 pr-2 border-r border-neutral-200 dark:border-neutral-800">
            <!-- Pen / Pencil -->
            <button
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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

          <!-- 12 Color Swatches -->
          <div class="flex items-center gap-1.5 px-1">
            @for (c of palette; track c) {
              <button
                type="button"
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
            <label [attr.aria-label]="'Custom Color Picker'" title="Custom Color Picker" class="w-5 h-5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 flex items-center justify-center cursor-pointer overflow-hidden relative ml-0.5">
              <mat-icon class="text-[11px] text-neutral-500">colorize</mat-icon>
              <input
                type="color"
                aria-label="Pen custom color"
                [value]="store.penColor()"
                (input)="onCustomColor($event)"
                class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          <!-- Line Style Dropdown -->
          <div class="relative pl-1 border-l border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
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
                  <svg class="w-4 h-3 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 9 C 7 3, 15 11, 21 3"/></svg>
                }
              }
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            @if (showLineStylePopup()) {
              <div class="absolute bottom-full mb-2 right-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
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

          <!-- Stroke Thickness Presets -->
          <div class="relative pl-1 border-l border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              (click)="toggleThicknessPopup()"
              (wheel)="onStrokeWheel($event)"
              title="Stroke Size"
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

            @if (showThicknessPopup()) {
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 flex items-center gap-2 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                @for (th of [2, 4, 8, 16]; track th) {
                  <button
                    type="button"
                    (click)="setThickness(th)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-neutral-100]="store.strokeWidth() === th"
                    [class.dark:bg-neutral-800]="store.strokeWidth() === th"
                  >
                    <div class="rounded-full bg-neutral-800 dark:bg-neutral-200" [style.width.px]="th" [style.height.px]="th"></div>
                  </button>
                }
                <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-700"></div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  aria-label="Stroke Width"
                  [value]="store.strokeWidth()"
                  (input)="onWidthChange($event)"
                  (wheel)="onStrokeWheel($event)"
                  class="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer appearance-none accent-blue-600"
                />
              </div>
            }
          </div>

          <!-- Pressure Sensitivity Button -->
          <div class="pl-1 border-l border-neutral-200 dark:border-neutral-800 flex items-center gap-1">
            <button
              type="button"
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
              type="button"
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

      <!-- 2. EXACT OBJECT FLOATING TOOLBAR MATCHING SCREENSHOT (Images 1 & 2) -->
      @else if (store.selectedObject(); as obj) {
        <div class="bg-white/95 dark:bg-[#1a1b1e]/95 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.04)] px-2.5 py-1.5 flex items-center gap-1 text-xs backdrop-blur-xl animate-in fade-in duration-150 relative">
          
          <!-- 1. [ Aa ⌄ ] Font Family Dropdown Trigger -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleFontFamilyPopup()"
              title="Font Style"
              class="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showFontFamilyPopup()"
              [class.dark:bg-neutral-800]="showFontFamilyPopup()"
            >
              <span class="font-serif italic font-bold text-sm tracking-tighter text-neutral-800 dark:text-neutral-100">Aa</span>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Font Family Popover -->
            @if (showFontFamilyPopup()) {
              <div class="absolute bottom-full mb-2 left-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 min-w-[130px]">
                <button
                  type="button"
                  (click)="setFontFamily(obj, 'handwritten')"
                  class="px-2 py-1 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 font-serif italic text-sm cursor-pointer"
                  [class.text-blue-600]="obj.style.fontFamily === 'handwritten'"
                >
                  Hand-drawn
                </button>
                <button
                  type="button"
                  (click)="setFontFamily(obj, 'sans')"
                  class="px-2 py-1 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 font-sans text-xs font-medium cursor-pointer"
                  [class.text-blue-600]="obj.style.fontFamily === 'sans' || !obj.style.fontFamily"
                >
                  Clean Sans
                </button>
                <button
                  type="button"
                  (click)="setFontFamily(obj, 'serif')"
                  class="px-2 py-1 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 font-serif text-xs cursor-pointer"
                  [class.text-blue-600]="obj.style.fontFamily === 'serif'"
                >
                  Editorial Serif
                </button>
                <button
                  type="button"
                  (click)="setFontFamily(obj, 'mono')"
                  class="px-2 py-1 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono text-xs cursor-pointer"
                  [class.text-blue-600]="obj.style.fontFamily === 'mono'"
                >
                  Monospace
                </button>
              </div>
            }
          </div>

          <!-- 2. [ Medium ⌄ ] Font Size Preset Dropdown Trigger -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleFontSizePopup()"
              (wheel)="onFontSizeWheel($event)"
              title="Font Size (Click for presets, or scroll mouse wheel)"
              class="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold cursor-pointer transition-colors text-xs"
              [class.bg-neutral-100]="showFontSizePopup()"
              [class.dark:bg-neutral-800]="showFontSizePopup()"
            >
              <span>{{ getFontSizeLabel(obj) }}</span>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Font Size Popover (Small / Medium / Large / XL + Slider) -->
            @if (showFontSizePopup()) {
              <div class="absolute bottom-full mb-2 left-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 backdrop-blur-xl animate-in fade-in duration-150 z-50 min-w-[150px]">
                <div class="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    (click)="setFontSizePreset(obj, 14)"
                    class="px-2 py-1 rounded-lg text-xs font-semibold text-center border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-blue-50]="(obj.style.fontSize || 14) <= 14"
                    [class.border-blue-500]="(obj.style.fontSize || 14) <= 14"
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    (click)="setFontSizePreset(obj, 18)"
                    class="px-2 py-1 rounded-lg text-xs font-semibold text-center border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-blue-50]="(obj.style.fontSize || 14) > 14 && (obj.style.fontSize || 14) <= 20"
                    [class.border-blue-500]="(obj.style.fontSize || 14) > 14 && (obj.style.fontSize || 14) <= 20"
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    (click)="setFontSizePreset(obj, 24)"
                    class="px-2 py-1 rounded-lg text-xs font-semibold text-center border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-blue-50]="(obj.style.fontSize || 14) > 20 && (obj.style.fontSize || 14) <= 30"
                    [class.border-blue-500]="(obj.style.fontSize || 14) > 20 && (obj.style.fontSize || 14) <= 30"
                  >
                    Large
                  </button>
                  <button
                    type="button"
                    (click)="setFontSizePreset(obj, 36)"
                    class="px-2 py-1 rounded-lg text-xs font-semibold text-center border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    [class.bg-blue-50]="(obj.style.fontSize || 14) > 30"
                    [class.border-blue-500]="(obj.style.fontSize || 14) > 30"
                  >
                    Extra Large
                  </button>
                </div>
                <div class="h-px bg-neutral-200 dark:bg-neutral-700 my-0.5"></div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono text-neutral-500 w-7">{{ obj.style.fontSize || 14 }}px</span>
                  <input
                    type="range"
                    min="10"
                    max="72"
                    aria-label="Font size slider"
                    [value]="obj.style.fontSize || 14"
                    (input)="onFontSizeSliderChange($event)"
                    (wheel)="onFontSizeWheel($event)"
                    class="w-24 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer appearance-none accent-blue-600"
                  />
                </div>
              </div>
            }
          </div>

          <!-- Vertical Divider (as in image) -->
          <div class="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5"></div>

          <!-- 3. [ T+ ] Add / Edit Text Label -->
          <button
            type="button"
            (click)="focusObjectText(obj)"
            title="Add / Edit Text Label"
            class="h-7 px-2 rounded-lg flex items-center gap-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold cursor-pointer transition-colors"
          >
            <span class="font-serif text-sm leading-none font-bold">T</span>
            <span class="text-[10px] font-bold text-neutral-500 leading-none -mt-1">+</span>
          </button>

          <!-- 4. [ ← ⌄ ] Start Endpoint Style Dropdown (None / Arrow / Circle / Diamond / Bar) -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleStartArrowPopup()"
              title="Start Arrowhead Style"
              class="h-7 px-1.5 rounded-lg flex items-center gap-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showStartArrowPopup()"
            >
              @if (obj.metadata?.arrowStart) {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="12 19 5 12 12 5"/>
                  <line x1="5" y1="12" x2="20" y2="12"/>
                </svg>
              } @else {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="4" y1="12" x2="20" y2="12"/>
                </svg>
              }
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Start Endpoint Popover -->
            @if (showStartArrowPopup()) {
              <div class="absolute bottom-full mb-2 left-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                <button
                  type="button"
                  (click)="setStartArrow(obj, false)"
                  title="None"
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  [class.bg-blue-100]="!obj.metadata?.arrowStart"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="12" x2="20" y2="12"/></svg>
                </button>
                <button
                  type="button"
                  (click)="setStartArrow(obj, true)"
                  title="Arrow"
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.arrowStart"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="12 19 5 12 12 5"/><line x1="5" y1="12" x2="20" y2="12"/></svg>
                </button>
              </div>
            }
          </div>

          <!-- 5. [ ʃ ⌄ ] Line Routing / Curve Style (Curved ʃ / Orthogonal ⌐ / Straight —) -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleRoutingPopup()"
              title="Line Routing Style (Curved / Orthogonal Step / Straight)"
              class="h-7 px-1.5 rounded-lg flex items-center gap-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showRoutingPopup()"
            >
              @if (obj.metadata?.connectorType === 'orthogonal') {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 18 L12 18 L12 6 L21 6"/>
                </svg>
              } @else if (obj.metadata?.connectorType === 'straight') {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="3" y1="12" x2="21" y2="12"/>
                </svg>
              } @else {
                <!-- Curved bezier line symbol (ʃ) -->
                <span class="font-serif italic font-bold text-sm leading-none px-0.5 text-neutral-800 dark:text-neutral-100">∫</span>
              }
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Routing Style Popover -->
            @if (showRoutingPopup()) {
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                <button
                  type="button"
                  (click)="setRouting(obj, 'orthogonal')"
                  title="Orthogonal Step (Image 2)"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.connectorType === 'orthogonal'"
                  [class.text-blue-700]="obj.metadata?.connectorType === 'orthogonal'"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 18 L12 18 L12 6 L21 6"/>
                  </svg>
                  <span>Step</span>
                </button>
                <button
                  type="button"
                  (click)="setRouting(obj, 'curved')"
                  title="Curved (ʃ)"
                  class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.connectorType === 'curved' || !obj.metadata?.connectorType"
                  [class.text-blue-700]="obj.metadata?.connectorType === 'curved' || !obj.metadata?.connectorType"
                >
                  <span class="font-serif italic font-bold text-sm">∫</span>
                  <span>Curve</span>
                </button>
                <button
                  type="button"
                  (click)="setRouting(obj, 'straight')"
                  title="Straight"
                  class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.connectorType === 'straight'"
                  [class.text-blue-700]="obj.metadata?.connectorType === 'straight'"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/></svg>
                  <span>Line</span>
                </button>
              </div>
            }
          </div>

          <!-- 6. [ → ⌄ ] End Endpoint Style Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleEndArrowPopup()"
              title="End Arrowhead Style"
              class="h-7 px-1.5 rounded-lg flex items-center gap-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showEndArrowPopup()"
            >
              @if (obj.metadata?.arrowEnd !== false) {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="12 5 19 12 12 19"/>
                  <line x1="19" y1="12" x2="4" y2="12"/>
                </svg>
              } @else {
                <svg class="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="4" y1="12" x2="20" y2="12"/>
                </svg>
              }
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- End Endpoint Popover -->
            @if (showEndArrowPopup()) {
              <div class="absolute bottom-full mb-2 left-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap">
                <button
                  type="button"
                  (click)="setEndArrow(obj, true)"
                  title="Arrow"
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.arrowEnd !== false"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="12 5 19 12 12 19"/><line x1="19" y1="12" x2="4" y2="12"/></svg>
                </button>
                <button
                  type="button"
                  (click)="setEndArrow(obj, false)"
                  title="None"
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  [class.bg-blue-100]="obj.metadata?.arrowEnd === false"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="12" x2="20" y2="12"/></svg>
                </button>
              </div>
            }
          </div>

          <!-- 7. [ ⬤ ⌄ ] Solid Color Swatch Circle with Chevron -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleColorPalettePopup()"
              title="Color Swatch & Palette"
              class="h-7 px-1.5 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showColorPalettePopup()"
            >
              <div
                class="w-4.5 h-4.5 rounded-full shadow-2xs border border-black/10 transition-transform"
                [style.background-color]="obj.style.stroke || obj.style.fill || '#2d3139'"
              ></div>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Color Palette Popover (12 Colors + Custom Picker) -->
            @if (showColorPalettePopup()) {
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-2 flex flex-col gap-2 backdrop-blur-xl animate-in fade-in duration-150 z-50">
                <div class="grid grid-cols-6 gap-1.5">
                  @for (c of palette; track c) {
                    <button
                      type="button"
                      (click)="setObjectColor(obj, c)"
                      [attr.aria-label]="'Set color ' + c"
                      class="w-6 h-6 rounded-full border border-black/10 shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                      [style.background-color]="c"
                      [class.ring-2]="obj.style.stroke === c || obj.style.fill === c"
                      [class.ring-blue-600]="obj.style.stroke === c || obj.style.fill === c"
                    ></button>
                  }
                </div>
                <div class="flex items-center gap-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <label [attr.aria-label]="'Custom color picker'" class="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer w-full text-xs font-semibold text-neutral-600 dark:text-neutral-300 relative overflow-hidden">
                    <mat-icon class="text-xs">colorize</mat-icon>
                    <span>Custom Color</span>
                    <input
                      type="color"
                      aria-label="Object Custom Color"
                      [value]="obj.style.stroke || obj.style.fill || '#2d3139'"
                      (input)="onObjectCustomColor(obj, $event)"
                      class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            }
          </div>

          <!-- 8. [ 🖊 ⌄ ] Stroke Style & Thickness Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleStrokePopup()"
              title="Stroke Style & Thickness"
              class="h-7 px-1.5 rounded-lg flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showStrokePopup()"
            >
              <svg class="w-4 h-4 text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M4 20 L20 4 M14 20 L20 14"/>
              </svg>
              <svg class="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Stroke Width & Style Popover -->
            @if (showStrokePopup()) {
              <div class="absolute bottom-full mb-2 right-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-2 flex flex-col gap-2 backdrop-blur-xl animate-in fade-in duration-150 z-50 whitespace-nowrap min-w-[160px]">
                <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stroke Width</div>
                <div class="grid grid-cols-4 gap-1">
                  @for (w of [1.5, 3, 6, 10]; track w) {
                    <button
                      type="button"
                      (click)="setObjectStrokeWidth(obj, w)"
                      class="py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
                      [class.bg-blue-50]="(obj.style.strokeWidth || 2) === w"
                      [class.border-blue-500]="(obj.style.strokeWidth || 2) === w"
                    >
                      <div class="bg-neutral-800 dark:bg-neutral-200 rounded-full" [style.height.px]="w" [style.width.px]="16"></div>
                    </button>
                  }
                </div>

                <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pt-1">Line Pattern</div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    (click)="setObjectStrokeStyle(obj, 'solid')"
                    class="py-1 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center cursor-pointer"
                    [class.bg-blue-50]="obj.style.strokeStyle === 'solid' || !obj.style.strokeStyle"
                    [class.border-blue-500]="obj.style.strokeStyle === 'solid' || !obj.style.strokeStyle"
                  >
                    Solid
                  </button>
                  <button
                    type="button"
                    (click)="setObjectStrokeStyle(obj, 'dashed')"
                    class="py-1 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center cursor-pointer"
                    [class.bg-blue-50]="obj.style.strokeStyle === 'dashed'"
                    [class.border-blue-500]="obj.style.strokeStyle === 'dashed'"
                  >
                    Dashed
                  </button>
                  <button
                    type="button"
                    (click)="setObjectStrokeStyle(obj, 'dotted')"
                    class="py-1 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center cursor-pointer"
                    [class.bg-blue-50]="obj.style.strokeStyle === 'dotted'"
                    [class.border-blue-500]="obj.style.strokeStyle === 'dotted'"
                  >
                    Dotted
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Vertical Divider -->
          <div class="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5"></div>

          <!-- 9. [ ⋮ ] More Options Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleMoreMenuPopup()"
              title="More Actions"
              class="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
              [class.bg-neutral-100]="showMoreMenuPopup()"
            >
              <mat-icon class="text-base">more_vert</mat-icon>
            </button>

            <!-- More Actions Popover -->
            @if (showMoreMenuPopup()) {
              <div class="absolute bottom-full mb-2 right-0 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 backdrop-blur-xl animate-in fade-in duration-150 z-50 min-w-[140px]">
                <button
                  type="button"
                  (click)="store.duplicateSelectedObject(); closePopups()"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer text-left"
                >
                  <mat-icon class="text-sm">content_copy</mat-icon>
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  (click)="store.toggleLockSelectedObject(); closePopups()"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer text-left"
                >
                  <mat-icon class="text-sm">{{ obj.locked ? 'lock' : 'lock_open' }}</mat-icon>
                  <span>{{ obj.locked ? 'Unlock' : 'Lock' }}</span>
                </button>
                <button
                  type="button"
                  (click)="store.bringToFront(obj.id); closePopups()"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer text-left"
                >
                  <mat-icon class="text-sm">flip_to_front</mat-icon>
                  <span>Bring to Front</span>
                </button>
                <button
                  type="button"
                  (click)="store.sendToBack(obj.id); closePopups()"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer text-left"
                >
                  <mat-icon class="text-sm">flip_to_back</mat-icon>
                  <span>Send to Back</span>
                </button>
                <div class="h-px bg-neutral-200 dark:bg-neutral-700 my-0.5"></div>
                <button
                  type="button"
                  (click)="store.deleteSelectedObject(); closePopups()"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 text-xs font-medium cursor-pointer text-left"
                >
                  <mat-icon class="text-sm">delete</mat-icon>
                  <span>Delete</span>
                </button>
              </div>
            }
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

  // Popup states for Exact UI replication
  readonly showFontFamilyPopup = signal<boolean>(false);
  readonly showFontSizePopup = signal<boolean>(false);
  readonly showStartArrowPopup = signal<boolean>(false);
  readonly showRoutingPopup = signal<boolean>(false);
  readonly showEndArrowPopup = signal<boolean>(false);
  readonly showColorPalettePopup = signal<boolean>(false);
  readonly showStrokePopup = signal<boolean>(false);
  readonly showMoreMenuPopup = signal<boolean>(false);

  // Pen tray popups
  readonly showLineStylePopup = signal<boolean>(false);
  readonly showThicknessPopup = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closePopups();
    }
  }

  closePopups(): void {
    this.showFontFamilyPopup.set(false);
    this.showFontSizePopup.set(false);
    this.showStartArrowPopup.set(false);
    this.showRoutingPopup.set(false);
    this.showEndArrowPopup.set(false);
    this.showColorPalettePopup.set(false);
    this.showStrokePopup.set(false);
    this.showMoreMenuPopup.set(false);
    this.showLineStylePopup.set(false);
    this.showThicknessPopup.set(false);
  }

  toggleFontFamilyPopup(): void {
    const current = this.showFontFamilyPopup();
    this.closePopups();
    this.showFontFamilyPopup.set(!current);
  }

  toggleFontSizePopup(): void {
    const current = this.showFontSizePopup();
    this.closePopups();
    this.showFontSizePopup.set(!current);
  }

  toggleStartArrowPopup(): void {
    const current = this.showStartArrowPopup();
    this.closePopups();
    this.showStartArrowPopup.set(!current);
  }

  toggleRoutingPopup(): void {
    const current = this.showRoutingPopup();
    this.closePopups();
    this.showRoutingPopup.set(!current);
  }

  toggleEndArrowPopup(): void {
    const current = this.showEndArrowPopup();
    this.closePopups();
    this.showEndArrowPopup.set(!current);
  }

  toggleColorPalettePopup(): void {
    const current = this.showColorPalettePopup();
    this.closePopups();
    this.showColorPalettePopup.set(!current);
  }

  toggleStrokePopup(): void {
    const current = this.showStrokePopup();
    this.closePopups();
    this.showStrokePopup.set(!current);
  }

  toggleMoreMenuPopup(): void {
    const current = this.showMoreMenuPopup();
    this.closePopups();
    this.showMoreMenuPopup.set(!current);
  }

  toggleLineStylePopup(): void {
    this.showLineStylePopup.update(v => !v);
    this.showThicknessPopup.set(false);
  }

  toggleThicknessPopup(): void {
    this.showThicknessPopup.update(v => !v);
    this.showLineStylePopup.set(false);
  }

  getFontSizeLabel(obj: CanvasObject): string {
    const size = obj.style.fontSize || 14;
    if (size <= 14) return 'Small';
    if (size <= 20) return 'Medium';
    if (size <= 30) return 'Large';
    return 'Extra Large';
  }

  setFontFamily(obj: CanvasObject, family: 'handwritten' | 'sans' | 'serif' | 'mono'): void {
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fontFamily: family }
    });
    this.showFontFamilyPopup.set(false);
  }

  setFontSizePreset(obj: CanvasObject, size: number): void {
    this.store.updateObject(obj.id, {
      style: { ...obj.style, fontSize: size }
    });
    this.showFontSizePopup.set(false);
  }

  setStartArrow(obj: CanvasObject, hasArrow: boolean): void {
    this.store.updateObject(obj.id, {
      metadata: { ...obj.metadata, arrowStart: hasArrow }
    });
    this.showStartArrowPopup.set(false);
  }

  setEndArrow(obj: CanvasObject, hasArrow: boolean): void {
    this.store.updateObject(obj.id, {
      metadata: { ...obj.metadata, arrowEnd: hasArrow }
    });
    this.showEndArrowPopup.set(false);
  }

  setRouting(obj: CanvasObject, routing: 'curved' | 'orthogonal' | 'straight'): void {
    this.store.updateObject(obj.id, {
      metadata: { ...obj.metadata, connectorType: routing }
    });
    this.showRoutingPopup.set(false);
    this.store.showToast(`Set line style to ${routing}`, 'info');
  }

  setObjectColor(obj: CanvasObject, color: string): void {
    this.store.updateObject(obj.id, {
      style: {
        ...obj.style,
        stroke: color,
        fill: obj.type === 'shape' || obj.type === 'sticky' ? color + '15' : obj.style.fill,
        textColor: color
      }
    });
    this.showColorPalettePopup.set(false);
  }

  onObjectCustomColor(obj: CanvasObject, e: Event): void {
    const input = e.target as HTMLInputElement;
    this.setObjectColor(obj, input.value);
  }

  setObjectStrokeWidth(obj: CanvasObject, width: number): void {
    this.store.updateObject(obj.id, {
      style: { ...obj.style, strokeWidth: width }
    });
    this.showStrokePopup.set(false);
  }

  setObjectStrokeStyle(obj: CanvasObject, style: 'solid' | 'dashed' | 'dotted'): void {
    this.store.updateObject(obj.id, {
      style: { ...obj.style, strokeStyle: style }
    });
    this.showStrokePopup.set(false);
  }

  focusObjectText(obj: CanvasObject): void {
    const current = obj.content || '';
    const newText = prompt('Enter or edit label text:', current);
    if (newText !== null) {
      this.store.updateObject(obj.id, { content: newText });
    }
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
}
