import { Injectable, computed, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  CanvasObject,
  CompanionAction,
  CompanionState,
  DrawingStroke,
  LaserMark,
  SPenMappings,
  ShapeType,
  ToolType,
  Viewport,
  Whiteboard
} from '../models/whiteboard.models';
import { TEMPLATES } from '../data/templates';

const STORAGE_KEY = 'flowboard_whiteboards_v1';
const ACTIVE_BOARD_KEY = 'flowboard_active_board_id';
const SPEN_CONFIG_KEY = 'flowboard_spen_mappings';

export const DEFAULT_SPEN_MAPPINGS: SPenMappings = {
  singlePress: 'UNDO',
  doublePress: 'TOOL_ERASER',
  longPress: 'TOOL_LASER',
  airLeft: 'PREV_FRAME',
  airRight: 'NEXT_FRAME',
  airUp: 'ZOOM_IN',
  airDown: 'ZOOM_OUT',
  shake: 'CLEAR_LASER'
};

@Injectable({
  providedIn: 'root'
})
export class WhiteboardStore {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // View state
  readonly viewMode = signal<'canvas' | 'dashboard'>('canvas');
  readonly isPresentationMode = signal<boolean>(false);
  readonly currentFrameIndex = signal<number>(0);
  readonly presenterTimer = signal<number>(0); // in seconds
  readonly isPresenterTimerRunning = signal<boolean>(false);

  // Active tools
  readonly activeTool = signal<ToolType>('select');
  readonly selectedShapeType = signal<ShapeType>('rounded-rect');
  readonly penColor = signal<string>('#0f172a');
  readonly strokeWidth = signal<number>(3);
  readonly penOpacity = signal<number>(1);
  readonly strokeSmoothing = signal<boolean>(true);
  readonly pressureSensitivity = signal<boolean>(true);

  // Canvas selection & interaction
  readonly selectedObjectId = signal<string | null>(null);
  readonly hoveredObjectId = signal<string | null>(null);
  readonly isDraggingObject = signal<boolean>(false);
  readonly isPanning = signal<boolean>(false);
  readonly isDrawing = signal<boolean>(false);
  readonly currentStroke = signal<DrawingStroke | null>(null);

  // Laser Pointer & Spotlight
  readonly laserMarks = signal<LaserMark[]>([]);
  readonly isLaserActive = signal<boolean>(false);
  readonly laserCursorPos = signal<{ x: number; y: number } | null>(null);
  readonly spotlightActive = signal<boolean>(false);
  readonly spotlightPos = signal<{ x: number; y: number }>({ x: 500, y: 300 });

  // Modals & Panels
  readonly showCompanionModal = signal<boolean>(false);
  readonly showSettingsModal = signal<boolean>(false);
  readonly showShortcutsModal = signal<boolean>(false);
  readonly showShareModal = signal<boolean>(false);
  readonly showTemplateModal = signal<boolean>(false);
  readonly showSimulatedPhone = signal<boolean>(false);
  readonly showMiniMap = signal<boolean>(true);
  readonly isHighContrast = signal<boolean>(false);
  readonly uiScale = signal<number>(1);

  // Companion state
  readonly companionState = signal<CompanionState>({
    connected: false,
    pairingCode: '839-204',
    deviceName: 'Samsung Galaxy Note9 (SM-N960F)',
    phoneBattery: 88,
    spenBattery: 100,
    signalStrength: 95,
    latencyMs: 14,
    lastPing: Date.now()
  });

  readonly spenMappings = signal<SPenMappings>(DEFAULT_SPEN_MAPPINGS);

  // Collaboration state
  readonly isCollaborativeActive = signal<boolean>(true);
  readonly remoteCollaborators = signal<
    { id: string; name: string; color: string; x: number; y: number; role: string }[]
  >([
    { id: 'u2', name: 'Sophia R. (Designer)', color: '#ec4899', x: 740, y: 310, role: 'editor' },
    { id: 'u3', name: 'Liam K. (Engineer)', color: '#06b6d4', x: 920, y: 460, role: 'editor' }
  ]);

