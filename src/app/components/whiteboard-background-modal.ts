import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import {
  DEFAULT_BACKGROUND_CONFIG,
  WhiteboardBackgroundConfig,
  WhiteboardBackgroundPattern
} from '../models/whiteboard.models';

interface BackgroundPreset {
  id: string;
  name: string;
  theme: 'light' | 'dark';
  icon: string;
  description: string;
  config: WhiteboardBackgroundConfig;
}

@Component({
  selector: 'app-whiteboard-background-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showBackgroundModal()) {
      <!-- Backdrop overlay -->
      <button
        type="button"
        aria-label="Close background settings"
        (click)="close()"
        class="fixed inset-0 z-45 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] transition-opacity cursor-default border-none w-full h-full"
      ></button>

      <!-- Background Settings Modal Dialog -->
      <div
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] max-w-[580px] bg-white dark:bg-[#1a1b1e] border border-neutral-200/90 dark:border-neutral-800 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-2xl flex flex-col max-h-[85vh] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Modal Header -->
        <div class="px-6 pt-5 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <mat-icon class="text-lg">wallpaper</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                Whiteboard Background
              </h2>
              <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                Customize canvas pattern, paper texture, custom image &amp; theme presets
              </p>
            </div>
          </div>

          <button
            type="button"
            (click)="close()"
            title="Close (Esc)"
            class="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>

        <!-- Navigation Tabs: Patterns | Custom Image | Presets -->
        <div class="px-6 pt-2 pb-1 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            (click)="activeTab.set('patterns')"
            class="pb-2.5 transition-colors relative cursor-pointer"
            [class.text-blue-600]="activeTab() === 'patterns'"
            [class.dark:text-blue-400]="activeTab() === 'patterns'"
            [class.text-neutral-400]="activeTab() !== 'patterns'"
            [class.hover:text-neutral-700]="activeTab() !== 'patterns'"
          >
            <span>Patterns &amp; Paper</span>
            @if (activeTab() === 'patterns') {
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            }
          </button>

          <button
            type="button"
            (click)="activeTab.set('image')"
            class="pb-2.5 transition-colors relative cursor-pointer flex items-center gap-1"
            [class.text-blue-600]="activeTab() === 'image'"
            [class.dark:text-blue-400]="activeTab() === 'image'"
            [class.text-neutral-400]="activeTab() !== 'image'"
            [class.hover:text-neutral-700]="activeTab() !== 'image'"
          >
            <span>Custom Image</span>
            @if (cfg().imageUrl) {
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            }
            @if (activeTab() === 'image') {
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            }
          </button>

          <button
            type="button"
            (click)="activeTab.set('presets')"
            class="pb-2.5 transition-colors relative cursor-pointer"
            [class.text-blue-600]="activeTab() === 'presets'"
            [class.dark:text-blue-400]="activeTab() === 'presets'"
            [class.text-neutral-400]="activeTab() !== 'presets'"
            [class.hover:text-neutral-700]="activeTab() !== 'presets'"
          >
            <span>Presets (Light &amp; Dark)</span>
            @if (activeTab() === 'presets') {
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            }
          </button>
        </div>

        <!-- Modal Content Body -->
        <div class="p-6 flex-1 overflow-y-auto space-y-5">
          <!-- ==================== TAB 1: PATTERNS & CANVAS CONTROLS ==================== -->
          @if (activeTab() === 'patterns') {
            <!-- 1. Pattern Type Selector Grid -->
            <div>
              <div class="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2.5">
                Pattern Style
              </div>

              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                @for (p of patternOptions; track p.id) {
                  <button
                    type="button"
                    (click)="setPattern(p.id)"
                    class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer group text-center"
                    [class.border-blue-600]="cfg().pattern === p.id"
                    [class.bg-blue-50/50]="cfg().pattern === p.id"
                    [class.dark:border-blue-500]="cfg().pattern === p.id"
                    [class.dark:bg-blue-950/40]="cfg().pattern === p.id"
                    [class.border-neutral-200]="cfg().pattern !== p.id"
                    [class.dark:border-neutral-800]="cfg().pattern !== p.id"
                    [class.hover:bg-neutral-50]="cfg().pattern !== p.id"
                    [class.dark:hover:bg-neutral-800/60]="cfg().pattern !== p.id"
                  >
                    <!-- Visual Icon Preview -->
                    <div
                      class="w-9 h-9 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105"
                      [style.background-color]="cfg().color"
                      [style.border-color]="cfg().pattern === p.id ? '#3b82f6' : '#e2e8f0'"
                    >
                      <mat-icon
                        class="text-base"
                        [style.color]="cfg().pattern === p.id ? '#2563eb' : '#64748b'"
                      >
                        {{ p.icon }}
                      </mat-icon>
                    </div>
                    <span class="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">
                      {{ p.label }}
                    </span>
                  </button>
                }
              </div>
            </div>

            <!-- 2. Background Color Picker & Swatches -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Canvas Background Color
                </div>
                <span class="font-mono text-[11px] text-neutral-400">{{ cfg().color }}</span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                @for (c of bgColors; track c) {
                  <button
                    type="button"
                    (click)="setColor(c)"
                    [attr.aria-label]="'Select background color ' + c"
                    class="w-7 h-7 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-2xs transition-all cursor-pointer relative"
                    [style.background-color]="c"
                    [class.ring-2]="cfg().color === c"
                    [class.ring-blue-600]="cfg().color === c"
                    [class.ring-offset-2]="cfg().color === c"
                    [class.scale-110]="cfg().color === c"
                  ></button>
                }

                <!-- Custom Color Input -->
                <label [attr.aria-label]="'Custom Color'" class="h-7 px-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer overflow-hidden relative text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  <mat-icon class="text-xs">colorize</mat-icon>
                  <span>Custom</span>
                  <input
                    type="color"
                    aria-label="Custom Canvas Color"
                    [value]="cfg().color"
                    (input)="onBgColorChange($event)"
                    class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>

            <!-- 3. Pattern / Grid Color Picker -->
            @if (cfg().pattern !== 'plain' && cfg().pattern !== 'image') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Grid &amp; Line Color
                  </div>
                  <span class="font-mono text-[11px] text-neutral-400">{{ cfg().patternColor }}</span>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  @for (pc of patternColors; track pc) {
                    <button
                      type="button"
                      (click)="setPatternColor(pc)"
                      [attr.aria-label]="'Select pattern color ' + pc"
                      class="w-6 h-6 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs transition-all cursor-pointer"
                      [style.background-color]="pc"
                      [class.ring-2]="cfg().patternColor === pc"
                      [class.ring-blue-600]="cfg().patternColor === pc"
                      [class.scale-110]="cfg().patternColor === pc"
                    ></button>
                  }

                  <label [attr.aria-label]="'Pick pattern color'" class="h-6 px-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer overflow-hidden relative text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    <mat-icon class="text-[10px]">colorize</mat-icon>
                    <span>Pick</span>
                    <input
                      type="color"
                      aria-label="Custom Pattern Color"
                      [value]="cfg().patternColor"
                      (input)="onPatternColorChange($event)"
                      class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            }

            <!-- 4. Fine-Tuning Sliders: Grid Size, Line Thickness, Opacity, Spacing -->
            @if (cfg().pattern !== 'plain' && cfg().pattern !== 'image') {
              <div class="space-y-3.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Dimensions &amp; Spacing Controls
                </div>

                <!-- Grid / Dot Size -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-600 dark:text-neutral-300">Grid / Dot Size</span>
                    <span class="font-mono text-neutral-500 font-semibold">{{ cfg().gridSize }}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="80"
                    step="2"
                    aria-label="Grid Size"
                    [value]="cfg().gridSize"
                    (input)="onGridSizeChange($event)"
                    class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                  />
                </div>

                <!-- Line / Dot Thickness -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-600 dark:text-neutral-300">Line / Dot Thickness</span>
                    <span class="font-mono text-neutral-500 font-semibold">{{ cfg().lineThickness }}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    aria-label="Line Thickness"
                    [value]="cfg().lineThickness"
                    (input)="onThicknessChange($event)"
                    class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                  />
                </div>

                <!-- Pattern Opacity -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-600 dark:text-neutral-300">Pattern Opacity</span>
                    <span class="font-mono text-neutral-500 font-semibold">{{ Math.round(cfg().opacity * 100) }}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    aria-label="Pattern Opacity"
                    [value]="cfg().opacity"
                    (input)="onOpacityChange($event)"
                    class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                  />
                </div>

                <!-- Row Spacing (for Lined & Graph Paper) -->
                @if (cfg().pattern === 'lined' || cfg().pattern === 'graph') {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-neutral-600 dark:text-neutral-300">Row / Major Interval Spacing</span>
                      <span class="font-mono text-neutral-500 font-semibold">{{ cfg().spacing }}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="72"
                      step="4"
                      aria-label="Row Spacing"
                      [value]="cfg().spacing"
                      (input)="onSpacingChange($event)"
                      class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                    />
                  </div>
                }
              </div>
            }
          }

          <!-- ==================== TAB 2: CUSTOM IMAGE BACKGROUND ==================== -->
          @if (activeTab() === 'image') {
            <!-- Upload Dropzone or URL -->
            <div class="space-y-3.5">
              <!-- Upload Box -->
              <div
                role="button"
                tabindex="0"
                (click)="fileInput.click()"
                (keydown.enter)="fileInput.click()"
                (keydown.space)="fileInput.click()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class.border-blue-500]="isDraggingFile()"
                [class.bg-blue-50/50]="isDraggingFile()"
                [class.dark:bg-blue-950/30]="isDraggingFile()"
                [class.border-neutral-300]="!isDraggingFile()"
                [class.dark:border-neutral-700]="!isDraggingFile()"
                [class.hover:border-blue-400]="!isDraggingFile()"
              >
                <input
                  #fileInput
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  (change)="onFileSelected($event)"
                  class="hidden"
                />

                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <mat-icon class="text-xl">cloud_upload</mat-icon>
                </div>

                <div>
                  <p class="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Click to upload background image or drag &amp; drop
                  </p>
                  <p class="text-[10px] text-neutral-400">
                    Supports PNG, JPG, WebP, SVG (Floor plans, Wireframe grids, Reference mockups)
                  </p>
                </div>
              </div>

              <!-- Paste Image URL -->
              <div class="flex items-center gap-2">
                <input
                  type="url"
                  #urlInput
                  placeholder="Or paste image URL (https://...)"
                  class="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  (click)="applyImageUrl(urlInput.value)"
                  class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>

              <!-- Curated Background Image Textures -->
              <div>
                <div class="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                  Preset Textures
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  @for (tex of texturePresets; track tex.name) {
                    <button
                      type="button"
                      (click)="applyPresetTexture(tex.url, tex.name)"
                      class="group relative h-16 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden cursor-pointer text-left hover:scale-[1.02] transition-transform"
                    >
                      <img
                        [src]="tex.url"
                        [alt]="tex.name"
                        class="w-full h-full object-cover"
                        referrerpolicy="no-referrer"
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-1.5 flex items-end">
                        <span class="text-[10px] font-bold text-white line-clamp-1">{{ tex.name }}</span>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Image Configuration Controls (if Image is set) -->
              @if (cfg().imageUrl) {
                <div class="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      Background Image Controls
                    </span>
                    <button
                      type="button"
                      (click)="removeImage()"
                      class="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer"
                    >
                      <mat-icon class="text-xs">delete</mat-icon>
                      <span>Remove image</span>
                    </button>
                  </div>

                  <!-- Fit Mode: Cover, Contain, Tile, Custom -->
                  <div class="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      (click)="setImageFit('cover')"
                      class="py-1.5 rounded-lg border text-center transition-colors cursor-pointer"
                      [class.bg-blue-600]="cfg().imageFit === 'cover'"
                      [class.text-white]="cfg().imageFit === 'cover'"
                      [class.border-blue-600]="cfg().imageFit === 'cover'"
                      [class.border-neutral-200]="cfg().imageFit !== 'cover'"
                      [class.dark:border-neutral-700]="cfg().imageFit !== 'cover'"
                    >
                      Cover
                    </button>
                    <button
                      type="button"
                      (click)="setImageFit('contain')"
                      class="py-1.5 rounded-lg border text-center transition-colors cursor-pointer"
                      [class.bg-blue-600]="cfg().imageFit === 'contain'"
                      [class.text-white]="cfg().imageFit === 'contain'"
                      [class.border-blue-600]="cfg().imageFit === 'contain'"
                      [class.border-neutral-200]="cfg().imageFit !== 'contain'"
                      [class.dark:border-neutral-700]="cfg().imageFit !== 'contain'"
                    >
                      Contain
                    </button>
                    <button
                      type="button"
                      (click)="setImageFit('tile')"
                      class="py-1.5 rounded-lg border text-center transition-colors cursor-pointer"
                      [class.bg-blue-600]="cfg().imageFit === 'tile'"
                      [class.text-white]="cfg().imageFit === 'tile'"
                      [class.border-blue-600]="cfg().imageFit === 'tile'"
                      [class.border-neutral-200]="cfg().imageFit !== 'tile'"
                      [class.dark:border-neutral-700]="cfg().imageFit !== 'tile'"
                    >
                      Tile / Repeat
                    </button>
                    <button
                      type="button"
                      (click)="setImageFit('custom')"
                      class="py-1.5 rounded-lg border text-center transition-colors cursor-pointer"
                      [class.bg-blue-600]="cfg().imageFit === 'custom'"
                      [class.text-white]="cfg().imageFit === 'custom'"
                      [class.border-blue-600]="cfg().imageFit === 'custom'"
                      [class.border-neutral-200]="cfg().imageFit !== 'custom'"
                      [class.dark:border-neutral-700]="cfg().imageFit !== 'custom'"
                    >
                      Canvas Place
                    </button>
                  </div>

                  <!-- Image Scale Slider -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-neutral-600 dark:text-neutral-300">Scale</span>
                      <span class="font-mono text-neutral-500 font-semibold">{{ Math.round((cfg().imageScale || 1) * 100) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      aria-label="Image Scale"
                      [value]="cfg().imageScale || 1"
                      (input)="onImageScaleChange($event)"
                      class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <!-- Image Opacity Slider -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-neutral-600 dark:text-neutral-300">Image Opacity</span>
                      <span class="font-mono text-neutral-500 font-semibold">{{ Math.round((cfg().imageOpacity || 0.9) * 100) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      aria-label="Image Opacity"
                      [value]="cfg().imageOpacity || 0.9"
                      (input)="onImageOpacityChange($event)"
                      class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <!-- Lock Background Image Toggle -->
                  <div class="pt-2 flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-base text-neutral-500">{{ cfg().isLocked ? 'lock' : 'lock_open' }}</mat-icon>
                      <div>
                        <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Lock Background Layer
                        </div>
                        <div class="text-[10px] text-neutral-400">
                          Prevents background from being accidentally selected or moved
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle lock background"
                      (click)="toggleImageLock()"
                      class="w-8 h-4.5 rounded-full p-0.5 transition-colors relative cursor-pointer"
                      [class.bg-blue-600]="cfg().isLocked"
                      [class.bg-neutral-300]="!cfg().isLocked"
                      [class.dark:bg-neutral-700]="!cfg().isLocked"
                    >
                      <div
                        class="w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform"
                        [class.translate-x-3.5]="cfg().isLocked"
                        [class.translate-x-0]="!cfg().isLocked"
                      ></div>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ==================== TAB 3: LIGHT & DARK MODE PRESETS ==================== -->
          @if (activeTab() === 'presets') {
            <div class="space-y-4">
              <!-- Light Presets -->
              <div>
                <div class="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2.5">
                  <mat-icon class="text-amber-500 text-sm">wb_sunny</mat-icon>
                  <span>Light Mode Presets</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (preset of lightPresets; track preset.id) {
                    <button
                      type="button"
                      (click)="applyPreset(preset)"
                      class="p-3 rounded-2xl border text-left flex items-start gap-3 transition-all hover:scale-[1.01] cursor-pointer group"
                      [class.border-blue-600]="isCurrentPreset(preset.config)"
                      [class.bg-blue-50/40]="isCurrentPreset(preset.config)"
                      [class.dark:bg-blue-950/30]="isCurrentPreset(preset.config)"
                      [class.border-neutral-200]="!isCurrentPreset(preset.config)"
                      [class.dark:border-neutral-800]="!isCurrentPreset(preset.config)"
                      [class.hover:bg-neutral-50]="!isCurrentPreset(preset.config)"
                      [class.dark:hover:bg-neutral-800/60]="!isCurrentPreset(preset.config)"
                    >
                      <!-- Mini Preview Box -->
                      <div
                        class="w-10 h-10 rounded-xl border border-neutral-300 shadow-2xs flex items-center justify-center shrink-0"
                        [style.background-color]="preset.config.color"
                      >
                        <mat-icon class="text-neutral-500 text-base">{{ preset.icon }}</mat-icon>
                      </div>

                      <div class="min-w-0">
                        <div class="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                          <span>{{ preset.name }}</span>
                          @if (isCurrentPreset(preset.config)) {
                            <mat-icon class="text-xs text-blue-600">check_circle</mat-icon>
                          }
                        </div>
                        <div class="text-[11px] text-neutral-400 line-clamp-1">
                          {{ preset.description }}
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Dark Presets -->
              <div>
                <div class="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2.5">
                  <mat-icon class="text-indigo-400 text-sm">nights_stay</mat-icon>
                  <span>Dark Mode Presets</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (preset of darkPresets; track preset.id) {
                    <button
                      type="button"
                      (click)="applyPreset(preset)"
                      class="p-3 rounded-2xl border text-left flex items-start gap-3 transition-all hover:scale-[1.01] cursor-pointer group"
                      [class.border-blue-600]="isCurrentPreset(preset.config)"
                      [class.bg-blue-50/40]="isCurrentPreset(preset.config)"
                      [class.dark:bg-blue-950/30]="isCurrentPreset(preset.config)"
                      [class.border-neutral-200]="!isCurrentPreset(preset.config)"
                      [class.dark:border-neutral-800]="!isCurrentPreset(preset.config)"
                      [class.hover:bg-neutral-50]="!isCurrentPreset(preset.config)"
                      [class.dark:hover:bg-neutral-800/60]="!isCurrentPreset(preset.config)"
                    >
                      <!-- Mini Preview Box -->
                      <div
                        class="w-10 h-10 rounded-xl border border-neutral-700 shadow-2xs flex items-center justify-center shrink-0"
                        [style.background-color]="preset.config.color"
                      >
                        <mat-icon class="text-neutral-400 text-base">{{ preset.icon }}</mat-icon>
                      </div>

                      <div class="min-w-0">
                        <div class="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                          <span>{{ preset.name }}</span>
                          @if (isCurrentPreset(preset.config)) {
                            <mat-icon class="text-xs text-blue-600">check_circle</mat-icon>
                          }
                        </div>
                        <div class="text-[11px] text-neutral-400 line-clamp-1">
                          {{ preset.description }}
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Modal Footer Actions -->
        <div class="px-6 py-3.5 bg-neutral-50/90 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
          <button
            type="button"
            (click)="resetDefaults()"
            class="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
          >
            <mat-icon class="text-xs">restart_alt</mat-icon>
            <span>Reset to default</span>
          </button>

          <button
            type="button"
            (click)="close()"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    }
  `
})
export class WhiteboardBackgroundModal {
  readonly store = inject(WhiteboardStore);
  readonly Math = Math;

  readonly activeTab = signal<'patterns' | 'image' | 'presets'>('patterns');
  readonly isDraggingFile = signal<boolean>(false);

  // Active Background Config from store
  readonly cfg = computed(() => this.store.activeBackgroundConfig());

  readonly patternOptions: { id: WhiteboardBackgroundPattern; label: string; icon: string }[] = [
    { id: 'plain', label: 'Plain', icon: 'crop_free' },
    { id: 'dots', label: 'Dotted Grid', icon: 'more_horiz' },
    { id: 'grid', label: 'Grid Paper', icon: 'grid_4x4' },
    { id: 'lined', label: 'Lined Paper', icon: 'format_align_justify' },
    { id: 'graph', label: 'Graph Paper', icon: 'grid_on' },
    { id: 'image', label: 'Image', icon: 'image' }
  ];

  readonly bgColors = [
    '#ffffff', // Pure White
    '#fdfbf7', // Warm Linen
    '#fef9c3', // Pale Yellow Post-it
    '#f1f5f9', // Cool Slate
    '#ecfdf5', // Soft Mint
    '#f5f3ff', // Soft Lavender
    '#1e293b', // Charcoal Slate
    '#0f172a', // Navy Blueprint
    '#121212', // Dark Charcoal
    '#000000'  // OLED Black
  ];

  readonly patternColors = [
    '#cbd5e1', // Slate Light
    '#94a3b8', // Slate Medium
    '#64748b', // Slate Dark
    '#93c5fd', // Soft Blue
    '#d97706', // Warm Amber
    '#334155', // Dark Mode Grid
    '#1e293b', // Deep Dark Grid
    '#475569'  // Charcoal Dot
  ];

  readonly texturePresets = [
    {
      name: 'Blueprint Grid',
      url: 'https://picsum.photos/seed/blueprintgrid/1600/1200'
    },
    {
      name: 'Vintage Parchment',
      url: 'https://picsum.photos/seed/parchmentpaper/1600/1200'
    },
    {
      name: 'Cork Texture',
      url: 'https://picsum.photos/seed/corktexture/1600/1200'
    },
    {
      name: 'Carbon Fiber',
      url: 'https://picsum.photos/seed/carbonpattern/1600/1200'
    }
  ];

  readonly lightPresets: BackgroundPreset[] = [
    {
      id: 'light-dots',
      name: 'Dot Matrix White',
      theme: 'light',
      icon: 'more_horiz',
      description: 'Clean white background with 24px subtle slate dots',
      config: {
        pattern: 'dots',
        color: '#ffffff',
        patternColor: '#cbd5e1',
        gridSize: 24,
        lineThickness: 1,
        opacity: 0.8,
        spacing: 32,
        isLocked: true
      }
    },
    {
      id: 'light-grid',
      name: 'Technical Drafting Grid',
      theme: 'light',
      icon: 'grid_4x4',
      description: 'Square 32px grid lines on crisp white paper',
      config: {
        pattern: 'grid',
        color: '#ffffff',
        patternColor: '#e2e8f0',
        gridSize: 32,
        lineThickness: 1,
        opacity: 0.85,
        spacing: 32,
        isLocked: true
      }
    },
    {
      id: 'light-lined',
      name: 'College Ruled Paper',
      theme: 'light',
      icon: 'format_align_justify',
      description: 'Warm cream lined notebook paper with blue ruling',
      config: {
        pattern: 'lined',
        color: '#fffef2',
        patternColor: '#93c5fd',
        gridSize: 24,
        lineThickness: 1,
        opacity: 0.9,
        spacing: 32,
        isLocked: true
      }
    },
    {
      id: 'light-graph',
      name: 'Engineering Graph Paper',
      theme: 'light',
      icon: 'grid_on',
      description: 'Fine 20px graph paper with dual coordinate markers',
      config: {
        pattern: 'graph',
        color: '#ffffff',
        patternColor: '#94a3b8',
        gridSize: 20,
        lineThickness: 1,
        opacity: 0.75,
        spacing: 40,
        isLocked: true
      }
    }
  ];

  readonly darkPresets: BackgroundPreset[] = [
    {
      id: 'dark-dots',
      name: 'Deep Space OLED',
      theme: 'dark',
      icon: 'more_horiz',
      description: 'Pure black OLED canvas with subtle dark slate dots',
      config: {
        pattern: 'dots',
        color: '#000000',
        patternColor: '#334155',
        gridSize: 24,
        lineThickness: 1,
        opacity: 0.8,
        spacing: 32,
        isLocked: true
      }
    },
    {
      id: 'dark-grid',
      name: 'Charcoal Stealth Grid',
      theme: 'dark',
      icon: 'grid_4x4',
      description: 'Modern 32px dark charcoal grid lines',
      config: {
        pattern: 'grid',
        color: '#121212',
        patternColor: '#262626',
        gridSize: 32,
        lineThickness: 1,
        opacity: 0.85,
        spacing: 32,
        isLocked: true
      }
    },
    {
      id: 'dark-navy',
      name: 'Blueprint Matrix Navy',
      theme: 'dark',
      icon: 'grid_on',
      description: 'Deep midnight blue engineering grid',
      config: {
        pattern: 'graph',
        color: '#0a101f',
        patternColor: '#1e3a8a',
        gridSize: 24,
        lineThickness: 1,
        opacity: 0.8,
        spacing: 48,
        isLocked: true
      }
    },
    {
      id: 'dark-lined',
      name: 'Midnight Ruled Pad',
      theme: 'dark',
      icon: 'format_align_justify',
      description: 'Dark obsidian paper with subtle horizontal ruling',
      config: {
        pattern: 'lined',
        color: '#18181b',
        patternColor: '#3f3f46',
        gridSize: 24,
        lineThickness: 1,
        opacity: 0.8,
        spacing: 32,
        isLocked: true
      }
    }
  ];

  @HostListener('window:keydown.escape')
  onEsc(): void {
    if (this.store.showBackgroundModal()) {
      this.close();
    }
  }

  close(): void {
    this.store.showBackgroundModal.set(false);
  }

  setPattern(pattern: WhiteboardBackgroundPattern): void {
    this.store.updateBackgroundConfig({ pattern });
  }

  setColor(color: string): void {
    this.store.updateBackgroundConfig({ color });
  }

  setPatternColor(patternColor: string): void {
    this.store.updateBackgroundConfig({ patternColor });
  }

  onBgColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setColor(input.value);
  }

  onPatternColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setPatternColor(input.value);
  }

  onGridSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ gridSize: Number(input.value) });
  }

  onThicknessChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ lineThickness: Number(input.value) });
  }

  onOpacityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ opacity: Number(input.value) });
  }

  onSpacingChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ spacing: Number(input.value) });
  }

  setImageFit(fit: 'cover' | 'contain' | 'tile' | 'custom'): void {
    this.store.updateBackgroundConfig({ imageFit: fit, pattern: 'image' });
  }

  onImageScaleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ imageScale: Number(input.value) });
  }

  onImageOpacityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateBackgroundConfig({ imageOpacity: Number(input.value) });
  }

  toggleImageLock(): void {
    const current = this.cfg().isLocked;
    this.store.updateBackgroundConfig({ isLocked: !current });
    this.store.showToast(current ? 'Background image unlocked' : 'Background image locked', 'info');
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingFile.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingFile.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingFile.set(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.readFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0]);
    }
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.store.setBackgroundImage(dataUrl, { isLocked: true });
    };
    reader.readAsDataURL(file);
  }

  applyImageUrl(url: string): void {
    if (!url.trim()) return;
    this.store.setBackgroundImage(url.trim(), { isLocked: true });
  }

  applyPresetTexture(url: string, name: string): void {
    this.store.setBackgroundImage(url, { isLocked: true });
    this.store.showToast(`Applied ${name} texture`, 'success');
  }

  applyPreset(preset: BackgroundPreset): void {
    this.store.applyBackgroundPreset(preset.config);
  }

  isCurrentPreset(config: WhiteboardBackgroundConfig): boolean {
    const current = this.cfg();
    return current.pattern === config.pattern && current.color === config.color;
  }

  removeImage(): void {
    this.store.updateBackgroundConfig({
      imageUrl: '',
      pattern: 'dots'
    });
    this.store.showToast('Removed background image', 'info');
  }

  resetDefaults(): void {
    this.store.updateBackgroundConfig(DEFAULT_BACKGROUND_CONFIG);
    this.store.showToast('Reset background to default dots', 'info');
  }
}

