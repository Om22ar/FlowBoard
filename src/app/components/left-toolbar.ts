import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ShapeType, ToolType } from '../models/whiteboard.models';
import { WhiteboardStore } from '../services/whiteboard-store';

@Component({
  selector: 'app-left-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <aside class="w-14 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-2.5 gap-1.5 z-20 shrink-0 select-none shadow-xs relative">
      <!-- Select Tool (V) -->
      <button
        (click)="setTool('select')"
        title="Select & Move (V)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'select'"
        [class.text-blue-600]="store.activeTool() === 'select'"
        [class.dark:bg-blue-950]="store.activeTool() === 'select'"
        [class.dark:text-blue-400]="store.activeTool() === 'select'"
        [class.text-neutral-600]="store.activeTool() !== 'select'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'select'"
        [class.dark:text-neutral-400]="store.activeTool() !== 'select'"
      >
        <mat-icon class="text-xl">near_me</mat-icon>
      </button>

      <!-- Hand / Pan Tool (H) -->
      <button
        (click)="setTool('hand')"
        title="Pan Canvas (H / Spacebar)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'hand'"
        [class.text-blue-600]="store.activeTool() === 'hand'"
        [class.text-neutral-600]="store.activeTool() !== 'hand'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'hand'"
      >
        <mat-icon class="text-xl">pan_tool</mat-icon>
      </button>

      <div class="w-8 h-px bg-neutral-200 dark:bg-neutral-800 my-0.5"></div>

      <!-- Pen / Drawing Hub (P) with quick popup -->
      <div class="relative">
        <button
          (click)="toggleDrawMenu()"
          title="Freehand Drawing (P)"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-blue-50]="isDrawingTool(store.activeTool())"
          [class.text-blue-600]="isDrawingTool(store.activeTool())"
          [class.text-neutral-600]="!isDrawingTool(store.activeTool())"
          [class.hover:bg-neutral-100]="!isDrawingTool(store.activeTool())"
        >
          <mat-icon class="text-xl">
            @switch (store.activeTool()) {
              @case ('pencil') { edit }
              @case ('highlighter') { format_paint }
              @case ('eraser') { auto_fix_normal }
              @case ('laser') { highlight }
              @default { brush }
            }
          </mat-icon>
          <span class="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full" [style.background-color]="store.penColor()"></span>
        </button>

        <!-- Sub-menu popup for drawing tools -->
        @if (showDrawMenu()) {
          <div class="absolute left-12 top-0 ml-2 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-1.5 z-50 flex flex-col gap-1">
            <button
              (click)="selectDrawTool('pen')"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-full text-left"
              [class.bg-blue-50]="store.activeTool() === 'pen'"
            >
              <mat-icon class="text-base text-blue-600">brush</mat-icon>
              <span>Pen (Pressure Sensitive)</span>
            </button>
            <button
              (click)="selectDrawTool('pencil')"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-full text-left"
              [class.bg-blue-50]="store.activeTool() === 'pencil'"
            >
              <mat-icon class="text-base text-slate-600">edit</mat-icon>
              <span>Pencil (Fine lines)</span>
            </button>
            <button
              (click)="selectDrawTool('highlighter')"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-full text-left"
              [class.bg-blue-50]="store.activeTool() === 'highlighter'"
            >
              <mat-icon class="text-base text-amber-500">format_paint</mat-icon>
              <span>Highlighter (Alpha)</span>
            </button>
            <button
              (click)="selectDrawTool('eraser')"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-full text-left"
              [class.bg-blue-50]="store.activeTool() === 'eraser'"
            >
              <mat-icon class="text-base text-rose-500">auto_fix_normal</mat-icon>
              <span>Eraser Tool (E)</span>
            </button>
            <button
              (click)="selectDrawTool('laser')"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-full text-left"
              [class.bg-blue-50]="store.activeTool() === 'laser'"
            >
              <mat-icon class="text-base text-red-500">highlight</mat-icon>
              <span>Laser Pointer (L)</span>
            </button>
          </div>
        }
      </div>

      <!-- Sticky Note (N) -->
      <button
        (click)="setTool('sticky')"
        title="Add Sticky Note (N)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-amber-100]="store.activeTool() === 'sticky'"
        [class.text-amber-700]="store.activeTool() === 'sticky'"
        [class.text-neutral-600]="store.activeTool() !== 'sticky'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'sticky'"
      >
        <mat-icon class="text-xl">note</mat-icon>
      </button>

      <!-- Text (T) -->
      <button
        (click)="setTool('text')"
        title="Add Text (T)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'text'"
        [class.text-blue-600]="store.activeTool() === 'text'"
        [class.text-neutral-600]="store.activeTool() !== 'text'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'text'"
      >
        <mat-icon class="text-xl">title</mat-icon>
      </button>

      <!-- Shapes (R) with menu -->
      <div class="relative">
        <button
          (click)="toggleShapeMenu()"
          title="Add Shape (R)"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          [class.bg-blue-50]="store.activeTool() === 'shape'"
          [class.text-blue-600]="store.activeTool() === 'shape'"
          [class.text-neutral-600]="store.activeTool() !== 'shape'"
          [class.hover:bg-neutral-100]="store.activeTool() !== 'shape'"
        >
          <mat-icon class="text-xl">
            @switch (store.selectedShapeType()) {
              @case ('circle') { radio_button_unchecked }
              @case ('diamond') { change_history }
              @case ('cloud') { cloud }
              @case ('star') { grade }
              @case ('cylinder') { storage }
              @default { crop_din }
            }
          </mat-icon>
        </button>

        @if (showShapeMenu()) {
          <div class="absolute left-12 top-0 ml-2 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-2 z-50 grid grid-cols-4 gap-1">
            <button
              (click)="pickShape('rectangle')"
              title="Rectangle"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>crop_square</mat-icon>
            </button>
            <button
              (click)="pickShape('rounded-rect')"
              title="Rounded Rectangle"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>crop_din</mat-icon>
            </button>
            <button
              (click)="pickShape('circle')"
              title="Circle / Ellipse"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>radio_button_unchecked</mat-icon>
            </button>
            <button
              (click)="pickShape('diamond')"
              title="Diamond / Decision"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>diamond</mat-icon>
            </button>
            <button
              (click)="pickShape('triangle')"
              title="Triangle"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>change_history</mat-icon>
            </button>
            <button
              (click)="pickShape('star')"
              title="Star"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>grade</mat-icon>
            </button>
            <button
              (click)="pickShape('cloud')"
              title="Cloud"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>cloud_queue</mat-icon>
            </button>
            <button
              (click)="pickShape('cylinder')"
              title="Cylinder / Database"
              class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <mat-icon>storage</mat-icon>
            </button>
          </div>
        }
      </div>

      <!-- Connector / Arrow (A) -->
      <button
        (click)="setTool('connector')"
        title="Smart Connector Line (A)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'connector'"
        [class.text-blue-600]="store.activeTool() === 'connector'"
        [class.text-neutral-600]="store.activeTool() !== 'connector'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'connector'"
      >
        <mat-icon class="text-xl">trending_flat</mat-icon>
      </button>

      <!-- Mind Map Node (M) -->
      <button
        (click)="setTool('mindmap')"
        title="Add Mind Map Node (M)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'mindmap'"
        [class.text-blue-600]="store.activeTool() === 'mindmap'"
        [class.text-neutral-600]="store.activeTool() !== 'mindmap'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'mindmap'"
      >
        <mat-icon class="text-xl">hub</mat-icon>
      </button>

      <!-- Task Card / Checklist -->
      <button
        (click)="setTool('task')"
        title="Add Task / Checklist Card"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'task'"
        [class.text-blue-600]="store.activeTool() === 'task'"
        [class.text-neutral-600]="store.activeTool() !== 'task'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'task'"
      >
        <mat-icon class="text-xl">check_box</mat-icon>
      </button>

      <!-- Frame / Slide container (F) -->
      <button
        (click)="setTool('frame')"
        title="Presentation Frame (F)"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'frame'"
        [class.text-blue-600]="store.activeTool() === 'frame'"
        [class.text-neutral-600]="store.activeTool() !== 'frame'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'frame'"
      >
        <mat-icon class="text-xl">aspect_ratio</mat-icon>
      </button>

      <!-- Table -->
      <button
        (click)="setTool('table')"
        title="Add Data Table"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'table'"
        [class.text-blue-600]="store.activeTool() === 'table'"
        [class.text-neutral-600]="store.activeTool() !== 'table'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'table'"
      >
        <mat-icon class="text-xl">table_chart</mat-icon>
      </button>

      <!-- Code Block -->
      <button
        (click)="setTool('code')"
        title="Add Code Snippet"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
        [class.bg-blue-50]="store.activeTool() === 'code'"
        [class.text-blue-600]="store.activeTool() === 'code'"
        [class.text-neutral-600]="store.activeTool() !== 'code'"
        [class.hover:bg-neutral-100]="store.activeTool() !== 'code'"
      >
        <mat-icon class="text-xl">code</mat-icon>
      </button>

      <div class="mt-auto flex flex-col items-center gap-1.5">
        <!-- Laptop TouchPad / Finger Drawing Mode Toggle -->
        <button
          (click)="toggleTouchpadDrawing()"
          title="Laptop TouchPad & Finger Direct Drawing Mode"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative"
          [class.bg-emerald-50]="store.touchpadDrawingMode() || store.showTouchpadOverlay()"
          [class.text-emerald-600]="store.touchpadDrawingMode() || store.showTouchpadOverlay()"
          [class.dark:bg-emerald-950]="store.touchpadDrawingMode() || store.showTouchpadOverlay()"
          [class.dark:text-emerald-400]="store.touchpadDrawingMode() || store.showTouchpadOverlay()"
          [class.text-neutral-600]="!store.touchpadDrawingMode() && !store.showTouchpadOverlay()"
          [class.hover:bg-neutral-100]="!store.touchpadDrawingMode() && !store.showTouchpadOverlay()"
        >
          <mat-icon class="text-xl">laptop_chromebook</mat-icon>
          @if (store.touchpadDrawingMode()) {
            <span class="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          }
        </button>

        <!-- Templates Library -->
        <button
          (click)="store.showTemplateModal.set(true)"
          title="Browse Diagram Templates"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all cursor-pointer"
        >
          <mat-icon class="text-xl">dashboard_customize</mat-icon>
        </button>

        <!-- S Pen / Phone Remote Simulator Toggle -->
        <button
          (click)="toggleSimulatedPhone()"
          title="Open Samsung Galaxy Note9 Virtual Remote"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all cursor-pointer"
          [class.ring-2]="store.showSimulatedPhone()"
          [class.ring-blue-500]="store.showSimulatedPhone()"
        >
          <mat-icon class="text-xl">phonelink</mat-icon>
        </button>
      </div>
    </aside>
  `
})
export class LeftToolbar {
  readonly store = inject(WhiteboardStore);
  readonly showDrawMenu = signal<boolean>(false);
  readonly showShapeMenu = signal<boolean>(false);

  toggleSimulatedPhone(): void {
    this.store.showSimulatedPhone.update((v) => !v);
  }

  toggleTouchpadDrawing(): void {
    this.store.showTouchpadOverlay.update((v) => !v);
    if (!this.isDrawingTool(this.store.activeTool())) {
      this.store.activeTool.set('pen');
    }
  }

  isDrawingTool(tool: ToolType): boolean {
    return ['pen', 'pencil', 'highlighter', 'eraser', 'laser'].includes(tool);
  }

  setTool(tool: ToolType): void {
    this.store.activeTool.set(tool);
    this.showDrawMenu.set(false);
    this.showShapeMenu.set(false);
  }

  toggleDrawMenu(): void {
    this.showDrawMenu.update((v) => !v);
    this.showShapeMenu.set(false);
    if (!this.isDrawingTool(this.store.activeTool())) {
      this.store.activeTool.set('pen');
    }
  }

  selectDrawTool(tool: 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'laser'): void {
    this.store.activeTool.set(tool);
    this.showDrawMenu.set(false);
  }

  toggleShapeMenu(): void {
    this.showShapeMenu.update((v) => !v);
    this.showDrawMenu.set(false);
    this.store.activeTool.set('shape');
  }

  pickShape(type: ShapeType): void {
    this.store.selectedShapeType.set(type);
    this.store.activeTool.set('shape');
    this.showShapeMenu.set(false);
  }
}
