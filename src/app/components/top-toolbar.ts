import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { ExportService } from '../services/export.service';

@Component({
  selector: 'app-top-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <header class="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 flex items-center justify-between select-none z-30 shrink-0 relative">
      <!-- Zone 1: Workspace & Board Info -->
      <div class="flex items-center gap-2.5 min-w-0">
        <button
          (click)="store.viewMode.set('dashboard')"
          title="All Whiteboards"
          class="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-2 py-1.5 rounded-lg transition-colors text-neutral-800 dark:text-neutral-100 font-semibold tracking-tight cursor-pointer"
        >
          <div class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            F
          </div>
          <span class="text-sm font-semibold tracking-tight hidden sm:inline">FlowBoard</span>
        </button>

        <!-- File Menu Dropdown -->
        <div class="relative file-menu-container">
          <button
            (click)="toggleFileMenu($event)"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            [class.bg-neutral-100]="isFileMenuOpen()"
            [class.dark:bg-neutral-800]="isFileMenuOpen()"
          >
            <mat-icon class="text-sm text-neutral-500">menu</mat-icon>
            <span>File</span>
            <mat-icon class="text-xs text-neutral-400">arrow_drop_down</mat-icon>
          </button>

          @if (isFileMenuOpen()) {
            <div class="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Export Whiteboard
              </div>

              <!-- Export PNG -->
              <button
                (click)="exportPng()"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left w-full cursor-pointer group"
              >
                <div class="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <mat-icon class="text-base">image</mat-icon>
                </div>
                <div class="flex flex-col">
                  <span class="font-medium">Export as PNG</span>
                  <span class="text-[10px] text-neutral-400">High-resolution image (2x)</span>
                </div>
              </button>

              <!-- Export SVG -->
              <button
                (click)="exportSvg()"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left w-full cursor-pointer group"
              >
                <div class="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <mat-icon class="text-base">polyline</mat-icon>
                </div>
                <div class="flex flex-col">
                  <span class="font-medium">Export as SVG</span>
                  <span class="text-[10px] text-neutral-400">Infinite scalable vector</span>
                </div>
              </button>

              <!-- Export PDF -->
              <button
                (click)="exportPdf()"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left w-full cursor-pointer group"
              >
                <div class="w-7 h-7 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <mat-icon class="text-base">picture_as_pdf</mat-icon>
                </div>
                <div class="flex flex-col">
                  <span class="font-medium">Export as PDF</span>
                  <span class="text-[10px] text-neutral-400">Printable document format</span>
                </div>
              </button>

              <div class="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>

              <!-- Export JSON Backup -->
              <button
                (click)="exportJson()"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left w-full cursor-pointer group"
              >
                <div class="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <mat-icon class="text-base">data_object</mat-icon>
                </div>
                <div class="flex flex-col">
                  <span class="font-medium">Export as JSON</span>
                  <span class="text-[10px] text-neutral-400">Raw whiteboard backup</span>
                </div>
              </button>

              <!-- Import JSON -->
              <label class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-violet-50 dark:hover:bg-violet-950/50 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left w-full cursor-pointer group">
                <div class="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <mat-icon class="text-base">file_upload</mat-icon>
                </div>
                <div class="flex flex-col">
                  <span class="font-medium">Import JSON</span>
                  <span class="text-[10px] text-neutral-400">Restore from backup</span>
                </div>
                <input type="file" accept=".json" (change)="onImportJson($event)" class="hidden" />
              </label>

              <div class="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>

              <!-- New Board -->
              <button
                (click)="createNewBoard()"
                class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left w-full cursor-pointer"
              >
                <mat-icon class="text-base">add</mat-icon>
                <span>New Whiteboard</span>
              </button>
            </div>
          }
        </div>

        <span class="text-neutral-300 dark:text-neutral-700">/</span>

        <!-- Editable Board Name -->
        <div class="flex items-center gap-1.5 min-w-0">
          <mat-icon class="text-amber-500 text-base scale-90">folder</mat-icon>
          <input
            type="text"
            [value]="store.currentBoard().name"
            (blur)="onNameBlur($event)"
            (keydown.enter)="onNameEnter($event)"
            class="text-sm font-medium text-neutral-800 dark:text-neutral-200 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-800 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] md:max-w-[190px] truncate"
            title="Click to rename"
          />

          <!-- Star Favorite -->
          <button
            (click)="store.toggleFavorite(store.currentBoard().id)"
            [title]="store.currentBoard().isFavorite ? 'Unfavorite' : 'Favorite'"
            class="text-neutral-400 hover:text-amber-500 p-1 rounded-md transition-colors"
          >
            <mat-icon class="text-base" [class.text-amber-500]="store.currentBoard().isFavorite">
              {{ store.currentBoard().isFavorite ? 'star' : 'star_border' }}
            </mat-icon>
          </button>
        </div>
      </div>

      <!-- Zone 2: Canvas Navigation, Undo/Redo & Zoom -->
      <div class="flex items-center gap-1 sm:gap-2">
        <!-- History Controls -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            (click)="store.undo()"
            [disabled]="!store.canUndo()"
            title="Undo (Ctrl+Z)"
            class="p-1.5 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <mat-icon class="text-base">undo</mat-icon>
          </button>
          <button
            (click)="store.redo()"
            [disabled]="!store.canRedo()"
            title="Redo (Ctrl+Y)"
            class="p-1.5 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <mat-icon class="text-base">redo</mat-icon>
          </button>
        </div>

        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

        <!-- Zoom Controls -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            (click)="store.zoomOut()"
            title="Zoom Out"
            class="p-1.5 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
          >
            <mat-icon class="text-base">remove</mat-icon>
          </button>
          <button
            (click)="store.resetZoom()"
            title="Reset Zoom to 100%"
            class="px-2 text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 rounded py-1 transition-colors min-w-[50px] text-center"
          >
            {{ Math.round(store.currentBoard().viewport.zoom * 100) }}%
          </button>
          <button
            (click)="store.zoomIn()"
            title="Zoom In"
            class="p-1.5 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
          >
            <mat-icon class="text-base">add</mat-icon>
          </button>
        </div>

        <!-- Fit to Screen -->
        <button
          (click)="store.fitToScreen()"
          title="Fit All Content to Screen"
          class="p-1.5 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors hidden md:flex items-center gap-1 text-xs font-medium"
        >
          <mat-icon class="text-base">filter_center_focus</mat-icon>
        </button>
      </div>

      <!-- Zone 3: Companion, Presentation, Collab & Share -->
      <div class="flex items-center gap-2">
        <!-- Pen & Galaxy Hardware Connection Hub Quick Pill -->
        <button
          (click)="store.showCompanionModal.set(true)"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shadow-xs"
          [class.bg-emerald-50]="store.companionState().connected"
          [class.dark:bg-emerald-950/40]="store.companionState().connected"
          [class.border-emerald-300]="store.companionState().connected"
          [class.dark:border-emerald-800]="store.companionState().connected"
          [class.text-emerald-800]="store.companionState().connected"
          [class.dark:text-emerald-300]="store.companionState().connected"
          [class.bg-neutral-50]="!store.companionState().connected"
          [class.dark:bg-neutral-800]="!store.companionState().connected"
          [class.border-neutral-200]="!store.companionState().connected"
          [class.dark:border-neutral-700]="!store.companionState().connected"
          [class.text-neutral-700]="!store.companionState().connected"
          [class.dark:text-neutral-200]="!store.companionState().connected"
          title="Hardware Diagnostics & S Pen Companion Connection"
        >
          <span class="relative flex h-2 w-2">
            @if (store.companionState().connected) {
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            } @else {
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            }
          </span>

          <div class="flex items-center gap-1">
            <mat-icon class="text-sm scale-90">edit</mat-icon>
            @if (store.companionState().connected) {
              <span class="font-semibold">Note9 S Pen</span>
              <span class="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/60 px-1 py-0.5 rounded">
                {{ store.companionState().latencyMs }}ms
              </span>
            } @else {
              <span>Pen &amp; Remote Hub</span>
            }
          </div>

          <!-- Physical Stylus badge if detected on screen -->
          @if (store.hardwareStylus().detected) {
            <span class="hidden md:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono" title="Touchscreen Stylus Hardware Active">
              Stylus {{ Math.round(store.hardwareStylus().pressure * 100) }}%
            </span>
          }
        </button>

        <!-- Presentation Mode -->
        <button
          (click)="store.togglePresentationMode()"
          class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
          title="Start Presentation (Fullscreen slides)"
        >
          <mat-icon class="text-base text-violet-600">play_arrow</mat-icon>
          <span class="hidden sm:inline">Present</span>
        </button>

        <!-- Collaborators Stack -->
        <div class="hidden xl:flex items-center -space-x-1.5 pl-1">
          <div
            title="Omar (You - Owner)"
            class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-neutral-900 shadow-xs"
          >
            O
          </div>
          @if (store.isCollaborativeActive()) {
            <div
              title="Sophia R. (Designer)"
              class="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-neutral-900 shadow-xs"
            >
              S
            </div>
            <div
              title="Liam K. (Engineer)"
              class="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-neutral-900 shadow-xs"
            >
              L
            </div>
          }
        </div>

        <!-- Share Button -->
        <button
          (click)="store.showShareModal.set(true)"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
        >
          <mat-icon class="text-sm">share</mat-icon>
          <span>Share</span>
        </button>

        <!-- Shortcuts / Help -->
        <button
          (click)="store.showShortcutsModal.set(true)"
          title="Keyboard & Stylus Shortcuts"
          class="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <mat-icon class="text-base">keyboard</mat-icon>
        </button>
      </div>
    </header>
  `
})
export class TopToolbar {
  readonly store = inject(WhiteboardStore);
  private readonly exportService = inject(ExportService);
  readonly Math = Math;

  readonly isFileMenuOpen = signal<boolean>(false);

  toggleFileMenu(e: Event): void {
    e.stopPropagation();
    this.isFileMenuOpen.update((v) => !v);
  }

  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.file-menu-container')) {
      this.isFileMenuOpen.set(false);
    }
  }

  exportPng(): void {
    this.isFileMenuOpen.set(false);
    this.exportService.exportAsPng();
  }

  exportSvg(): void {
    this.isFileMenuOpen.set(false);
    this.exportService.exportAsSvg();
  }

  exportPdf(): void {
    this.isFileMenuOpen.set(false);
    this.exportService.exportAsPdf();
  }

  exportJson(): void {
    this.isFileMenuOpen.set(false);
    const data = this.store.exportToJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.store.currentBoard().name}.flowboard.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Exported whiteboard JSON backup', 'success');
  }

  onImportJson(event: Event): void {
    this.isFileMenuOpen.set(false);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const success = this.store.importFromJson(text);
        if (success) {
          this.store.showToast('Imported whiteboard backup successfully', 'success');
        } else {
          this.store.showToast('Invalid whiteboard JSON format', 'warning');
        }
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  createNewBoard(): void {
    this.isFileMenuOpen.set(false);
    this.store.createBoard('Untitled Whiteboard');
    this.store.showToast('Created new whiteboard', 'info');
  }

  onNameBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.trim()) {
      this.store.renameBoard(this.store.currentBoard().id, input.value.trim());
    }
  }

  onNameEnter(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }
}
