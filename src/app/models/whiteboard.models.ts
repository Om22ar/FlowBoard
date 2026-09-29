export type ToolType =
  | 'select'
  | 'hand'
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'eraser'
  | 'laser'
  | 'sticky'
  | 'text'
  | 'shape'
  | 'connector'
  | 'arrow'
  | 'mindmap'
  | 'frame'
  | 'task'
  | 'table'
  | 'code'
  | 'comment';

export type CanvasObjectType =
  | 'sticky'
  | 'text'
  | 'shape'
  | 'connector'
  | 'mindmap'
  | 'frame'
  | 'task'
  | 'table'
  | 'code'
  | 'comment'
  | 'image';

export type ShapeType =
  | 'rectangle'
  | 'rounded-rect'
  | 'circle'
  | 'diamond'
  | 'cloud'
  | 'triangle'
  | 'star'
  | 'cylinder';

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  opacity: number;
  tool: 'pen' | 'pencil' | 'highlighter' | 'eraser';
  smoothing: boolean;
}

export interface ObjectStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  borderRadius?: number;
  shadow?: boolean;
}

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
  groupId?: string;
  style: ObjectStyle;
  content?: string;
  metadata?: {
    shapeType?: ShapeType;
    // Connectors
    fromId?: string;
    toId?: string;
    fromPoint?: { x: number; y: number; anchor?: string };
    toPoint?: { x: number; y: number; anchor?: string };
    arrowStart?: boolean;
    arrowEnd?: boolean;
    connectorType?: 'curved' | 'straight' | 'orthogonal';
    // Mind Map
    parentId?: string;
    childIds?: string[];
    isRoot?: boolean;
    collapsed?: boolean;
    branchColor?: string;
    // Frames
    frameNumber?: number;
    frameTitle?: string;
    // Task / Checklist
    completed?: boolean;
    statusText?: string;
    statusColor?: string;
    dueDate?: string;
    assignee?: string;
    checklistItems?: { id: string; text: string; done: boolean }[];
    // Table
    rows?: number;
    cols?: number;
    tableData?: string[][];
    // Code
    codeLanguage?: string;
    // Comment
    author?: string;
    avatar?: string;
    resolved?: boolean;
    createdAt?: string;
    replies?: { id: string; author: string; text: string; time: string }[];
  };
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number; // 0.1 to 4.0
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  avatar: string;
}

export interface Whiteboard {
  id: string;
  name: string;
  ownerId: string;
  objects: CanvasObject[];
  strokes: DrawingStroke[];
  viewport: Viewport;
  background: 'dots' | 'grid' | 'blank' | 'dark';
  collaborators: Collaborator[];
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export type CompanionAction =
  | 'UNDO'
  | 'REDO'
  | 'TOOL_PEN'
  | 'TOOL_ERASER'
  | 'TOOL_SELECT'
  | 'TOOL_LASER'
  | 'NEXT_FRAME'
  | 'PREV_FRAME'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_ZOOM'
  | 'CLEAR_LASER'
  | 'TOGGLE_PRESENT'
  | 'COLOR_SELECT';

export interface SPenMappings {
  singlePress: CompanionAction;
  doublePress: CompanionAction;
  longPress: CompanionAction;
  airLeft: CompanionAction;
  airRight: CompanionAction;
  airUp: CompanionAction;
  airDown: CompanionAction;
  shake: CompanionAction;
}

export interface CompanionState {
  connected: boolean;
  pairingCode: string;
  deviceName: string;
  phoneBattery: number;
  spenBattery: number;
  signalStrength: number;
  latencyMs: number;
  lastPing: number;
}

export interface LaserMark {
  x: number;
  y: number;
  timestamp: number;
  color: string;
}
