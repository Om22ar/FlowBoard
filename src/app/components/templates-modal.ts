import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { TEMPLATES, BoardTemplate } from '../data/templates';

@Component({
  selector: 'app-templates-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showTemplateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col my-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-indigo-600 text-xl">dashboard_customize</mat-icon>
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Whiteboard Templates Library
                </h3>
                <p class="text-xs text-neutral-500">
                  Kickstart mind maps, sprint boards, workflows, and goal strategy roadmaps
                </p>
              </div>
            </div>
            <button
              (click)="store.showTemplateModal.set(false)"
              class="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Templates Grid -->
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            @for (tmpl of templates; track tmpl.id) {
              <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 hover:shadow-md transition-all bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between group">
                <div>
                  <div class="flex items-center gap-2.5 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <mat-icon class="text-lg">{{ tmpl.icon }}</mat-icon>
                    </div>
                    <div>
                      <h4 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">
                        {{ tmpl.name }}
                      </h4>
                      <span class="text-[11px] text-neutral-400 font-medium">{{ tmpl.category }}</span>
                    </div>
                  </div>
                  <p class="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {{ tmpl.description }}
                  </p>
                </div>

                <div class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  <span class="text-[11px] text-neutral-500 font-mono">{{ tmpl.objects.length }} canvas elements</span>
                  <div class="flex gap-2">
                    <button
                      (click)="insertTemplate(tmpl)"
                      class="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Insert Template
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
            <button
              (click)="store.showTemplateModal.set(false)"
              class="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TemplatesModal {
  readonly store = inject(WhiteboardStore);
  readonly templates = TEMPLATES;

  insertTemplate(tmpl: BoardTemplate): void {
    // Clone template objects with offset to not overwrite current items directly
    const vp = this.store.currentBoard().viewport;
    const targetX = (-vp.x + 100) / vp.zoom;
    const targetY = (-vp.y + 100) / vp.zoom;

    const clonedObjects = tmpl.objects.map((obj) => ({
      ...JSON.parse(JSON.stringify(obj)),
      id: 'obj-' + Math.random().toString(36).substr(2, 9),
      x: obj.x + targetX,
      y: obj.y + targetY
    }));

    for (const obj of clonedObjects) {
      this.store.addObject(obj);
    }

    this.store.showTemplateModal.set(false);
  }
}
