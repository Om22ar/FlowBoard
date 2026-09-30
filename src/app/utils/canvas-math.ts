import { CanvasObject, DrawingPoint } from '../models/whiteboard.models';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectorPoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathData: string;
}

/**
 * Calculates anchor point center on any side of an object
 */
export function getObjectAnchorPoint(
  obj: CanvasObject,
  preferredSide: 'auto' | 'top' | 'bottom' | 'left' | 'right' = 'auto',
  targetPoint?: { x: number; y: number }
): { x: number; y: number; side: string } {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  if (preferredSide === 'auto' && targetPoint) {
    const dx = targetPoint.x - cx;
    const dy = targetPoint.y - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0
        ? { x: obj.x + obj.width, y: cy, side: 'right' }
        : { x: obj.x, y: cy, side: 'left' };
    } else {
      return dy > 0
        ? { x: cx, y: obj.y + obj.height, side: 'bottom' }
        : { x: cx, y: obj.y, side: 'top' };
    }
  }

  switch (preferredSide) {
    case 'top':
      return { x: cx, y: obj.y, side: 'top' };
    case 'bottom':
      return { x: cx, y: obj.y + obj.height, side: 'bottom' };
    case 'left':
      return { x: obj.x, y: cy, side: 'left' };
    case 'right':
      return { x: obj.x + obj.width, y: cy, side: 'right' };
    default:
      return { x: cx, y: cy, side: 'center' };
  }
}

/**
 * Computes SVG path for connectors between two objects or points
 */
export function computeConnectorPath(
  fromObj?: CanvasObject,
  toObj?: CanvasObject,
  fromPt?: { x: number; y: number },
  toPt?: { x: number; y: number },
  type: 'curved' | 'straight' | 'orthogonal' = 'straight'
): ConnectorPoints {
  let startX = fromPt?.x ?? 0;
  let startY = fromPt?.y ?? 0;
  let endX = toPt?.x ?? 0;
  let endY = toPt?.y ?? 0;

  if (fromObj && toObj) {
    const startAnchor = getObjectAnchorPoint(fromObj, 'auto', {
      x: toObj.x + toObj.width / 2,
      y: toObj.y + toObj.height / 2
    });
    const endAnchor = getObjectAnchorPoint(toObj, 'auto', {
      x: fromObj.x + fromObj.width / 2,
      y: fromObj.y + fromObj.height / 2
    });
    startX = startAnchor.x;
    startY = startAnchor.y;
    endX = endAnchor.x;
    endY = endAnchor.y;
  } else if (fromObj && toPt) {
    const startAnchor = getObjectAnchorPoint(fromObj, 'auto', toPt);
    startX = startAnchor.x;
    startY = startAnchor.y;
  } else if (toObj && fromPt) {
    const endAnchor = getObjectAnchorPoint(toObj, 'auto', fromPt);
    endX = endAnchor.x;
    endY = endAnchor.y;
  }

  let pathData = '';
  if (type === 'straight') {
    pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
  } else if (type === 'curved') {
    const dx = endX - startX;
    const cx1 = startX + dx * 0.5;
    const cy1 = startY;
    const cx2 = startX + dx * 0.5;
    const cy2 = endY;
    pathData = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
  } else {
    // Orthogonal / elbow
    const midX = (startX + endX) / 2;
    pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  }

  return { startX, startY, endX, endY, pathData };
}

/**
 * Draws smooth handwriting strokes using quadratic curves and pressure
 */
export function renderStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  points: DrawingPoint[],
  color: string,
  baseWidth: number,
  opacity: number,
  tool: 'pen' | 'pencil' | 'highlighter' | 'eraser',
  smoothing = true
): void {
  if (points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = baseWidth * 2;
  } else if (tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity * 0.45;
    ctx.lineWidth = baseWidth * 3.5;
    ctx.lineCap = 'square';
  } else if (tool === 'pencil') {
    ctx.globalAlpha = opacity * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, baseWidth * 0.8);
  } else {
    // Standard Pen
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
  }

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (!smoothing || points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Smooth curves with pressure-responsive segments
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    const mid1X = (p0.x + p1.x) / 2;
    const mid1Y = (p0.y + p1.y) / 2;
    const mid2X = (p1.x + p2.x) / 2;
    const mid2Y = (p1.y + p2.y) / 2;

    const pressure = p1.pressure ?? 0.5;
    const dynamicWidth =
      tool === 'highlighter'
        ? baseWidth * 3.5
        : Math.max(1, baseWidth * (0.4 + pressure * 1.2));

    ctx.lineWidth = dynamicWidth;
    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Converts drawing stroke points into a smooth SVG Path string for instant vector rendering
 */
export function pointsToSvgPath(points: DrawingPoint[], smoothing = true): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x - 1} ${p.y} A 1 1 0 1 0 ${p.x + 1} ${p.y} Z`;
  }
  if (!smoothing || points.length === 2) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
