import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-presentation-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.isPresentationMode()) {
      <!-- Spotlight Screen Mask (when spotlight cursor is enabled) -->
      @if (store.spotlightActive()) {
        <div
          class="fixed inset-0 pointer-events-none z-30 transition-opacity"
          [style.background]="getSpotlightBackground()"
        ></div>
      }

      <!-- Top Exit & Timer Pill -->
      <div class="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 text-white rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-4 text-xs backdrop-blur-md border border-neutral-700">
        <!-- Presenter Timer -->
        <div class="flex items-center gap-1.5 font-mono">
          <mat-icon class="text-xs text-amber-400">timer</mat-icon>
          <span>{{ formattedTimer() }}</span>
          <button
            (click)="toggleTimer()"
            class="text-neutral-400 hover:text-white p-0.5"
            [title]="store.isPresenterTimerRunning() ? 'Pause Timer' : 'Resume Timer'"
          >
            <mat-icon class="text-xs">{{ store.isPresenterTimerRunning() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
        </div>

        <div class="h-3 w-px bg-neutral-700"></div>

        <!-- Current Frame Title -->
        <span class="font-medium text-neutral-200 max-w-xs truncate">
          {{ currentFrameTitle() }}
        </span>

        <div class="h-3 w-px bg-neutral-700"></div>

        <!-- Exit Presentation -->
        <button
          (click)="store.togglePresentationMode()"
          class="text-neutral-300 hover:text-rose-400 flex items-center gap-1 font-medium transition-colors"
        >
          <mat-icon class="text-xs">fullscreen_exit</mat-icon>
          <span>Exit</span>
        </button>
      </div>

      <!-- Bottom Floating Presenter Controls Dock -->
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-950/90 text-white border border-neutral-800 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 backdrop-blur-lg">
        <!-- Prev Frame -->
        <button
          (click)="store.prevFrame()"
          title="Previous Slide (← / S Pen Air Left)"
          class="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center justify-center"
        >
          <mat-icon class="text-base">arrow_back</mat-icon>
        </button>

        <!-- Frame Progress Indicator -->
        <div class="px-2 text-center">
          <div class="text-xs font-mono font-bold text-white">
            {{ store.frames().length > 0 ? store.currentFrameIndex() + 1 : 0 }} / {{ store.frames().length }}
          </div>
          <div class="text-[10px] text-neutral-400">Frames</div>
        </div>

        <!-- Next Frame -->
        <button
          (click)="store.nextFrame()"
          title="Next Slide (→ / S Pen Air Right)"
          class="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center justify-center"
        >
          <mat-icon class="text-base">arrow_forward</mat-icon>
        </button>

        <div class="h-6 w-px bg-neutral-800 mx-1"></div>

        <!-- Laser Pointer Toggle -->
        <button
          (click)="toggleLaser()"
          [title]="store.isLaserActive() ? 'Turn Off Laser' : 'Activate Laser Pointer'"
          class="p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          [class.bg-red-600]="store.isLaserActive()"
          [class.text-white]="store.isLaserActive()"
          [class.bg-neutral-800]="!store.isLaserActive()"
          [class.text-neutral-300]="!store.isLaserActive()"
        >
          <mat-icon class="text-base">highlight</mat-icon>
          <span class="hidden sm:inline">Laser</span>
        </button>

        <!-- Spotlight Cursor Toggle -->
        <button
          (click)="toggleSpotlight()"
          [title]="store.spotlightActive() ? 'Turn Off Spotlight' : 'Activate Spotlight'"
          class="p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          [class.bg-amber-600]="store.spotlightActive()"
          [class.text-white]="store.spotlightActive()"
          [class.bg-neutral-800]="!store.spotlightActive()"
          [class.text-neutral-300]="!store.spotlightActive()"
        >
          <mat-icon class="text-base">flare</mat-icon>
          <span class="hidden sm:inline">Spotlight</span>
        </button>
      </div>
    }
  `
})
export class PresentationOverlay {
  readonly store = inject(WhiteboardStore);

  toggleLaser(): void {
    this.store.isLaserActive.update((v) => !v);
  }

  toggleSpotlight(): void {
    this.store.spotlightActive.update((v) => !v);
  }

  readonly currentFrameTitle = computed(() => {
    const frames = this.store.frames();
    const idx = this.store.currentFrameIndex();
    if (frames.length === 0) return 'No Frames on Canvas';
    return frames[idx]?.metadata?.frameTitle || `Frame ${idx + 1}`;
  });

  readonly formattedTimer = computed(() => {
    const secs = this.store.presenterTimer();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  toggleTimer(): void {
    this.store.isPresenterTimerRunning.update((v) => !v);
  }

  getSpotlightBackground(): string {
    const pos = this.store.spotlightPos();
    return `radial-gradient(circle 140px at ${pos.x}px ${pos.y}px, transparent 0%, rgba(0, 0, 0, 0.75) 100%)`;
  }
}
