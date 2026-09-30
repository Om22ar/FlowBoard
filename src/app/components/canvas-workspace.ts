import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
  effect,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import {
  CanvasObject,
  DrawingStroke,
  ShapeType,
  ToolType
} from '../models/whiteboard.models';
import {
  computeConnectorPath,
  pointsToSvgPath,
  renderStrokeOnContext
} from '../utils/canvas-math';

@Component({
  selector: 'app-canvas-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      #viewportContainer
      class="relative flex-1 w-full h-full overflow-hidden select-none touch-none bg-white dark:bg-neutral-900"
      [class.cursor-grab]="store.activeTool() === 'hand' && !isSpacePanning()"
      [class.cursor-grabbing]="store.isPanning() || isSpacePanning()"
      [class.cursor-crosshair]="isDrawingTool(store.activeTool())"
      [class.cursor-default]="store.activeTool() === 'select'"
      [style.background-color]="store.currentBoard().background === 'dark' ? '#000000' : ''"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
      (wheel)="onWheel($event)"
    >
      <!-- Background Grid/Dots/Lined/Graph Pattern SVG -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- DOTS PATTERN -->
          @if (store.activeBackgroundConfig().pattern === 'dots') {
            @let sz = store.activeBackgroundConfig().gridSize * store.currentBoard().viewport.zoom;
            <pattern
              id="grid-pattern"
              [attr.width]="sz"
              [attr.height]="sz"
              patternUnits="userSpaceOnUse"
              [attr.patternTransform]="'translate(' + (store.currentBoard().viewport.x % sz) + ',' + (store.currentBoard().viewport.y % sz) + ')'"
            >
              <circle
                [attr.cx]="sz / 2"
                [attr.cy]="sz / 2"
                [attr.r]="Math.max(0.75, (store.activeBackgroundConfig().lineThickness / 2) * store.currentBoard().viewport.zoom)"
                [attr.fill]="store.activeBackgroundConfig().patternColor"
                [attr.opacity]="store.activeBackgroundConfig().opacity"
              />
            </pattern>
          }

          <!-- GRID PATTERN -->
          @else if (store.activeBackgroundConfig().pattern === 'grid') {
            @let sz = store.activeBackgroundConfig().gridSize * store.currentBoard().viewport.zoom;
            <pattern
              id="grid-pattern"
              [attr.width]="sz"
              [attr.height]="sz"
              patternUnits="userSpaceOnUse"
              [attr.patternTransform]="'translate(' + (store.currentBoard().viewport.x % sz) + ',' + (store.currentBoard().viewport.y % sz) + ')'"
            >
              <path
                [attr.d]="'M ' + sz + ' 0 L 0 0 0 ' + sz"
                fill="none"
                [attr.stroke]="store.activeBackgroundConfig().patternColor"
                [attr.stroke-width]="Math.max(0.5, store.activeBackgroundConfig().lineThickness * store.currentBoard().viewport.zoom)"
                [attr.opacity]="store.activeBackgroundConfig().opacity"
              />
            </pattern>
          }

          <!-- LINED PAPER PATTERN -->
          @else if (store.activeBackgroundConfig().pattern === 'lined') {
            @let spacing = store.activeBackgroundConfig().spacing * store.currentBoard().viewport.zoom;
            <pattern
              id="grid-pattern"
              [attr.width]="2000"
              [attr.height]="spacing"
              patternUnits="userSpaceOnUse"
              [attr.patternTransform]="'translate(0,' + (store.currentBoard().viewport.y % spacing) + ')'"
            >
              <!-- Horizontal ruled line -->
              <line
                x1="0"
                [attr.y1]="spacing"
                x2="2000"
                [attr.y2]="spacing"
                [attr.stroke]="store.activeBackgroundConfig().patternColor"
                [attr.stroke-width]="Math.max(0.75, store.activeBackgroundConfig().lineThickness * store.currentBoard().viewport.zoom)"
                [attr.opacity]="store.activeBackgroundConfig().opacity"
              />
            </pattern>
          }

          <!-- GRAPH PAPER PATTERN (Dual Major & Minor Grid) -->
          @else if (store.activeBackgroundConfig().pattern === 'graph') {
            @let majorSz = store.activeBackgroundConfig().spacing * store.currentBoard().viewport.zoom;
            @let minorSz = store.activeBackgroundConfig().gridSize * store.currentBoard().viewport.zoom;
            <pattern
              id="grid-pattern"
              [attr.width]="majorSz"
              [attr.height]="majorSz"
              patternUnits="userSpaceOnUse"
              [attr.patternTransform]="'translate(' + (store.currentBoard().viewport.x % majorSz) + ',' + (store.currentBoard().viewport.y % majorSz) + ')'"
            >
              <!-- Minor sub-grid -->
              <path
                [attr.d]="getGraphMinorSubgridPath(majorSz, minorSz)"
                fill="none"
                [attr.stroke]="store.activeBackgroundConfig().patternColor"
                [attr.stroke-width]="Math.max(0.4, (store.activeBackgroundConfig().lineThickness * 0.5) * store.currentBoard().viewport.zoom)"
                [attr.opacity]="store.activeBackgroundConfig().opacity * 0.55"
              />
              <!-- Major grid boundary -->
              <path
                [attr.d]="'M ' + majorSz + ' 0 L 0 0 0 ' + majorSz"
                fill="none"
                [attr.stroke]="store.activeBackgroundConfig().patternColor"
                [attr.stroke-width]="Math.max(0.8, store.activeBackgroundConfig().lineThickness * store.currentBoard().viewport.zoom)"
                [attr.opacity]="store.activeBackgroundConfig().opacity"
              />
            </pattern>
          }
        </defs>

        @if (store.activeBackgroundConfig().pattern !== 'plain' && store.activeBackgroundConfig().pattern !== 'image') {
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        }
      </svg>

      <!-- Canvas Scene Transformation Root Container -->
      <div
        class="absolute origin-top-left will-change-transform"
        [style.transform]="'translate(' + store.currentBoard().viewport.x + 'px, ' + store.currentBoard().viewport.y + 'px) scale(' + store.currentBoard().viewport.zoom + ')'"
      >
        <!-- 0. Locked Background Image Layer (Non-selectable reference layer) -->
        @if (store.activeBackgroundConfig().imageUrl; as imgUrl) {
          <div
            class="absolute top-0 left-0 pointer-events-none select-none z-0"
            [style.opacity]="store.activeBackgroundConfig().imageOpacity || 0.9"
            [style.transform]="'translate(' + (store.activeBackgroundConfig().imagePositionX || 0) + 'px, ' + (store.activeBackgroundConfig().imagePositionY || 0) + 'px) scale(' + (store.activeBackgroundConfig().imageScale || 1) + ')'"
          >
            <img
              [src]="imgUrl"
              alt="Whiteboard background"
              class="rounded-xl shadow-lg border border-black/10 pointer-events-none select-none max-w-none"
              referrerpolicy="no-referrer"
            />
          </div>
        }
        <!-- 1. HTML5 Vector Drawing Canvas (60 FPS strokes rendering) -->
        <canvas
          #drawingCanvas
          class="absolute top-0 left-0 pointer-events-none"
          [attr.width]="canvasWidth()"
          [attr.height]="canvasHeight()"
        ></canvas>

        <!-- 2. Connectors & Vector Drawing Strokes SVG Layer -->
        <svg
          class="absolute top-0 left-0 overflow-visible pointer-events-none z-10"
          [attr.width]="canvasWidth()"
          [attr.height]="canvasHeight()"
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
              <polygon points="10 0, 0 3.5, 10 7" fill="#64748b" />
            </marker>
          </defs>

          <!-- Permanent Board Vector Strokes -->
          @for (stroke of store.currentBoard().strokes; track stroke.id) {
            <path
              [attr.d]="pointsToSvgPath(stroke.points, stroke.smoothing)"
              [attr.stroke]="stroke.color || '#ef4444'"
              [attr.stroke-width]="stroke.width || 4"
              [attr.opacity]="stroke.opacity"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          }

          <!-- Live In-Progress Remote / Local Active Stroke -->
          @if (store.currentStroke(); as cur) {
            <path
              [attr.d]="pointsToSvgPath(cur.points, cur.smoothing)"
              [attr.stroke]="cur.color || '#ef4444'"
              [attr.stroke-width]="cur.width || 4"
              [attr.opacity]="cur.opacity"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          }

          @for (conn of connectorPaths(); track conn.id) {
            <g 
              class="cursor-pointer group" 
              (pointerdown)="onConnectorPointerDown(conn.id, $event)"
              style="pointer-events: auto;"
            >
              <!-- Hidden wider hit area for easier selection -->
              <path
                [attr.d]="conn.path"
                stroke="transparent"
                stroke-width="16"
                fill="none"
              />
              <path
                [attr.d]="conn.path"
                [attr.stroke]="conn.stroke"
                [attr.stroke-width]="conn.strokeWidth"
                fill="none"
                stroke-linecap="round"
                [attr.marker-end]="conn.arrowEnd ? 'url(#arrowhead)' : ''"
                [attr.marker-start]="conn.arrowStart ? 'url(#arrowhead-start)' : ''"
              />
            </g>
          }
        </svg>

        <!-- 3. Interactive Whiteboard DOM Objects -->
        @for (obj of store.currentBoard().objects; track obj.id) {
          @if (obj.type !== 'connector') {
            <div
              class="absolute select-none cursor-pointer transition-shadow"
              [style.left.px]="obj.x"
              [style.top.px]="obj.y"
              [style.width.px]="obj.width"
              [style.height.px]="obj.height"
              [style.z-index]="obj.zIndex || 1"
              [style.transform]="'rotate(' + (obj.rotation || 0) + 'deg)'"
              (pointerdown)="onObjectPointerDown(obj, $event)"
              [class.ring-2]="store.selectedObjectId() === obj.id"
              [class.ring-blue-500]="store.selectedObjectId() === obj.id"
              [class.ring-offset-2]="store.selectedObjectId() === obj.id"
            >
              <!-- FRAME OBJECT -->
              @if (obj.type === 'frame') {
                <div
                  class="w-full h-full rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-2xs p-3 flex flex-col justify-between"
                  [style.border-color]="obj.style.stroke || '#cbd5e1'"
                >
                  <div class="flex items-center justify-between text-xs font-bold text-neutral-500">
                    <span class="flex items-center gap-1.5">
                      <mat-icon class="text-sm">aspect_ratio</mat-icon>
                      {{ obj.metadata?.frameTitle || 'Presentation Frame' }}
                    </span>
                    <span class="font-mono text-[10px] bg-neutral-200/60 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                      #{{ obj.metadata?.frameNumber || 1 }}
                    </span>
                  </div>
                </div>
              }

              <!-- STICKY NOTE OBJECT -->
              @else if (obj.type === 'sticky') {
                <div
                  class="w-full h-full p-4 rounded-xl shadow-md flex flex-col justify-between cursor-text"
                  [style.background-color]="obj.style.fill || '#fef08a'"
                  [style.border]="'1px solid ' + (obj.style.stroke || '#facc15')"
                  [style.color]="obj.style.textColor || '#713f12'"
                >
                  <textarea
                    [value]="obj.content || ''"
                    (input)="onObjectContentChange(obj.id, $event)"
                    placeholder="Write a thought..."
                    class="w-full h-full bg-transparent resize-none focus:outline-none font-sans leading-relaxed text-xs md:text-sm"
                    [style.font-size.px]="obj.style.fontSize || 14"
                  ></textarea>
                </div>
              }

              <!-- TEXT OBJECT -->
              @else if (obj.type === 'text') {
                <div
                  class="w-full h-full p-1 cursor-text"
                  [style.font-size.px]="obj.style.fontSize || 16"
                  [style.color]="obj.style.textColor || '#0f172a'"
                  [style.text-align]="obj.style.textAlign || 'left'"
                  [style.font-weight]="obj.style.fontWeight || 'normal'"
                >
                  <textarea
                    [value]="obj.content || ''"
                    (input)="onObjectContentChange(obj.id, $event)"
                    placeholder="Type text..."
                    class="w-full h-full bg-transparent resize-none focus:outline-none"
                  ></textarea>
                </div>
              }

              <!-- SHAPE OBJECT -->
              @else if (obj.type === 'shape') {
                <div
                  class="w-full h-full flex items-center justify-center p-3 text-center transition-all cursor-text shadow-xs"
                  [style.background-color]="obj.style.fill || '#ffffff'"
                  [style.border]="(obj.style.strokeWidth || 1.5) + 'px solid ' + (obj.style.stroke || '#0f172a')"
                  [style.border-radius.px]="getShapeBorderRadius(obj)"
                  [style.color]="obj.style.textColor || '#0f172a'"
                  [style.font-size.px]="obj.style.fontSize || 14"
                  [style.font-weight]="obj.style.fontWeight || '500'"
                >
                  <textarea
                    [value]="obj.content || ''"
                    (input)="onObjectContentChange(obj.id, $event)"
                    placeholder="Shape text..."
                    class="w-full h-full bg-transparent resize-none text-center focus:outline-none flex items-center justify-center font-sans self-center"
                    style="line-height: 1.3;"
                  ></textarea>
                </div>
              }

              <!-- MIND MAP NODE OBJECT -->
              @else if (obj.type === 'mindmap') {
                <div
                  class="w-full h-full px-4 py-2 rounded-full shadow-md flex items-center justify-between group relative"
                  [style.background-color]="obj.style.fill || '#3b82f6'"
                  [style.border]="'2px solid ' + (obj.style.stroke || '#1d4ed8')"
                  [style.color]="obj.style.textColor || '#ffffff'"
                >
                  <input
                    type="text"
                    [value]="obj.content || ''"
                    (input)="onObjectContentChange(obj.id, $event)"
                    class="w-full bg-transparent focus:outline-none text-xs md:text-sm font-semibold text-center"
                  />
                  <!-- Quick Branch Add Button (+) -->
                  <button
                    (click)="addMindMapChild(obj, $event)"
                    title="Add Child Idea"
                    class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white text-blue-600 shadow-md border border-neutral-200 flex items-center justify-center hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                  >
                    <mat-icon class="text-xs">add</mat-icon>
                  </button>
                </div>
              }

              <!-- TASK / CHECKLIST CARD OBJECT -->
              @else if (obj.type === 'task') {
                <div
                  class="w-full h-full p-3.5 bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between"
                >
                  <div class="flex items-start justify-between gap-2">
                    <textarea
                      [value]="obj.content || ''"
                      (input)="onObjectContentChange(obj.id, $event)"
                      placeholder="Task description..."
                      class="w-full bg-transparent resize-none focus:outline-none text-xs font-semibold text-neutral-800 dark:text-neutral-100"
                    ></textarea>
                    <button
                      (click)="toggleTaskComplete(obj, $event)"
                      class="text-neutral-400 hover:text-emerald-500"
                    >
                      <mat-icon class="text-base" [class.text-emerald-500]="obj.metadata?.completed">
                        {{ obj.metadata?.completed ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                    </button>
                  </div>
                  <div class="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100 dark:border-neutral-700 text-neutral-500">
                    <span
                      class="px-2 py-0.5 rounded-full font-medium"
                      [style.background-color]="(obj.metadata?.statusColor || '#3b82f6') + '20'"
                      [style.color]="obj.metadata?.statusColor || '#3b82f6'"
                    >
                      {{ obj.metadata?.statusText || 'To Do' }}
                    </span>
                    <span class="font-mono">{{ obj.metadata?.dueDate || 'Today' }}</span>
                  </div>
                </div>
              }

              <!-- DOCUMENT CARD OBJECT (Exact match to Image 1) -->
              @else if (obj.type === 'doc' || obj.metadata?.isDocCard) {
                <div
                  class="w-full h-full bg-white dark:bg-[#1a1b1e] rounded-2xl shadow-xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col overflow-hidden relative select-text"
                >
                  <!-- Window Header Bar (Blue doc icon, title, star, ▶ New, •••, ⤢, ✕) -->
                  <div class="px-4 py-2.5 bg-white dark:bg-[#1a1b1e] border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2 shrink-0">
                    <div class="flex items-center gap-2 min-w-0">
                      <mat-icon class="text-blue-500 text-base shrink-0">description</mat-icon>
                      <span class="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                        {{ obj.metadata?.docTitle || 'testing' }}
                      </span>
                      <button
                        (click)="toggleDocStar(obj, $event)"
                        class="text-neutral-400 hover:text-amber-400 transition-colors p-0.5 cursor-pointer"
                      >
                        <mat-icon class="text-xs">star_border</mat-icon>
                      </button>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <!-- ▶ New Badge -->
                      <span class="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-[10px] flex items-center gap-1">
                        <mat-icon class="text-[10px]">play_circle</mat-icon>
                        <span>New</span>
                      </span>
                      <button class="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 transition-colors cursor-pointer">
                        <mat-icon class="text-xs">more_horiz</mat-icon>
                      </button>
                      <button class="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 transition-colors cursor-pointer">
                        <mat-icon class="text-xs">open_in_full</mat-icon>
                      </button>
                      <button
                        (click)="store.deleteObjectById(obj.id); $event.stopPropagation()"
                        class="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-xs">close</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Document Canvas Body -->
                  <div class="flex-1 p-6 relative flex flex-col overflow-y-auto">
                    <!-- Top Icon Box -->
                    <div class="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-500 mb-3 shrink-0">
                      <mat-icon class="text-base">description</mat-icon>
                    </div>

                    <!-- Link Task or Doc button -->
                    <button class="text-[11px] font-semibold text-neutral-400 hover:text-blue-600 flex items-center gap-1 mb-2.5 self-start cursor-pointer transition-colors">
                      <mat-icon class="text-xs">link</mat-icon>
                      <span>Link Task or Doc</span>
                    </button>

                    <!-- Document Title Heading (Bold & Large) -->
                    <h2 class="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-1.5 leading-snug">
                      {{ obj.metadata?.docTitle || 'testing' }}
                    </h2>

                    <!-- Author & Timestamp Line -->
                    <div class="flex items-center gap-2 text-xs text-neutral-400 mb-5">
                      <div class="relative w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        <span>O</span>
                        <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-neutral-900"></span>
                      </div>
                      <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ obj.metadata?.docAuthor || 'omar' }}</span>
                      <span>•</span>
                      <span>Last updated {{ obj.metadata?.docUpdatedAt || 'Today at 9:24 pm' }}</span>
                    </div>

                    <!-- Document Content Body -->
                    <textarea
                      [value]="obj.content || 'Hello'"
                      (input)="onObjectContentChange(obj.id, $event)"
                      placeholder="Type your notes or document text here..."
                      class="flex-1 w-full bg-transparent resize-none focus:outline-none text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans"
                    ></textarea>

                    <!-- Right Vertical Action Bar (Image 1) -->
                    <div class="absolute right-4 top-6 flex flex-col items-center gap-3.5 text-neutral-400">
                      <button title="Comment" class="hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
                        <mat-icon class="text-base">chat_bubble_outline</mat-icon>
                      </button>
                      <button title="Typography" class="hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
                        <mat-icon class="text-base">format_size</mat-icon>
                      </button>
                      <button title="Relationships" class="hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
                        <mat-icon class="text-base">swap_horiz</mat-icon>
                      </button>
                      <button title="Copy Link" class="hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
                        <mat-icon class="text-base">link</mat-icon>
                      </button>
                      <button title="Download / Export" class="hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
                        <mat-icon class="text-base">file_download</mat-icon>
                      </button>
                    </div>

                    <!-- Bottom Right Sparkle Icon (Image 1) -->
                    <div class="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 p-0.5 flex items-center justify-center shadow-xs">
                      <mat-icon class="text-white text-xs">auto_awesome</mat-icon>
                    </div>
                  </div>
                </div>
              }

              <!-- TABLE OBJECT -->
              @else if (obj.type === 'table') {
                <div class="w-full h-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-md p-2 overflow-auto">
                  <table class="w-full text-xs border-collapse">
                    <tbody>
                      @for (row of getTableData(obj); track $index; let r = $index) {
                        <tr>
                          @for (cell of row; track $index; let c = $index) {
                            <td class="border border-neutral-200 dark:border-neutral-700 p-1.5">
                              <input
                                type="text"
                                [value]="cell"
                                (input)="onTableCellChange(obj, r, c, $event)"
                                class="w-full bg-transparent focus:outline-none text-neutral-800 dark:text-neutral-200 text-xs"
                              />
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              <!-- CODE BLOCK OBJECT -->
              @else if (obj.type === 'code') {
                <div class="w-full h-full bg-neutral-950 text-emerald-400 p-3 rounded-xl font-mono text-xs shadow-md border border-neutral-800 flex flex-col justify-between">
                  <div class="flex items-center justify-between text-[10px] text-neutral-400 pb-1 border-b border-neutral-800 mb-1">
                    <span>{{ obj.metadata?.codeLanguage || 'TypeScript' }}</span>
                    <button (click)="copyCode(obj.content || '', $event)" class="hover:text-white">Copy</button>
                  </div>
                  <textarea
                    [value]="obj.content || 'const flow = new Whiteboard();'"
                    (input)="onObjectContentChange(obj.id, $event)"
                    class="w-full flex-1 bg-transparent resize-none focus:outline-none text-emerald-300 font-mono text-xs"
                  ></textarea>
                </div>
              }

              <!-- SELECTION RESIZE & ROTATE HANDLES (When Selected) -->
              @if (store.selectedObjectId() === obj.id && !obj.locked) {
                <!-- Rotation Knob -->
                <div
                  class="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-sm cursor-grab"
                  title="Rotate"
                  (pointerdown)="onRotateHandleDown(obj, $event)"
                ></div>

                <!-- 8 Resize Knobs -->
                <div
                  class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'nw', $event)"
                ></div>
                <div
                  class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'n', $event)"
                ></div>
                <div
                  class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'ne', $event)"
                ></div>
                <div
                  class="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'e', $event)"
                ></div>
                <div
                  class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'se', $event)"
                ></div>
                <div
                  class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize"
                  (pointerdown)="onResizeHandleDown(obj, 's', $event)"
                ></div>
                <div
                  class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'sw', $event)"
                ></div>
                <div
                  class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize"
                  (pointerdown)="onResizeHandleDown(obj, 'w', $event)"
                ></div>
              }
            </div>
          }
        }

        <!-- 4. Simulated Remote Collaborator Cursors -->
        @if (store.isCollaborativeActive()) {
          @for (user of store.remoteCollaborators(); track user.id) {
            <div
              class="absolute pointer-events-none transition-all duration-300 z-50 flex items-start gap-1"
              [style.left.px]="user.x"
              [style.top.px]="user.y"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5.65 2.5L20.5 12.5L13.5 14.5L10 21.5L5.65 2.5Z" [attr.fill]="user.color" stroke="white" stroke-width="1.5"/>
              </svg>
              <span
                class="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-xs whitespace-nowrap"
                [style.background-color]="user.color"
              >
                {{ user.name }}
              </span>
            </div>
          }
        }
      </div>

      <!-- Laser Pointer Canvas Overlay -->
      <canvas
        #laserCanvas
        class="absolute inset-0 pointer-events-none z-30"
        [attr.width]="screenW()"
        [attr.height]="screenH()"
      ></canvas>

      <!-- Laser Cursor Dot -->
      @if (store.isLaserActive() && store.laserCursorPos(); as lp) {
        <div
          class="fixed pointer-events-none z-40 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] -translate-x-1/2 -translate-y-1/2"
          [style.left.px]="lp.x"
          [style.top.px]="lp.y"
        ></div>
      }
    </div>
  `
})
export class CanvasWorkspace {
  readonly store = inject(WhiteboardStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly Math = Math;
  readonly pointsToSvgPath = pointsToSvgPath;

  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('laserCanvas') laserCanvas!: ElementRef<HTMLCanvasElement>;

  readonly canvasWidth = signal<number>(5000);
  readonly canvasHeight = signal<number>(4000);
  readonly screenW = signal<number>(1920);
  readonly screenH = signal<number>(1080);

  // Interaction State
  readonly isSpacePanning = signal<boolean>(false);
  private activePointers = new Map<number, { x: number; y: number; type: string }>();
  private initialPinchDist = 0;
  private initialZoom = 1;
  private panStart = { x: 0, y: 0 };
  private lastPointerPoint: { x: number; y: number; time: number } | null = null;
  private lastCalculatedPressure = 0.5;
  private activeTransform: {
    objId: string;
    mode: 'move' | 'resize' | 'rotate';
    handle?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    initialAngle: number;
  } | null = null;

  // Connector Paths computed for reactive SVG rendering
  readonly connectorPaths = computed(() => {
    const objs = this.store.currentBoard().objects;
    const connectors = objs.filter((o) => o.type === 'connector');
    const result: { id: string; path: string; stroke: string; strokeWidth: number; arrowStart: boolean; arrowEnd: boolean }[] = [];

    for (const c of connectors) {
      const fromObj = objs.find((o) => o.id === c.metadata?.fromId);
      const toObj = objs.find((o) => o.id === c.metadata?.toId);

      const pathInfo = computeConnectorPath(
        fromObj,
        toObj,
        c.metadata?.fromPoint,
        c.metadata?.toPoint,
        c.metadata?.connectorType || 'straight'
      );

      result.push({
        id: c.id,
        path: pathInfo.pathData,
        stroke: c.style.stroke || '#64748b',
        strokeWidth: c.style.strokeWidth || 2,
        arrowStart: !!c.metadata?.arrowStart,
        arrowEnd: c.metadata?.arrowEnd !== false
      });
    }

    return result;
  });

  constructor() {
    if (this.isBrowser) {
      // Re-draw canvas whenever strokes or background change
      effect(() => {
        const strokes = this.store.currentBoard().strokes;
        const current = this.store.currentStroke();
        this.renderAllStrokes(strokes, current);
      });

      // Update screen dimensions
      setTimeout(() => {
        this.updateScreenDimensions();
      }, 50);

      // Laser animation loop for fading trails
      const loop = () => {
        this.renderLaserOverlay();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  private updateScreenDimensions(): void {
    if (typeof window !== 'undefined') {
      this.screenW.set(window.innerWidth);
      this.screenH.set(window.innerHeight);
    }
  }

  isDrawingTool(tool: ToolType): boolean {
    return ['pen', 'pencil', 'highlighter', 'eraser', 'laser'].includes(tool);
  }

  getShapeBorderRadius(obj: CanvasObject): number {
    if (obj.metadata?.shapeType === 'circle') return 9999;
    if (obj.metadata?.shapeType === 'rounded-rect') return obj.style.borderRadius || 12;
    if (obj.metadata?.shapeType === 'diamond') return 4;
    return obj.style.borderRadius || 4;
  }

  getGraphMinorSubgridPath(majorSize: number, minorSize: number): string {
    let d = '';
    const step = Math.max(4, minorSize);
    for (let x = step; x < majorSize; x += step) {
      d += `M ${x} 0 L ${x} ${majorSize} `;
    }
    for (let y = step; y < majorSize; y += step) {
      d += `M 0 ${y} L ${majorSize} ${y} `;
    }
    return d;
  }

  toggleDocStar(obj: CanvasObject, event: Event): void {
    event.stopPropagation();
    this.store.showToast('Document saved to starred items', 'info');
  }

  updateDocTitle(obj: CanvasObject, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateObject(obj.id, {
      metadata: { ...obj.metadata, docTitle: input.value }
    });
  }

  // --- Keyboard Shortcuts Listeners ---
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Spacebar for quick hand pan
    if (e.code === 'Space' && !this.isSpacePanning()) {
      this.isSpacePanning.set(true);
    }

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.store.redo();
      } else {
        this.store.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.store.redo();
    }

    // Duplicate
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.store.duplicateSelectedObject();
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.store.deleteSelectedObject();
    }

    // Tool switching
    switch (e.key.toLowerCase()) {
      case 'v':
        this.store.activeTool.set('select');
        break;
      case 'h':
        this.store.activeTool.set('hand');
        break;
      case 'p':
        this.store.activeTool.set('pen');
        break;
      case 'e':
        this.store.activeTool.set('eraser');
        break;
      case 'l':
        this.store.isLaserActive.update((v) => !v);
        break;
      case 's':
      case 'n':
        this.createQuickSticky();
        break;
      case 't':
        this.createQuickText();
        break;
      case 'escape':
        if (this.store.isPresentationMode()) {
          this.store.togglePresentationMode();
        } else {
          this.store.selectedObjectId.set(null);
        }
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpacePanning.set(false);
    }
  }

  // --- Pointer Events Engine ---
  onPointerDown(e: PointerEvent): void {
    if (this.store.isPresentationMode() && !this.store.isLaserActive()) {
      return;
    }

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    // Multi-touch pinch zoom & pan detection (2 fingers)
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.initialZoom = this.store.currentBoard().viewport.zoom;
      return;
    }

    const { canvasX, canvasY } = this.screenToCanvas(e.clientX, e.clientY);

    // Laser pointer mode
    if (this.store.isLaserActive() || this.store.activeTool() === 'laser') {
      this.store.laserCursorPos.set({ x: e.clientX, y: e.clientY });
      this.store.addLaserMark({ x: canvasX, y: canvasY, timestamp: Date.now(), color: '#ef4444' });
      return;
    }

    // Pan mode (Hand tool, Spacebar, Middle mouse click, or right click)
    if (this.store.activeTool() === 'hand' || this.isSpacePanning() || e.button === 1 || e.button === 2) {
      this.store.isPanning.set(true);
      this.panStart = {
        x: e.clientX - this.store.currentBoard().viewport.x,
        y: e.clientY - this.store.currentBoard().viewport.y
      };
      return;
    }

    // Touchscreen / Stylus Drawing
    // Palm Rejection & Hardware Stylus Telemetry:
    if (e.pointerType === 'pen') {
      this.store.recordStylusPointerEvent(e);
      if (this.store.autoSwitchToPenOnStylus() && this.store.activeTool() === 'select') {
        this.store.activeTool.set('pen');
      }
    }

    const tool = this.store.activeTool();
    if (this.isDrawingTool(tool)) {
      if (tool === 'eraser') {
        this.store.eraseStrokesAt(canvasX, canvasY, 24);
      } else {
        this.store.isDrawing.set(true);
        this.lastPointerPoint = { x: e.clientX, y: e.clientY, time: Date.now() };
        this.lastCalculatedPressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

        let initialPressure = this.lastCalculatedPressure;
        if (this.store.touchpadDrawingMode() && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
          initialPressure = this.store.touchpadSensitivity() === 'expressive' ? 0.45 : 0.6;
        }

        const newStroke: DrawingStroke = {
          id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
          points: [{ x: canvasX, y: canvasY, pressure: initialPressure, time: Date.now() }],
          color: this.store.penColor(),
          width: this.store.strokeWidth(),
          opacity: tool === 'highlighter' ? 0.45 : this.store.penOpacity(),
          tool: tool as 'pen' | 'pencil' | 'highlighter' | 'eraser',
          smoothing: this.store.strokeSmoothing()
        };
        this.store.currentStroke.set(newStroke);
      }
      return;
    }

    // Creation Tools
    if (tool === 'sticky') {
      this.createStickyAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'text') {
      this.createTextAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'shape') {
      this.createShapeAt(canvasX, canvasY, this.store.selectedShapeType());
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'mindmap') {
      this.createMindMapNodeAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'task') {
      this.createTaskAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'frame') {
      this.createFrameAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'table') {
      this.createTableAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }
    if (tool === 'code') {
      this.createCodeAt(canvasX, canvasY);
      this.store.activeTool.set('select');
      return;
    }

    if (tool === 'connector' || tool === 'arrow') {
      this.startConnectorDrawing(canvasX, canvasY);
      return;
    }

    // Default select tool on canvas empty area clears selection
    this.store.selectedObjectId.set(null);
  }

  onPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'pen') {
      this.store.recordStylusPointerEvent(e);
    }

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    }

    // Spotlight cursor tracking
    if (this.store.spotlightActive()) {
      this.store.spotlightPos.set({ x: e.clientX, y: e.clientY });
    }

    // Multi-touch two-finger pinch zoom & pan
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.initialPinchDist > 0) {
        const factor = currentDist / this.initialPinchDist;
        const newZoom = Math.min(4.0, Math.max(0.1, this.initialZoom * factor));
        this.store.setViewport({ zoom: Math.round(newZoom * 100) / 100 });
      }
      return;
    }

    const { canvasX, canvasY } = this.screenToCanvas(e.clientX, e.clientY);

    // Laser pointer drawing
    if (this.store.isLaserActive()) {
      this.store.laserCursorPos.set({ x: e.clientX, y: e.clientY });
      this.store.addLaserMark({ x: canvasX, y: canvasY, timestamp: Date.now(), color: '#ef4444' });
    }

    // Panning canvas
    if (this.store.isPanning()) {
      this.store.setViewport({
        x: e.clientX - this.panStart.x,
        y: e.clientY - this.panStart.y
      });
      return;
    }

    // Transforming object (moving, resizing, rotating)
    if (this.activeTransform) {
      const t = this.activeTransform;
      const dx = (e.clientX - t.startX) / this.store.currentBoard().viewport.zoom;
      const dy = (e.clientY - t.startY) / this.store.currentBoard().viewport.zoom;

      if (t.mode === 'move') {
        this.store.updateObject(t.objId, {
          x: Math.round(t.initialX + dx),
          y: Math.round(t.initialY + dy)
        });
      } else if (t.mode === 'resize') {
        let newW = t.initialW;
        let newH = t.initialH;
        let newX = t.initialX;
        let newY = t.initialY;

        if (t.handle?.includes('e')) newW = Math.max(40, t.initialW + dx);
        if (t.handle?.includes('s')) newH = Math.max(30, t.initialH + dy);
        if (t.handle?.includes('w')) {
          const w = Math.max(40, t.initialW - dx);
          newX = t.initialX + (t.initialW - w);
          newW = w;
        }
        if (t.handle?.includes('n')) {
          const h = Math.max(30, t.initialH - dy);
          newY = t.initialY + (t.initialH - h);
          newH = h;
        }

        this.store.updateObject(t.objId, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH)
        });
      } else if (t.mode === 'rotate') {
        const obj = this.store.currentBoard().objects.find((o) => o.id === t.objId);
        if (obj) {
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          const rad = Math.atan2(canvasY - cy, canvasX - cx);
          const deg = Math.round((rad * 180) / Math.PI) + 90;
          this.store.updateObject(t.objId, { rotation: deg });
        }
      }
      return;
    }

    if (this.store.isConnectorDrawing() && this.store.selectedObjectId()) {
      this.updateConnectorDrawing(canvasX, canvasY);
      return;
    }

    // Drawing stroke
    if (this.store.isDrawing()) {
      const stroke = this.store.currentStroke();
      if (stroke) {
        let pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

        // Dynamic speed-to-pressure curve for laptop touchpads & finger writing
        if (this.store.touchpadDrawingMode() && (e.pointerType === 'mouse' || e.pointerType === 'touch') && this.lastPointerPoint) {
          const dt = Math.max(1, Date.now() - this.lastPointerPoint.time);
          const dist = Math.hypot(e.clientX - this.lastPointerPoint.x, e.clientY - this.lastPointerPoint.y);
          const speed = dist / dt;

          let targetPressure = 0.5;
          if (this.store.touchpadSensitivity() === 'expressive') {
            targetPressure = Math.max(0.2, Math.min(0.95, 0.85 - (speed * 0.18)));
          } else if (this.store.touchpadSensitivity() === 'light') {
            targetPressure = Math.max(0.15, Math.min(0.7, 0.6 - (speed * 0.15)));
          } else {
            targetPressure = 0.6;
          }

          pressure = this.lastCalculatedPressure * 0.65 + targetPressure * 0.35;
          this.lastCalculatedPressure = pressure;
        }

        this.lastPointerPoint = { x: e.clientX, y: e.clientY, time: Date.now() };
        stroke.points.push({ x: canvasX, y: canvasY, pressure, time: Date.now() });
        this.store.currentStroke.set({ ...stroke });
        this.renderAllStrokes(this.store.currentBoard().strokes, stroke);
      }
    } else if (this.store.activeTool() === 'eraser' && (e.buttons === 1 || e.pointerType === 'pen')) {
      this.store.eraseStrokesAt(canvasX, canvasY, 24);
    }
  }

  onPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);

    if (this.store.isPanning()) {
      this.store.isPanning.set(false);
    }

    if (this.activeTransform) {
      this.activeTransform = null;
    }

    if (this.store.isDrawing()) {
      this.store.isDrawing.set(false);
      const stroke = this.store.currentStroke();
      if (stroke && stroke.points.length > 0) {
        this.store.addStroke(stroke);
      }
      this.store.currentStroke.set(null);
    }

    if (this.store.isConnectorDrawing()) {
      this.store.isConnectorDrawing.set(false);
      this.store.activeTool.set('select');
    }
  }

  onPointerCancel(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    this.store.isPanning.set(false);
    this.activeTransform = null;
    this.store.isDrawing.set(false);
  }

  // Smooth Zoom on Wheel (Centering zoom around mouse pointer)
  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const vp = this.store.currentBoard().viewport;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.min(4.0, Math.max(0.1, vp.zoom * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newX = mouseX - ((mouseX - vp.x) * nextZoom) / vp.zoom;
    const newY = mouseY - ((mouseY - vp.y) * nextZoom) / vp.zoom;

    this.store.setViewport({
      x: Math.round(newX),
      y: Math.round(newY),
      zoom: Math.round(nextZoom * 100) / 100
    });
  }

  // --- Object Pointer Interaction ---
  onObjectPointerDown(obj: CanvasObject, e: PointerEvent): void {
    if (this.isDrawingTool(this.store.activeTool())) return;

    e.stopPropagation();
    this.store.selectedObjectId.set(obj.id);

    if (obj.locked) return;

    this.activeTransform = {
      objId: obj.id,
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialX: obj.x,
      initialY: obj.y,
      initialW: obj.width,
      initialH: obj.height,
      initialAngle: obj.rotation || 0
    };
  }

  onResizeHandleDown(obj: CanvasObject, handle: string, e: PointerEvent): void {
    e.stopPropagation();
    this.activeTransform = {
      objId: obj.id,
      mode: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: obj.x,
      initialY: obj.y,
      initialW: obj.width,
      initialH: obj.height,
      initialAngle: obj.rotation || 0
    };
  }

  onRotateHandleDown(obj: CanvasObject, e: PointerEvent): void {
    e.stopPropagation();
    this.activeTransform = {
      objId: obj.id,
      mode: 'rotate',
      startX: e.clientX,
      startY: e.clientY,
      initialX: obj.x,
      initialY: obj.y,
      initialW: obj.width,
      initialH: obj.height,
      initialAngle: obj.rotation || 0
    };
  }

  // --- Content & Data Changes ---
  onObjectContentChange(id: string, event: Event): void {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.store.updateObject(id, { content: val });
  }

  toggleTaskComplete(obj: CanvasObject, e: MouseEvent): void {
    e.stopPropagation();
    const curr = !!obj.metadata?.completed;
    this.store.updateObject(obj.id, {
      metadata: {
        ...obj.metadata,
        completed: !curr,
        statusText: !curr ? 'Completed' : 'In Progress',
        statusColor: !curr ? '#10b981' : '#3b82f6'
      }
    });
  }

  getTableData(obj: CanvasObject): string[][] {
    return (
      obj.metadata?.tableData || [
        ['Phase', 'Deliverable', 'Owner'],
        ['Alpha', 'Architecture', 'Omar'],
        ['Beta', 'Integration', 'Liam']
      ]
    );
  }

  onTableCellChange(obj: CanvasObject, r: number, c: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const tableData = JSON.parse(JSON.stringify(this.getTableData(obj)));
    if (tableData[r]) {
      tableData[r][c] = val;
      this.store.updateObject(obj.id, {
        metadata: { ...obj.metadata, tableData }
      });
    }
  }

  copyCode(code: string, e: MouseEvent): void {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  }

  addMindMapChild(parent: CanvasObject, e: MouseEvent): void {
    e.stopPropagation();
    const childId = 'mind-' + Date.now();
    const child: CanvasObject = {
      id: childId,
      type: 'mindmap',
      x: parent.x + 240,
      y: parent.y + (Math.random() - 0.5) * 80,
      width: 160,
      height: 44,
      rotation: 0,
      zIndex: 2,
      style: {
        fill: '#f0fdf4',
        stroke: '#16a34a',
        textColor: '#15803d',
        fontWeight: '600',
        borderRadius: 22,
        fontSize: 13,
        textAlign: 'center'
      },
      content: 'New Sub-Idea',
      metadata: {
        parentId: parent.id,
        branchColor: '#16a34a'
      }
    };

    // Add connector between parent & child
    const conn: CanvasObject = {
      id: 'conn-' + Date.now(),
      type: 'connector',
      x: parent.x,
      y: parent.y,
      width: 0,
      height: 0,
      rotation: 0,
      zIndex: 1,
      style: { stroke: '#16a34a', strokeWidth: 2 },
      metadata: { fromId: parent.id, toId: childId, connectorType: 'curved' }
    };

    this.store.addObject(child);
    this.store.addObject(conn);
  }

  // --- Canvas Coordinate Conversion ---
  private screenToCanvas(screenX: number, screenY: number): { canvasX: number; canvasY: number } {
    const vp = this.store.currentBoard().viewport;
    return {
      canvasX: Math.round((screenX - vp.x) / vp.zoom),
      canvasY: Math.round((screenY - vp.y) / vp.zoom)
    };
  }

  // --- HTML5 Canvas Vector Strokes Redraw ---
  private renderAllStrokes(strokes: DrawingStroke[], current: DrawingStroke | null): void {
    if (!this.drawingCanvas?.nativeElement) return;
    const canvas = this.drawingCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      renderStrokeOnContext(
        ctx,
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.opacity,
        stroke.tool,
        stroke.smoothing
      );
    }

    if (current) {
      renderStrokeOnContext(
        ctx,
        current.points,
        current.color,
        current.width,
        current.opacity,
        current.tool,
        current.smoothing
      );
    }
  }

  // --- Laser Trail Overlay Rendering ---
  private renderLaserOverlay(): void {
    if (!this.laserCanvas?.nativeElement) return;
    const canvas = this.laserCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const marks = this.store.laserMarks();
    if (marks.length === 0) return;

    const now = Date.now();
    const vp = this.store.currentBoard().viewport;

    // Filter out old marks (> 1.6 seconds)
    const validMarks = marks.filter((m) => now - m.timestamp < 1600);
    if (validMarks.length !== marks.length) {
      this.store.laserMarks.set(validMarks);
    }

    for (let i = 1; i < validMarks.length; i++) {
      const m1 = validMarks[i - 1];
      const m2 = validMarks[i];

      const age = now - m2.timestamp;
      const alpha = Math.max(0, 1 - age / 1600);

      const p1x = m1.x * vp.zoom + vp.x;
      const p1y = m1.y * vp.zoom + vp.y;
      const p2x = m2.x * vp.zoom + vp.x;
      const p2y = m2.y * vp.zoom + vp.y;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 4 * vp.zoom;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Quick Element Creation Helpers ---
  private createQuickSticky(): void {
    const vp = this.store.currentBoard().viewport;
    this.createStickyAt((-vp.x + 400) / vp.zoom, (-vp.y + 300) / vp.zoom);
  }

  private createQuickText(): void {
    const vp = this.store.currentBoard().viewport;
    this.createTextAt((-vp.x + 400) / vp.zoom, (-vp.y + 300) / vp.zoom);
  }

  private createStickyAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'sticky-' + Date.now(),
      type: 'sticky',
      x,
      y,
      width: 190,
      height: 190,
      rotation: (Math.random() - 0.5) * 4,
      zIndex: 2,
      style: { fill: '#fef08a', stroke: '#facc15', textColor: '#713f12', fontSize: 14, shadow: true },
      content: 'New sticky note'
    };
    this.store.addObject(obj);
  }

  private createTextAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'text-' + Date.now(),
      type: 'text',
      x,
      y,
      width: 200,
      height: 50,
      rotation: 0,
      zIndex: 2,
      style: { fontSize: 18, textColor: '#0f172a', fontWeight: '600' },
      content: 'Headline text'
    };
    this.store.addObject(obj);
  }

  private createShapeAt(x: number, y: number, shapeType: ShapeType): void {
    const obj: CanvasObject = {
      id: 'shape-' + Date.now(),
      type: 'shape',
      x,
      y,
      width: shapeType === 'circle' ? 140 : 180,
      height: shapeType === 'circle' ? 140 : 80,
      rotation: 0,
      zIndex: 2,
      style: { fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2, borderRadius: 8, fontSize: 14 },
      content: 'Shape text',
      metadata: { shapeType }
    };
    this.store.addObject(obj);
  }

  private createMindMapNodeAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'mind-' + Date.now(),
      type: 'mindmap',
      x,
      y,
      width: 180,
      height: 50,
      rotation: 0,
      zIndex: 2,
      style: { fill: '#3b82f6', stroke: '#1d4ed8', textColor: '#ffffff', fontWeight: '700', borderRadius: 25 },
      content: 'Core Idea',
      metadata: { isRoot: false }
    };
    this.store.addObject(obj);
  }

  private createTaskAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'task-' + Date.now(),
      type: 'task',
      x,
      y,
      width: 240,
      height: 100,
      rotation: 0,
      zIndex: 2,
      style: { fill: '#ffffff', stroke: '#e2e8f0', borderRadius: 10, shadow: true },
      content: 'New Sprint Task Item',
      metadata: { statusText: 'In Progress', statusColor: '#3b82f6', dueDate: 'Tomorrow' }
    };
    this.store.addObject(obj);
  }

  private createFrameAt(x: number, y: number): void {
    const num = this.store.frames().length + 1;
    const obj: CanvasObject = {
      id: 'frame-' + Date.now(),
      type: 'frame',
      x,
      y,
      width: 800,
      height: 550,
      rotation: 0,
      zIndex: 0,
      style: { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 2, strokeStyle: 'dashed' },
      metadata: { frameNumber: num, frameTitle: `Frame ${num}: Overview` }
    };
    this.store.addObject(obj);
  }

  private createTableAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'table-' + Date.now(),
      type: 'table',
      x,
      y,
      width: 300,
      height: 140,
      rotation: 0,
      zIndex: 2,
      style: { fill: '#ffffff', stroke: '#e2e8f0', borderRadius: 8 },
      metadata: {
        tableData: [
          ['Feature', 'Status', 'Lead'],
          ['Pen Pressure', 'Active', 'Omar'],
          ['Note9 Remote', 'Ready', 'Elena']
        ]
      }
    };
    this.store.addObject(obj);
  }

  private createCodeAt(x: number, y: number): void {
    const obj: CanvasObject = {
      id: 'code-' + Date.now(),
      type: 'code',
      x,
      y,
      width: 280,
      height: 120,
      rotation: 0,
      zIndex: 2,
      style: { borderRadius: 10 },
      content: '// Samsung S Pen Event Handler\nfunction onAirGesture(gesture) {\n  whiteboard.dispatch(gesture);\n}',
      metadata: { codeLanguage: 'TypeScript' }
    };
    this.store.addObject(obj);
  }

  private startConnectorDrawing(x: number, y: number): void {
    const id = 'conn-' + Date.now();
    const conn: CanvasObject = {
      id,
      type: 'connector',
      x,
      y,
      width: 1,
      height: 1,
      rotation: 0,
      zIndex: Date.now(),
      content: '',
      style: {
        stroke: this.store.penColor(),
        strokeWidth: this.store.strokeWidth() === 4 ? 3 : this.store.strokeWidth(),
        strokeStyle: 'solid',
        textColor: this.store.penColor(),
        fontSize: 14,
        fontFamily: 'sans'
      },
      metadata: {
        connectorType: this.store.defaultConnectorType(),
        fromPoint: { x, y },
        toPoint: { x, y },
        arrowStart: this.store.defaultArrowStart(),
        arrowEnd: this.store.defaultArrowEnd()
      }
    };

    this.store.addObject(conn);
    this.store.selectedObjectId.set(id);
    this.store.isConnectorDrawing.set(true);
    this.store.showConnectorTray.set(false);
  }

  private updateConnectorDrawing(x: number, y: number): void {
    const id = this.store.selectedObjectId();
    if (!id) return;

    const obj = this.store.currentBoard().objects.find((o) => o.id === id);
    if (!obj || obj.type !== 'connector') return;

    this.store.updateObject(id, {
      metadata: {
        ...obj.metadata,
        toPoint: { x, y }
      }
    });
  }

  onConnectorPointerDown(id: string, e: PointerEvent): void {
    e.stopPropagation();
    this.store.selectedObjectId.set(id);
    this.store.activeTool.set('select');
  }
}