  // Boards
  readonly boards = signal<Whiteboard[]>([]);
  readonly currentBoardId = signal<string>('board-default');

  // History stack for Undo / Redo (up to 120 states)
  private undoStack: { objects: CanvasObject[]; strokes: DrawingStroke[] }[] = [];
  private redoStack: { objects: CanvasObject[]; strokes: DrawingStroke[] }[] = [];
  readonly canUndo = signal<boolean>(false);
  readonly canRedo = signal<boolean>(false);

  // Current Whiteboard (computed)
  readonly currentBoard = computed<Whiteboard>(() => {
    const list = this.boards();
    const id = this.currentBoardId();
    const found = list.find((b) => b.id === id);
    if (found) return found;
    return list[0] || this.createInitialBoard();
  });

  readonly selectedObject = computed<CanvasObject | null>(() => {
    const id = this.selectedObjectId();
    if (!id) return null;
    return this.currentBoard().objects.find((o) => o.id === id) || null;
  });

  // Frames inside board for Presentation mode
  readonly frames = computed<CanvasObject[]>(() => {
    return this.currentBoard()
      .objects.filter((o) => o.type === 'frame')
      .sort((a, b) => (a.metadata?.frameNumber || 0) - (b.metadata?.frameNumber || 0));
  });

  constructor() {
    this.initStore();

    if (this.isBrowser) {
      // Auto-save effect
      effect(() => {
        const boardList = this.boards();
        const activeId = this.currentBoardId();
        if (boardList.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(boardList));
            localStorage.setItem(ACTIVE_BOARD_KEY, activeId);
          } catch (e) {
            console.warn('LocalStorage save error:', e);
          }
        }
      });

      // Save SPen mappings
      effect(() => {
        const mappings = this.spenMappings();
        try {
          localStorage.setItem(SPEN_CONFIG_KEY, JSON.stringify(mappings));
        } catch {
          // ignore
        }
      });

      // Presenter timer tick
      setInterval(() => {
        if (this.isPresentationMode() && this.isPresenterTimerRunning()) {
          this.presenterTimer.update((t) => t + 1);
        }
      }, 1000);

