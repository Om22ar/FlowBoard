import { Injectable, computed, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  CanvasObject,
  CompanionAction,
  CompanionState,
  ConnectionEventLog,
  ConnectionTestResult,
  DrawingPoint,
  DrawingStroke,
  LaserMark,
  SPenMappings,
  ShapeType,
  StylusHardwareState,
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

  // Companion state & Diagnostics
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

  // Real connection test results from live ping / diagnostics
  readonly connectionTestResult = signal<ConnectionTestResult>({
    status: 'idle',
    roundTripMs: 0,
    serverTimestamp: 0,
    activePairingCode: '839-204',
    message: 'Diagnostics idle. Click "Test Connection Ping" to verify.',
    testedAt: ''
  });

  // Real-time Event Terminal Log
  readonly connectionLogs = signal<ConnectionEventLog[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      source: 'system',
      action: 'Session Ready: S Pen Companion Service Listening on PIN 839-204',
      success: true
    }
  ]);

  // Physical Stylus / Pen Hardware Sensor State (Windows 10 Touchscreen / Active Digitizer)
  readonly hardwareStylus = signal<StylusHardwareState>({
    detected: false,
    pointerType: 'none',
    pressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    barrelButton: false,
    eraserTip: false,
    lastActiveTimestamp: 0,
    samplesCount: 0
  });

  readonly autoSwitchToPenOnStylus = signal<boolean>(true);

  // Laptop TouchPad & Finger Direct Drawing Mode
  readonly touchpadDrawingMode = signal<boolean>(true);
  readonly touchpadSensitivity = signal<'light' | 'normal' | 'expressive'>('expressive');
  readonly touchpadSmoothingLevel = signal<'standard' | 'high' | 'ultra'>('high');
  readonly showTouchpadOverlay = signal<boolean>(false);

  // User notification toast
  readonly activeToast = signal<{ message: string; type: 'info' | 'success' | 'warning'; id: number } | null>(null);

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
  private processedStrokeIds = new Set<string>();
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
      background: 'dark',
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
    this.deleteObjectById(id);
  }

  deleteObjectById(id: string): void {
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({
      ...b,
      objects: b.objects.filter((o) => o.id !== id && o.metadata?.fromId !== id && o.metadata?.toId !== id),
      strokes: b.strokes.filter((s) => s.id !== id)
    }));
    if (this.selectedObjectId() === id) {
      this.selectedObjectId.set(null);
    }
  }

  deleteStrokeById(id: string): void {
    this.snapshotHistory();
    this.updateCurrentBoard((b) => ({
      ...b,
      strokes: b.strokes.filter((s) => s.id !== id)
    }));
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

  eraseStrokesAt(x: number, y: number, radius = 24, recordHistory = false): boolean {
    const board = this.currentBoard();

    const filtered = board.strokes.filter((stroke) => {
      const strokeRadius = radius + (stroke.width || 2) / 2;
      const sr2 = strokeRadius * strokeRadius;
      const pts = stroke.points;
      if (!pts || pts.length === 0) return true;

      // 1. Check points directly
      for (const pt of pts) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        if (dx * dx + dy * dy <= sr2) {
          return false; // Erase stroke
        }
      }

      // 2. Check line segments between consecutive points
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const l2 = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
        let distSq = 0;
        if (l2 === 0) {
          const dx = p1.x - x;
          const dy = p1.y - y;
          distSq = dx * dx + dy * dy;
        } else {
          let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p1.x + t * (p2.x - p1.x);
          const projY = p1.y + t * (p2.y - p1.y);
          const dx = x - projX;
          const dy = y - projY;
          distSq = dx * dx + dy * dy;
        }
        if (distSq <= sr2) {
          return false; // Erase stroke
        }
      }

      return true; // Keep stroke
    });

    if (filtered.length !== board.strokes.length) {
      if (recordHistory) {
        this.snapshotHistory();
      }
      this.updateCurrentBoard((b) => ({ ...b, strokes: filtered }));
      return true;
    }
    return false;
  }

  eraseObjectsAt(x: number, y: number, radius = 24, recordHistory = false): boolean {
    const board = this.currentBoard();
    const toRemove = new Set<string>();

    for (const obj of board.objects) {
      if (obj.locked) continue;
      const minX = obj.x - radius;
      const maxX = obj.x + obj.width + radius;
      const minY = obj.y - radius;
      const maxY = obj.y + obj.height + radius;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        toRemove.add(obj.id);
      }
    }

    if (toRemove.size > 0) {
      if (recordHistory) {
        this.snapshotHistory();
      }
      this.updateCurrentBoard((b) => ({
        ...b,
        objects: b.objects.filter((o) => !toRemove.has(o.id) && !toRemove.has(o.metadata?.fromId || '') && !toRemove.has(o.metadata?.toId || ''))
      }));
      return true;
    }
    return false;
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

  // --- Physical Stylus / Active Pen Tracking (Windows 10 Hardware) ---
  recordStylusPointerEvent(e: PointerEvent): void {
    const isPen = e.pointerType === 'pen';
    const hasPressure = typeof e.pressure === 'number' && e.pressure > 0;
    const isEraser = e.buttons === 32 || (e as PointerEvent & { pointerType?: string }).pointerType === 'eraser';

    this.hardwareStylus.update((prev) => ({
      detected: isPen || prev.detected,
      pointerType: (e.pointerType as 'pen' | 'touch' | 'mouse') || 'mouse',
      pressure: hasPressure ? Math.round(e.pressure * 100) / 100 : prev.pressure,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      twist: (e as PointerEvent & { twist?: number }).twist || 0,
      barrelButton: e.buttons === 2 || e.button === 2,
      eraserTip: isEraser,
      lastActiveTimestamp: Date.now(),
      samplesCount: prev.samplesCount + 1
    }));

    // Auto-switch to pen if user touches with physical stylus
    if (isPen && this.autoSwitchToPenOnStylus() && this.activeTool() === 'select') {
      this.activeTool.set('pen');
    }
  }

  // --- Real-time Connection Diagnostics & Self-Test ---
  async runConnectionSelfTest(): Promise<ConnectionTestResult> {
    const code = this.companionState().pairingCode;
    const startTime = Date.now();

    this.connectionTestResult.set({
      status: 'testing',
      roundTripMs: 0,
      serverTimestamp: 0,
      activePairingCode: code,
      message: 'Sending test probe to /api/companion/ping...',
      testedAt: new Date().toLocaleTimeString()
    });

    try {
      const res = await fetch('/api/companion/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, clientTime: startTime })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const roundTripMs = Math.max(1, Date.now() - startTime);

      const result: ConnectionTestResult = {
        status: 'connected',
        roundTripMs,
        serverTimestamp: data.serverTime || Date.now(),
        activePairingCode: code,
        message: `Real Ping Successful (${roundTripMs} ms) · WebSocket/SSE Channel Operational`,
        testedAt: new Date().toLocaleTimeString()
      };

      this.connectionTestResult.set(result);
      this.companionState.update((s) => ({
        ...s,
        latencyMs: roundTripMs,
        lastPing: Date.now()
      }));

      this.logCompanionEvent({
        source: 'ping',
        action: `Diagnostics Ping: ${roundTripMs}ms Roundtrip (Server Sync Verified)`,
        latencyMs: roundTripMs,
        success: true
      });

      this.showToast(`Ping Test Passed: ${roundTripMs}ms Roundtrip`, 'success');
      return result;
    } catch {
      const result: ConnectionTestResult = {
        status: 'error',
        roundTripMs: -1,
        serverTimestamp: 0,
        activePairingCode: code,
        message: 'Could not contact server API. Check local network or dev server.',
        testedAt: new Date().toLocaleTimeString()
      };
      this.connectionTestResult.set(result);
      this.showToast('Diagnostics probe failed to reach backend API', 'warning');
      return result;
    }
  }

  logCompanionEvent(event: Partial<ConnectionEventLog>): void {
    const newEntry: ConnectionEventLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      time: new Date().toLocaleTimeString(),
      source: event.source || 'system',
      action: event.action || 'Unknown Event',
      latencyMs: event.latencyMs,
      success: event.success !== false,
      detail: event.detail
    };

    this.connectionLogs.update((logs) => [newEntry, ...logs.slice(0, 39)]);
  }

  showToast(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const id = Date.now();
    this.activeToast.set({ message, type, id });
    setTimeout(() => {
      if (this.activeToast()?.id === id) {
        this.activeToast.set(null);
      }
    }, 3500);
  }

  // --- S Pen Companion Command Dispatcher ---
  executeCompanionCommand(action: CompanionAction, payload?: Record<string, unknown>): void {
    // Log incoming command with real timestamp
    this.logCompanionEvent({
      source: 'spen',
      action: `Remote Action: ${action}`,
      success: true,
      detail: payload ? JSON.stringify(payload) : undefined
    });

    switch (action) {
      case 'UNDO':
        this.undo();
        this.showToast('Remote: Undo executed', 'info');
        break;
      case 'REDO':
        this.redo();
        this.showToast('Remote: Redo executed', 'info');
        break;
      case 'TOOL_PEN':
        this.activeTool.set('pen');
        this.isLaserActive.set(false);
        this.showToast('Remote: Pen selected', 'info');
        break;
      case 'TOOL_ERASER':
        this.activeTool.set(this.activeTool() === 'eraser' ? 'pen' : 'eraser');
        this.isLaserActive.set(false);
        this.showToast('Remote: Eraser toggled', 'info');
        break;
      case 'TOOL_SELECT':
        this.activeTool.set('select');
        this.isLaserActive.set(false);
        this.showToast('Remote: Selection tool selected', 'info');
        break;
      case 'TOOL_LASER':
        this.isLaserActive.update((v) => !v);
        if (this.isLaserActive()) {
          this.activeTool.set('laser');
          this.showToast('Remote: Laser Pointer ON', 'info');
        } else {
          this.activeTool.set('select');
          this.showToast('Remote: Laser Pointer OFF', 'info');
        }
        break;
      case 'NEXT_FRAME':
        if (!this.isPresentationMode()) {
          this.togglePresentationMode();
        }
        this.nextFrame();
        this.showToast('Remote: Next Slide', 'info');
        break;
      case 'PREV_FRAME':
        if (!this.isPresentationMode()) {
          this.togglePresentationMode();
        }
        this.prevFrame();
        this.showToast('Remote: Previous Slide', 'info');
        break;
      case 'ZOOM_IN':
        this.zoomIn();
        this.showToast('Remote: Zoomed in', 'info');
        break;
      case 'ZOOM_OUT':
        this.zoomOut();
        this.showToast('Remote: Zoomed out', 'info');
        break;
      case 'RESET_ZOOM':
        this.resetZoom();
        this.showToast('Remote: Zoom reset to 100%', 'info');
        break;
      case 'CLEAR_LASER':
        this.clearLaserMarks();
        this.showToast('Remote: Laser cleared', 'info');
        break;
      case 'TOGGLE_PRESENT':
        this.togglePresentationMode();
        this.showToast('Remote: Presentation mode toggled', 'info');
        break;
      case 'COLOR_SELECT':
        if (payload && typeof payload['color'] === 'string') {
          this.penColor.set(payload['color']);
          this.showToast(`Remote: Color set to ${payload['color']}`, 'info');
        }
        break;
      case 'PING_TEST':
      case 'TEST_SIGNAL':
        this.showToast('📶 Real Note9 S Pen Signal Received!', 'success');
        break;
      case 'LASER_MOVE':
        if (payload && typeof payload['x'] === 'number' && typeof payload['y'] === 'number') {
          this.isLaserActive.set(true);
          const screenX = payload['x'] * (typeof window !== 'undefined' ? window.innerWidth : 1200);
          const screenY = payload['y'] * (typeof window !== 'undefined' ? window.innerHeight : 800);
          this.laserCursorPos.set({ x: screenX, y: screenY });
          const vp = this.currentBoard().viewport;
          const canvasX = (screenX - vp.x) / vp.zoom;
          const canvasY = (screenY - vp.y) / vp.zoom;
          this.addLaserMark({ x: canvasX, y: canvasY, timestamp: Date.now(), color: '#ef4444' });
        }
        break;
      case 'REMOTE_DRAW_START':
        if (payload && typeof payload['x'] === 'number' && typeof payload['y'] === 'number') {
          this.isLaserActive.set(false);
          const vp = this.currentBoard().viewport;
          const screenW = this.isBrowser ? window.innerWidth : 1200;
          const screenH = this.isBrowser ? window.innerHeight : 800;
          const padMarginX = screenW * 0.15;
          const padMarginY = screenH * 0.15;
          const targetScreenW = screenW * 0.70;
          const targetScreenH = screenH * 0.70;

          const screenX = padMarginX + (payload['x'] as number) * targetScreenW;
          const screenY = padMarginY + (payload['y'] as number) * targetScreenH;
          const canvasX = Math.round((screenX - vp.x) / vp.zoom);
          const canvasY = Math.round((screenY - vp.y) / vp.zoom);
          const pressure = typeof payload['pressure'] === 'number' ? payload['pressure'] : 0.5;
          const color = (payload['color'] as string) || this.penColor();
          const width = (payload['width'] as number) || this.strokeWidth();
          const tool = (payload['tool'] as 'pen' | 'pencil' | 'highlighter') || 'pen';
          const strokeId = (payload['strokeId'] as string) || ('spen-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5));

          this.activeTool.set(tool);
          this.penColor.set(color);
          this.strokeWidth.set(width);

          const newStroke: DrawingStroke = {
            id: strokeId,
            points: [{ x: canvasX, y: canvasY, pressure, time: Date.now() }],
            color,
            width,
            opacity: tool === 'highlighter' ? 0.45 : this.penOpacity(),
            tool,
            smoothing: this.strokeSmoothing()
          };
          this.currentStroke.set(newStroke);
          this.isDrawing.set(true);
        }
        break;
      case 'REMOTE_DRAW_MOVE':
        if (payload && typeof payload['x'] === 'number' && typeof payload['y'] === 'number') {
          const vp = this.currentBoard().viewport;
          const screenW = this.isBrowser ? window.innerWidth : 1200;
          const screenH = this.isBrowser ? window.innerHeight : 800;
          const padMarginX = screenW * 0.15;
          const padMarginY = screenH * 0.15;
          const targetScreenW = screenW * 0.70;
          const targetScreenH = screenH * 0.70;

          const screenX = padMarginX + (payload['x'] as number) * targetScreenW;
          const screenY = padMarginY + (payload['y'] as number) * targetScreenH;
          const canvasX = Math.round((screenX - vp.x) / vp.zoom);
          const canvasY = Math.round((screenY - vp.y) / vp.zoom);
          const pressure = typeof payload['pressure'] === 'number' ? payload['pressure'] : 0.5;
          const newPt: DrawingPoint = { x: canvasX, y: canvasY, pressure, time: Date.now() };

          const cur = this.currentStroke();
          if (cur) {
            this.currentStroke.set({
              ...cur,
              points: [...cur.points, newPt]
            });
          } else {
            const tool = (payload['tool'] as 'pen' | 'pencil' | 'highlighter') || 'pen';
            const color = (payload['color'] as string) || this.penColor();
            const width = (payload['width'] as number) || this.strokeWidth();
            const strokeId = (payload['strokeId'] as string) || ('spen-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5));
            this.currentStroke.set({
              id: strokeId,
              points: [newPt],
              color,
              width,
              opacity: tool === 'highlighter' ? 0.45 : this.penOpacity(),
              tool,
              smoothing: this.strokeSmoothing()
            });
            this.isDrawing.set(true);
          }
        }
        break;
      case 'REMOTE_DRAW_END': {
        const strokeToCommit = this.currentStroke();
        if (strokeToCommit && strokeToCommit.points.length > 0) {
          if (!this.processedStrokeIds.has(strokeToCommit.id)) {
            this.processedStrokeIds.add(strokeToCommit.id);
            setTimeout(() => this.processedStrokeIds.delete(strokeToCommit.id), 10000);
            this.addStroke(strokeToCommit);
          }
          this.currentStroke.set(null);
          this.isDrawing.set(false);
        }
        break;
      }
      case 'REMOTE_STROKE_COMMIT': {
        const strokeId = (payload?.['strokeId'] as string) || ('spen-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5));
        if (this.processedStrokeIds.has(strokeId)) {
          break;
        }
        this.processedStrokeIds.add(strokeId);
        setTimeout(() => this.processedStrokeIds.delete(strokeId), 10000);

        const rawPoints = (payload?.['points'] as { x: number; y: number; pressure?: number }[]) || [];
        if (rawPoints.length === 0) {
          this.currentStroke.set(null);
          this.isDrawing.set(false);
          break;
        }

        const vp = this.currentBoard().viewport;
        const screenW = this.isBrowser ? window.innerWidth : 1200;
        const screenH = this.isBrowser ? window.innerHeight : 800;
        const padMarginX = screenW * 0.15;
        const padMarginY = screenH * 0.15;
        const targetScreenW = screenW * 0.70;
        const targetScreenH = screenH * 0.70;

        const canvasPoints: DrawingPoint[] = rawPoints.map((p) => {
          const screenX = padMarginX + p.x * targetScreenW;
          const screenY = padMarginY + p.y * targetScreenH;
          const canvasX = Math.round((screenX - vp.x) / vp.zoom);
          const canvasY = Math.round((screenY - vp.y) / vp.zoom);
          return {
            x: canvasX,
            y: canvasY,
            pressure: p.pressure ?? 0.5,
            time: Date.now()
          };
        });

        const color = (payload?.['color'] as string) || this.penColor();
        const width = (payload?.['width'] as number) || this.strokeWidth();
        const tool = (payload?.['tool'] as 'pen' | 'pencil' | 'highlighter') || 'pen';
        const opacity = (payload?.['opacity'] as number) || (tool === 'highlighter' ? 0.45 : this.penOpacity());

        const stroke: DrawingStroke = {
          id: strokeId,
          points: canvasPoints,
          color,
          width,
          opacity,
          tool,
          smoothing: true
        };

        this.addStroke(stroke);
        this.currentStroke.set(null);
        this.isDrawing.set(false);
        break;
      }
      case 'REMOTE_ERASE':
        if (payload && typeof payload['x'] === 'number' && typeof payload['y'] === 'number') {
          const vp = this.currentBoard().viewport;
          const screenW = this.isBrowser ? window.innerWidth : 1200;
          const screenH = this.isBrowser ? window.innerHeight : 800;
          const padMarginX = screenW * 0.15;
          const padMarginY = screenH * 0.15;
          const targetScreenW = screenW * 0.70;
          const targetScreenH = screenH * 0.70;

          const screenX = padMarginX + (payload['x'] as number) * targetScreenW;
          const screenY = padMarginY + (payload['y'] as number) * targetScreenH;
          const canvasX = Math.round((screenX - vp.x) / vp.zoom);
          const canvasY = Math.round((screenY - vp.y) / vp.zoom);
          this.eraseStrokesAt(canvasX, canvasY, 32);
        }
        break;
      case 'STROKE_WIDTH':
        if (payload && typeof payload['width'] === 'number') {
          this.strokeWidth.set(payload['width']);
          this.showToast(`Stroke width: ${payload['width']}px`, 'info');
        }
        break;
    }
  }

  // --- History Management (Undo / Redo with 100+ depth) ---
  snapshotHistory(): void {
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
