import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-shortcuts-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showShortcutsModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <mat-icon class="text-blue-600 text-lg">keyboard</mat-icon>
              Hardware &amp; Keyboard Shortcuts
            </h3>
            <button
              (click)="store.showShortcutsModal.set(false)"
              class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs">
            <!-- Galaxy Note9 S Pen Actions -->
            <div>
              <h4 class="font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-1.5 text-blue-600">
                <mat-icon class="text-sm">smartphone</mat-icon>
                Samsung Galaxy Note9 S Pen Remote
              </h4>
              <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700">
                <div class="p-2.5 flex justify-between">
                  <span>Single Button Click</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Undo Action</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Double Button Click</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Toggle Pen / Eraser</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Long Button Press (0.6s)</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Laser Pointer Mode</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Air Gesture Left / Right</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Previous / Next Frame</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Air Gesture Up / Down</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Zoom In / Zoom Out</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Rapid Shake Gesture</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Clear Laser Marks</span>
                </div>
              </div>
            </div>

            <!-- Touchscreen & Stylus Gestures -->
            <div>
              <h4 class="font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-1.5 text-emerald-600">
                <mat-icon class="text-sm">touch_app</mat-icon>
                Windows 10 Touchscreen &amp; Pen Input
              </h4>
              <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700">
                <div class="p-2.5 flex justify-between">
                  <span>Windows Stylus Pen Contact</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Natural Drawing (Palm Rejection Active)</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Stylus Pressure (0% - 100%)</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Dynamic Line Thickness</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Two-Finger Drag</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Pan Canvas</span>
                </div>
                <div class="p-2.5 flex justify-between">
                  <span>Two-Finger Pinch</span>
                  <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">Smooth Zoom In / Out</span>
                </div>
              </div>
            </div>

            <!-- Standard Keyboard Keys -->
            <div>
              <h4 class="font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <mat-icon class="text-sm">keyboard</mat-icon>
                Standard Keyboard Shortcuts
              </h4>
              <div class="grid grid-cols-2 gap-2">
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Select Tool</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">V</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Hand / Pan</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">H / Space</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Pen Tool</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">P</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Eraser Tool</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">E</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Sticky Note</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">N / S</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Text Box</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">T</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Undo / Redo</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">Ctrl+Z / Y</kbd>
                </div>
                <div class="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                  <span>Duplicate</span>
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono font-bold">Ctrl+D</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ShortcutsModal {
  readonly store = inject(WhiteboardStore);
}
