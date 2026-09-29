import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-share-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showShareModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <mat-icon class="text-blue-600 text-lg">share</mat-icon>
              Share Whiteboard
            </h3>
            <button
              (click)="store.showShareModal.set(false)"
              class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Share Link -->
            <div>
              <div class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Shareable Link
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  [value]="getShareLink()"
                  class="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 focus:outline-none"
                />
                <button
                  (click)="copyLink()"
                  class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <mat-icon class="text-sm">content_copy</mat-icon>
                  <span>{{ copyText() || 'Copy' }}</span>
                </button>
              </div>
            </div>

            <!-- Permission level -->
            <div>
              <label for="share-permission-select" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Link Access Permission
              </label>
              <select
                id="share-permission-select"
                [value]="selectedRole()"
                (change)="selectedRole.set($any($event.target).value)"
                class="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="editor">Anyone with link can edit</option>
                <option value="commenter">Anyone with link can comment</option>
                <option value="viewer">Anyone with link can view</option>
              </select>
            </div>

            <!-- Export Options (PDF, SVG, JSON) -->
            <div class="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Export Options
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button
                  (click)="exportJson()"
                  class="p-2 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-medium flex flex-col items-center gap-1 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <mat-icon class="text-base text-amber-500">data_object</mat-icon>
                  <span>JSON File</span>
                </button>
                <button
                  (click)="exportSvg()"
                  class="p-2 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-medium flex flex-col items-center gap-1 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <mat-icon class="text-base text-blue-500">brush</mat-icon>
                  <span>Vector SVG</span>
                </button>
                <button
                  (click)="exportPrint()"
                  class="p-2 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-medium flex flex-col items-center gap-1 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <mat-icon class="text-base text-rose-500">picture_as_pdf</mat-icon>
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ShareModal {
  readonly store = inject(WhiteboardStore);
  readonly selectedRole = signal<string>('editor');
  readonly copyText = signal<string>('');

  getShareLink(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/?board=${this.store.currentBoard().id}&role=${this.selectedRole()}`;
    }
    return 'https://flowboard.app';
  }

  copyLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.getShareLink());
      this.copyText.set('Copied!');
      setTimeout(() => this.copyText.set(''), 2000);
    }
  }

  exportJson(): void {
    const data = this.store.exportToJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.store.currentBoard().name}.flowboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportSvg(): void {
    const board = this.store.currentBoard();
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" style="background:#ffffff">`;
    // Add strokes
    for (const s of board.strokes) {
      if (s.points.length > 1) {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        svgContent += `<path d="${d}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" />`;
      }
    }
    // Add shapes
    for (const o of board.objects) {
      svgContent += `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" fill="${o.style.fill || '#f8fafc'}" stroke="${o.style.stroke || '#000000'}" rx="${o.style.borderRadius || 4}" />`;
      if (o.content) {
        svgContent += `<text x="${o.x + 10}" y="${o.y + 24}" font-family="sans-serif" font-size="${o.style.fontSize || 13}" fill="${o.style.textColor || '#000'}">${o.content.slice(0, 40)}</text>`;
      }
    }
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.store.currentBoard().name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPrint(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
