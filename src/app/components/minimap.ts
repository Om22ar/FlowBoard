import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-minimap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-6 right-6 z-20 select-none flex flex-col items-end gap-2">
      <!-- Mini-map toggle / expand button -->
      @if (!isExpanded()) {
        <button
          (click)="isExpanded.set(true)"
          title="Open Mini-map"
          class="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer"
        >
          <mat-icon class="text-base">map</mat-icon>
        </button>
      }

      @if (isExpanded()) {
        <div class="w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500">
            <span class="font-medium text-[11px]">Navigator</span>
            <div class="flex items-center gap-1">
              <button
                (click)="store.fitToScreen()"
                title="Fit to Content"
                class="hover:text-blue-600 p-0.5"
              >
                <mat-icon class="text-xs">crop_free</mat-icon>
              </button>
              <button
                (click)="isExpanded.set(false)"
                title="Minimize"
                class="hover:text-neutral-800 p-0.5"
              >
                <mat-icon class="text-xs">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Mini-map Canvas Preview Container -->
          <div
            tabindex="0"
            role="region"
            aria-label="Interactive mini-map canvas navigation"
            (click)="onMinimapClick($event)"
            (keydown.enter)="store.fitToScreen()"
            (keydown.space)="store.fitToScreen()"
            class="h-32 bg-neutral-100 dark:bg-neutral-900 relative cursor-crosshair overflow-hidden focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <!-- Render small dots for objects -->
            @for (obj of store.currentBoard().objects; track obj.id) {
              <div
                class="absolute rounded-xs opacity-75"
                [style.background-color]="obj.style.fill || '#94a3b8'"
                [style.left.px]="(obj.x - bounds().minX) * scale()"
                [style.top.px]="(obj.y - bounds().minY) * scale()"
                [style.width.px]="Math.max(2, obj.width * scale())"
                [style.height.px]="Math.max(2, obj.height * scale())"
              ></div>
            }

            <!-- Viewport Rectangle -->
            <div
              class="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded-xs transition-all"
              [style.left.px]="viewportBox().x"
              [style.top.px]="viewportBox().y"
              [style.width.px]="viewportBox().w"
              [style.height.px]="viewportBox().h"
            ></div>
          </div>

          <!-- Footer Zoom bar -->
          <div class="px-2 py-1 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
            <button (click)="store.zoomOut()" class="hover:text-blue-600 px-1 font-bold">-</button>
            <span>{{ Math.round(store.currentBoard().viewport.zoom * 100) }}%</span>
            <button (click)="store.zoomIn()" class="hover:text-blue-600 px-1 font-bold">+</button>
          </div>
        </div>
      }
    </div>
  `
})
export class Minimap {
  readonly store = inject(WhiteboardStore);
  readonly Math = Math;
  readonly isExpanded = signal<boolean>(true);

  // Computed content bounds
  readonly bounds = computed(() => {
    const objs = this.store.currentBoard().objects;
    let minX = 0;
    let minY = 0;
    let maxX = 1600;
    let maxY = 1000;

    for (const o of objs) {
      minX = Math.min(minX, o.x - 100);
      minY = Math.min(minY, o.y - 100);
      maxX = Math.max(maxX, o.x + o.width + 100);
      maxY = Math.max(maxY, o.y + o.height + 100);
    }
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  });

  readonly scale = computed(() => {
    const b = this.bounds();
    const mapW = 192; // 48 * 4
    const mapH = 128;
    return Math.min(mapW / b.width, mapH / b.height);
  });

  readonly viewportBox = computed(() => {
    const vp = this.store.currentBoard().viewport;
    const b = this.bounds();
    const s = this.scale();

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const visibleLeft = (-vp.x) / vp.zoom;
    const visibleTop = (-vp.y) / vp.zoom;
    const visibleW = screenW / vp.zoom;
    const visibleH = screenH / vp.zoom;

    return {
      x: Math.max(0, (visibleLeft - b.minX) * s),
      y: Math.max(0, (visibleTop - b.minY) * s),
      w: Math.min(192, Math.max(12, visibleW * s)),
      h: Math.min(128, Math.max(8, visibleH * s))
    };
  });

  onMinimapClick(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const b = this.bounds();
    const s = this.scale();

    const targetCanvasX = b.minX + clickX / s;
    const targetCanvasY = b.minY + clickY / s;

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const zoom = this.store.currentBoard().viewport.zoom;

    this.store.setViewport({
      x: screenW / 2 - targetCanvasX * zoom,
      y: screenH / 2 - targetCanvasY * zoom
    });
  }
}