      // Collaborator cursor gentle simulation
      setInterval(() => {
        if (this.isCollaborativeActive()) {
          this.remoteCollaborators.update((users) =>
            users.map((u) => ({
              ...u,
              x: u.x + (Math.random() - 0.5) * 8,
              y: u.y + (Math.random() - 0.5) * 8
            }))
          );
        }
      }, 2000);
    }
  }

  private initStore(): void {
    if (!this.isBrowser) {
      const initial = this.createInitialBoard();
      this.boards.set([initial]);
      this.currentBoardId.set(initial.id);
      return;
    }

    try {
      const savedMappings = localStorage.getItem(SPEN_CONFIG_KEY);
      if (savedMappings) {
        this.spenMappings.set(JSON.parse(savedMappings));
      }

      const savedBoards = localStorage.getItem(STORAGE_KEY);
      const activeId = localStorage.getItem(ACTIVE_BOARD_KEY);

      if (savedBoards) {
        const parsed = JSON.parse(savedBoards) as Whiteboard[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.boards.set(parsed);
          this.currentBoardId.set(activeId && parsed.some((b) => b.id === activeId) ? activeId : parsed[0].id);
          this.snapshotHistory();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed reading from localStorage', e);
    }

    const defaultBoard = this.createInitialBoard();
    this.boards.set([defaultBoard]);
    this.currentBoardId.set(defaultBoard.id);
    this.snapshotHistory();
  }

  private createInitialBoard(): Whiteboard {
    const actionPlan = TEMPLATES.find((t) => t.id === 'action-plan') || TEMPLATES[0];
    return {
      id: 'board-whitepro',
      name: 'whitepro',
      ownerId: 'user-primary',
      objects: JSON.parse(JSON.stringify(actionPlan.objects)),
      strokes: JSON.parse(JSON.stringify(actionPlan.strokes)),
      viewport: { x: 50, y: 40, zoom: 0.9 },
      background: 'dots',
      collaborators: [
        {
          id: 'user-primary',
          name: 'Omar (You)',
          color: '#3b82f6',
          role: 'owner',
          avatar: 'O'
        }
      ],
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 3600000,
      isFavorite: true
    };
  }

  // --- Board Operations ---
  createBoard(name = 'Untitled Whiteboard', templateId?: string): string {
    const newId = 'board-' + Date.now();
    let objects: CanvasObject[] = [];
    let strokes: DrawingStroke[] = [];

    if (templateId) {
      const tmpl = TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) {
        objects = JSON.parse(JSON.stringify(tmpl.objects));
        strokes = JSON.parse(JSON.stringify(tmpl.strokes));
      }
    }

    const newBoard: Whiteboard = {
      id: newId,
      name,
      ownerId: 'user-primary',
      objects,
      strokes,
      viewport: { x: 100, y: 100, zoom: 1.0 },
      background: 'dots',
      collaborators: [
        {
          id: 'user-primary',
          name: 'Omar (You)',
          color: '#3b82f6',
          role: 'owner',
          avatar: 'O'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };

    this.boards.update((list) => [newBoard, ...list]);
    this.currentBoardId.set(newId);
    this.viewMode.set('canvas');
    this.clearHistory();
    this.snapshotHistory();
    return newId;
  }

  renameBoard(id: string, name: string): void {
    this.boards.update((list) =>
      list.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b))
    );
  }

  duplicateBoard(id: string): void {
    const target = this.boards().find((b) => b.id === id);
    if (!target) return;
    const copy: Whiteboard = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'board-' + Date.now(),
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.boards.update((list) => [copy, ...list]);
  }

  deleteBoard(id: string): void {
    const remaining = this.boards().filter((b) => b.id !== id);
    if (remaining.length === 0) {
      const fresh = this.createInitialBoard();
      this.boards.set([fresh]);
      this.currentBoardId.set(fresh.id);
    } else {
      this.boards.set(remaining);
      if (this.currentBoardId() === id) {
        this.currentBoardId.set(remaining[0].id);
      }
    }
  }

  toggleFavorite(id: string): void {
    this.boards.update((list) =>
      list.map((b) => (b.id === id ? { ...b, isFavorite: !b.isFavorite } : b))
    );
  }

  setBackground(bg: 'dots' | 'grid' | 'blank' | 'dark'): void {
    this.updateCurrentBoard((b) => ({ ...b, background: bg }));
  }

  // --- Viewport & Navigation ---
  setViewport(viewport: Partial<Viewport>): void {
    this.updateCurrentBoard((b) => ({
      ...b,
      viewport: { ...b.viewport, ...viewport }
    }));
  }

  zoomIn(): void {
    const curr = this.currentBoard().viewport.zoom;
    const next = Math.min(4.0, Math.round((curr + 0.15) * 100) / 100);
    this.setViewport({ zoom: next });
  }

  zoomOut(): void {
    const curr = this.currentBoard().viewport.zoom;
    const next = Math.max(0.1, Math.round((curr - 0.15) * 100) / 100);
    this.setViewport({ zoom: next });
  }

  resetZoom(): void {
    this.setViewport({ zoom: 1.0 });
  }

  fitToScreen(): void {
    const objects = this.currentBoard().objects;
    if (objects.length === 0) {
      this.setViewport({ x: 50, y: 50, zoom: 1.0 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of objects) {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    }

    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const screenW = this.isBrowser ? window.innerWidth : 1200;
    const screenH = this.isBrowser ? window.innerHeight : 800;

    const scaleX = screenW / width;
    const scaleY = screenH / height;
    const zoom = Math.max(0.2, Math.min(1.2, Math.min(scaleX, scaleY)));

    this.setViewport({
      x: -minX * zoom + padding,
      y: -minY * zoom + padding,
      zoom: Math.round(zoom * 100) / 100
    });
  }

  // --- Object Operations ---
  addObject(object: CanvasObject): void {
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({
      ...b,
      objects: [...b.objects, object]
    }));
    this.selectedObjectId.set(object.id);
  }

  updateObject(id: string, updates: Partial<CanvasObject>): void {
    this.updateCurrentBoard((b) => ({
      ...b,
      objects: b.objects.map((o) => (o.id === id ? { ...o, ...updates } : o))
    }));
  }

  deleteSelectedObject(): void {
    const id = this.selectedObjectId();
    if (!id) return;
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({
      ...b,
      objects: b.objects.filter((o) => o.id !== id && o.metadata?.fromId !== id && o.metadata?.toId !== id)
    }));
    this.selectedObjectId.set(null);
  }

  duplicateSelectedObject(): void {
    const obj = this.selectedObject();
    if (!obj) return;
    this.snapshotHistory();
    const cloned: CanvasObject = {
      ...JSON.parse(JSON.stringify(obj)),
      id: 'obj-' + Date.now(),
      x: obj.x + 30,
      y: obj.y + 30,
      zIndex: (obj.zIndex || 1) + 1
    };
    this.updateCurrentBoard((b) => ({
      ...b,
      objects: [...b.objects, cloned]
    }));
    this.selectedObjectId.set(cloned.id);
  }

  toggleLockSelectedObject(): void {
    const obj = this.selectedObject();
    if (!obj) return;
    this.updateObject(obj.id, { locked: !obj.locked });
  }

  bringToFront(id: string): void {
    const board = this.currentBoard();
    const maxZ = Math.max(0, ...board.objects.map((o) => o.zIndex || 0));
    this.updateObject(id, { zIndex: maxZ + 1 });
  }

  sendToBack(id: string): void {
    const board = this.currentBoard();
    const minZ = Math.min(0, ...board.objects.map((o) => o.zIndex || 0));
    this.updateObject(id, { zIndex: minZ - 1 });
  }

  // --- Drawing / Strokes ---
  addStroke(stroke: DrawingStroke): void {
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({
      ...b,
      strokes: [...b.strokes, stroke]
    }));
  }

  eraseStrokesAt(x: number, y: number, radius = 20): void {
    const board = this.currentBoard();
    const filtered = board.strokes.filter((stroke) => {
      // Check if any point in stroke is within radius
      return !stroke.points.some((pt) => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });
    });

    if (filtered.length !== board.strokes.length) {
      this.snapshotHistory();
      this.updateCurrentBoard((b) => ({ ...b, strokes: filtered }));
    }
  }

  clearAllDrawings(): void {
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({ ...b, strokes: [] }));
  }

  // --- Laser Pointer ---
  addLaserMark(mark: LaserMark): void {
    this.laserMarks.update((marks) => [...marks.slice(-40), mark]);
  }

  clearLaserMarks(): void {
    this.laserMarks.set([]);
  }

  // --- Presentation Mode ---
  togglePresentationMode(): void {
    const next = !this.isPresentationMode();
    this.isPresentationMode.set(next);
    if (next) {
      this.currentFrameIndex.set(0);
      this.isPresenterTimerRunning.set(true);
      this.navigateToFrame(0);
    } else {
      this.isPresenterTimerRunning.set(false);
      this.spotlightActive.set(false);
      this.isLaserActive.set(false);
    }
  }

  navigateToFrame(index: number): void {
    const frames = this.frames();
    if (frames.length === 0) return;
    const clamped = Math.max(0, Math.min(frames.length - 1, index));
    this.currentFrameIndex.set(clamped);

    const frame = frames[clamped];
    if (frame) {
      const screenW = this.isBrowser ? window.innerWidth : 1200;
      const screenH = this.isBrowser ? window.innerHeight : 800;
      const scaleX = (screenW - 120) / frame.width;
      const scaleY = (screenH - 120) / frame.height;
      const zoom = Math.min(scaleX, scaleY, 1.4);

      this.setViewport({
        x: screenW / 2 - (frame.x + frame.width / 2) * zoom,
        y: screenH / 2 - (frame.y + frame.height / 2) * zoom,
        zoom: Math.round(zoom * 100) / 100
      });
    }
  }

  nextFrame(): void {
    const count = this.frames().length;
    if (count > 0) {
      this.navigateToFrame((this.currentFrameIndex() + 1) % count);
    }
  }

  prevFrame(): void {
    const count = this.frames().length;
    if (count > 0) {
      this.navigateToFrame((this.currentFrameIndex() - 1 + count) % count);
    }
  }

  // --- S Pen Companion Command Dispatcher ---
  executeCompanionCommand(action: CompanionAction, payload?: Record<string, unknown>): void {
    switch (action) {
      case 'UNDO':
        this.undo();
        break;
      case 'REDO':
        this.redo();
        break;
      case 'TOOL_PEN':
        this.activeTool.set('pen');
        this.isLaserActive.set(false);
        break;
      case 'TOOL_ERASER':
        this.activeTool.set(this.activeTool() === 'eraser' ? 'pen' : 'eraser');
        this.isLaserActive.set(false);
        break;
      case 'TOOL_SELECT':
        this.activeTool.set('select');
        this.isLaserActive.set(false);
        break;
      case 'TOOL_LASER':
        this.isLaserActive.update((v) => !v);
        if (this.isLaserActive()) {
          this.activeTool.set('laser');
        } else {
          this.activeTool.set('select');
        }
        break;
      case 'NEXT_FRAME':
        if (!this.isPresentationMode()) {
          this.togglePresentationMode();
        }
        this.nextFrame();
        break;
      case 'PREV_FRAME':
        if (!this.isPresentationMode()) {
          this.togglePresentationMode();
        }
        this.prevFrame();
        break;
      case 'ZOOM_IN':
        this.zoomIn();
        break;
      case 'ZOOM_OUT':
        this.zoomOut();
        break;
      case 'RESET_ZOOM':
        this.resetZoom();
        break;
      case 'CLEAR_LASER':
        this.clearLaserMarks();
        break;
      case 'TOGGLE_PRESENT':
        this.togglePresentationMode();
        break;
      case 'COLOR_SELECT':
        if (payload && typeof payload['color'] === 'string') {
          this.penColor.set(payload['color']);
        }
        break;
    }
  }

  // --- History Management (Undo / Redo with 100+ depth) ---
  private snapshotHistory(): void {
    const b = this.currentBoard();
    const state = {
      objects: JSON.parse(JSON.stringify(b.objects)),
      strokes: JSON.parse(JSON.stringify(b.strokes))
    };
    this.undoStack.push(state);
    if (this.undoStack.length > 120) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(false);
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    const b = this.currentBoard();
    const currentState = {
      objects: JSON.parse(JSON.stringify(b.objects)),
      strokes: JSON.parse(JSON.stringify(b.strokes))
    };
    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop()!;
    this.updateCurrentBoard((board) => ({
      ...board,
      objects: previousState.objects,
      strokes: previousState.strokes
    }));

    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
    this.selectedObjectId.set(null);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const b = this.currentBoard();
    const currentState = {
      objects: JSON.parse(JSON.stringify(b.objects)),
      strokes: JSON.parse(JSON.stringify(b.strokes))
    };
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop()!;
    this.updateCurrentBoard((board) => ({
      ...board,
      objects: nextState.objects,
      strokes: nextState.strokes
    }));

    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  // --- Import / Export ---
  exportToJson(): string {
    return JSON.stringify(this.currentBoard(), null, 2);
  }

  importFromJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as Whiteboard;
      if (parsed && Array.isArray(parsed.objects)) {
        parsed.id = 'board-' + Date.now();
        parsed.updatedAt = Date.now();
        this.boards.update((list) => [parsed, ...list]);
        this.currentBoardId.set(parsed.id);
        this.clearHistory();
        this.snapshotHistory();
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }

  private updateCurrentBoard(updater: (b: Whiteboard) => Whiteboard): void {
    const id = this.currentBoardId();
    this.boards.update((list) =>
      list.map((b) => (b.id === id ? { ...updater(b), updatedAt: Date.now() } : b))
    );
  }
}
