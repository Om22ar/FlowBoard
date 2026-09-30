import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ShapeType, ToolType } from '../models/whiteboard.models';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-floating-tool-dock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
      <div class="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 backdrop-blur-xl transition-all hover:shadow-blue-500/10">
        
        <!-- Select Tool -->
        <button
          (click)="setTool('select')"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative"
          [class.bg-blue-600]="store.activeTool() === 'select'"
          [class.text-white]="store.activeTool() === 'select'"
          [class.text-neutral-500]="store.activeTool() !== 'select'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'select'"
          [class.dark:hover:bg-neutral-800]="store.activeTool() !== 'select'"
          title="Select (V)"
        >
          <mat-icon class="text-[22px]">near_me</mat-icon>
          <span class="absolute left-14 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Select (V)</span>
        </button>

        <!-- Pen Tool -->
        <button
          (click)="setTool('pen')"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative"
          [class.bg-blue-600]="store.activeTool() === 'pen'"
          [class.text-white]="store.activeTool() === 'pen'"
          [class.text-neutral-500]="store.activeTool() !== 'pen'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'pen'"
          [class.dark:hover:bg-neutral-800]="store.activeTool() !== 'pen'"
          title="Pen (P)"
        >
          <mat-icon class="text-[22px]">brush</mat-icon>
          <span class="absolute left-14 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Pen (P)</span>
        </button>

        <!-- Eraser Tool -->
        <button
          (click)="setTool('eraser')"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative"
          [class.bg-blue-600]="store.activeTool() === 'eraser'"
          [class.text-white]="store.activeTool() === 'eraser'"
          [class.text-neutral-500]="store.activeTool() !== 'eraser'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'eraser'"
          [class.dark:hover:bg-neutral-800]="store.activeTool() !== 'eraser'"
          title="Eraser (E)"
        >
          <mat-icon class="text-[22px]">auto_fix_normal</mat-icon>
          <span class="absolute left-14 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Eraser (E)</span>
        </button>

        <div class="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2"></div>

        <!-- Shape Tool -->
        <div class="relative group">
          <button
            (click)="toggleShapeMenu()"
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative"
            [class.bg-blue-600]="store.activeTool() === 'shape'"
            [class.text-white]="store.activeTool() === 'shape'"
            [class.text-neutral-500]="store.activeTool() !== 'shape'"
            [class.hover:bg-neutral-100]="store.activeTool() !== 'shape'"
            [class.dark:hover:bg-neutral-800]="store.activeTool() !== 'shape'"
            title="Shapes (S)"
          >
            <mat-icon class="text-[22px]">
              @switch (store.selectedShapeType()) {
                @case ('circle') { radio_button_unchecked }
                @case ('triangle') { change_history }
                @default { crop_din }
              }
            </mat-icon>
            <span class="absolute left-14 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Shapes (S)</span>
          </button>

          <!-- Shape Selection Submenu -->
          @if (showShapeMenu()) {
            <div class="absolute left-14 top-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-2 flex flex-col gap-2 backdrop-blur-xl animate-in fade-in slide-in-from-left-2 duration-200">
              <button (click)="selectShape('rectangle')" class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <mat-icon>crop_din</mat-icon>
              </button>
              <button (click)="selectShape('circle')" class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <mat-icon>radio_button_unchecked</mat-icon>
              </button>
              <button (click)="selectShape('triangle')" class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <mat-icon>change_history</mat-icon>
              </button>
            </div>
          }
        </div>

        <div class="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2"></div>

        <!-- Hand Tool -->
        <button
          (click)="setTool('hand')"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative"
          [class.bg-blue-600]="store.activeTool() === 'hand'"
          [class.text-white]="store.activeTool() === 'hand'"
          [class.text-neutral-500]="store.activeTool() !== 'hand'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'hand'"
          [class.dark:hover:bg-neutral-800]="store.activeTool() !== 'hand'"
          title="Hand (H)"
        >
          <mat-icon class="text-[22px]">pan_tool</mat-icon>
          <span class="absolute left-14 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Pan (H)</span>
        </button>
      </div>

      <!-- Undo/Redo Floating Group -->
      <div class="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-1 flex flex-col gap-1 backdrop-blur-xl">
        <button
          (click)="store.undo()"
          [disabled]="!store.canUndo()"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
        >
          <mat-icon>undo</mat-icon>
        </button>
        <button
          (click)="store.redo()"
          [disabled]="!store.canRedo()"
          class="w-11 h-11 rounded-xl flex items-center justify-center transition-all text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
        >
          <mat-icon>redo</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class FloatingToolDock {
  readonly store = inject(WhiteboardStore);
  readonly showShapeMenu = signal<boolean>(false);

  setTool(tool: ToolType): void {
    this.store.activeTool.set(tool);
    this.showShapeMenu.set(false);
  }

  toggleShapeMenu(): void {
    if (this.store.activeTool() !== 'shape') {
      this.store.activeTool.set('shape');
      this.showShapeMenu.set(true);
    } else {
      this.showShapeMenu.update(v => !v);
    }
  }

  selectShape(type: ShapeType): void {
    this.store.selectedShapeType.set(type);
    this.store.activeTool.set('shape');
    this.showShapeMenu.set(false);
  }
}
