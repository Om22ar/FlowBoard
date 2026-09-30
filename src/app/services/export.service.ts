import { Injectable, inject } from '@angular/core';
import { WhiteboardStore } from './whiteboard-store';
import { CanvasObject, DrawingStroke } from '../models/whiteboard.models';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly store = inject(WhiteboardStore);

  /**
   * Calculates the bounding box of all strokes and objects on the current board.
   * If empty, returns a default 1920x1080 canvas area.
   */
  getContentBounds(padding = 50): BoundingBox {
    const board = this.store.currentBoard();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasContent = false;

    // Measure strokes
    for (const stroke of board.strokes) {
      const halfW = (stroke.width || 2) / 2;
      for (const pt of stroke.points) {
        hasContent = true;
        if (pt.x - halfW < minX) minX = pt.x - halfW;
        if (pt.x + halfW > maxX) maxX = pt.x + halfW;
        if (pt.y - halfW < minY) minY = pt.y - halfW;
        if (pt.y + halfW > maxY) maxY = pt.y + halfW;
      }
    }

    // Measure objects
    for (const obj of board.objects) {
      hasContent = true;
      const x = obj.x;
      const y = obj.y;
      const w = obj.width || 100;
      const h = obj.height || 100;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    if (!hasContent) {
      return {
        minX: 0,
        minY: 0,
        maxX: 1920,
        maxY: 1080,
        width: 1920,
        height: 1080
      };
    }

    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = Math.max(100, Math.ceil(maxX - minX));
    const height = Math.max(100, Math.ceil(maxY - minY));

    return { minX, minY, maxX, maxY, width, height };
  }

  /**
   * Renders the current whiteboard content to an off-screen HTML5 Canvas.
   */
  renderToCanvas(options?: {
    bounds?: BoundingBox;
    pixelRatio?: number;
    backgroundColor?: string;
  }): HTMLCanvasElement {
    const board = this.store.currentBoard();
    const bounds = options?.bounds || this.getContentBounds(60);
    const pixelRatio = options?.pixelRatio || 2; // High-DPI export
    const bgColor =
      options?.backgroundColor !== undefined
        ? options.backgroundColor
        : board.background === 'dark'
        ? '#121212'
        : '#ffffff';

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(8192, Math.max(200, bounds.width * pixelRatio));
    canvas.height = Math.min(8192, Math.max(200, bounds.height * pixelRatio));

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Scale for high-resolution rendering
    ctx.scale(pixelRatio, pixelRatio);
    ctx.translate(-bounds.minX, -bounds.minY);

    // Draw background
    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    }

    // Optional background pattern grid/dots
    if (board.background === 'dots' || board.background === 'grid') {
      this.drawBackgroundPattern(ctx, bounds, board.background);
    }

    // Draw Objects (sorted by zIndex)
    const sortedObjects = [...board.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const obj of sortedObjects) {
      this.renderObject(ctx, obj);
    }

    // Draw Strokes
    for (const stroke of board.strokes) {
      this.renderStroke(ctx, stroke);
    }

    return canvas;
  }

  private drawBackgroundPattern(ctx: CanvasRenderingContext2D, bounds: BoundingBox, type: 'dots' | 'grid'): void {
    const spacing = 32;
    const startX = Math.floor(bounds.minX / spacing) * spacing;
    const startY = Math.floor(bounds.minY / spacing) * spacing;

    ctx.save();
    if (type === 'dots') {
      ctx.fillStyle = '#cbd5e1';
      for (let x = startX; x <= bounds.maxX; x += spacing) {
        for (let y = startY; y <= bounds.maxY; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'grid') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x <= bounds.maxX; x += spacing) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
      }
      for (let y = startY; y <= bounds.maxY; y += spacing) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderStroke(ctx: CanvasRenderingContext2D, stroke: DrawingStroke): void {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, (stroke.width || 2) / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    if (stroke.smoothing && pts.length > 2) {
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    } else {
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  private renderObject(ctx: CanvasRenderingContext2D, obj: CanvasObject): void {
    ctx.save();
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    if (obj.rotation) {
      ctx.rotate((obj.rotation * Math.PI) / 180);
    }
    ctx.translate(-obj.width / 2, -obj.height / 2);

    ctx.globalAlpha = obj.style.opacity !== undefined ? obj.style.opacity : 1;
    const fill = obj.style.fill || '#ffffff';
    const stroke = obj.style.stroke || '#000000';
    const strokeWidth = obj.style.strokeWidth || 1;

    switch (obj.type) {
      case 'sticky': {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        this.roundRect(ctx, 4, 4, obj.width, obj.height, 8);
        ctx.fill();

        // Note Body
        ctx.fillStyle = fill || '#fef08a';
        ctx.strokeStyle = stroke || '#fde047';
        ctx.lineWidth = strokeWidth;
        this.roundRect(ctx, 0, 0, obj.width, obj.height, 8);
        ctx.fill();
        ctx.stroke();

        // Content
        if (obj.content) {
          ctx.fillStyle = obj.style.textColor || '#1e293b';
          ctx.font = `${obj.style.fontWeight || '500'} ${obj.style.fontSize || 14}px system-ui, sans-serif`;
          this.wrapText(ctx, obj.content, 12, 24, obj.width - 24, (obj.style.fontSize || 14) * 1.3);
        }
        break;
      }

      case 'text': {
        if (obj.content) {
          ctx.fillStyle = obj.style.textColor || stroke || '#0f172a';
          ctx.font = `${obj.style.fontWeight || 'normal'} ${obj.style.fontSize || 18}px ${obj.style.fontFamily || 'system-ui, sans-serif'}`;
          this.wrapText(ctx, obj.content, 0, obj.style.fontSize || 18, obj.width, (obj.style.fontSize || 18) * 1.3);
        }
        break;
      }

      case 'shape': {
        const shapeType = obj.metadata?.shapeType || 'rectangle';
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;

        if (shapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(obj.width / 2, obj.height / 2, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (strokeWidth > 0) ctx.stroke();
        } else if (shapeType === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(obj.width / 2, 0);
          ctx.lineTo(obj.width, obj.height);
          ctx.lineTo(0, obj.height);
          ctx.closePath();
          ctx.fill();
          if (strokeWidth > 0) ctx.stroke();
        } else if (shapeType === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(obj.width / 2, 0);
          ctx.lineTo(obj.width, obj.height / 2);
          ctx.lineTo(obj.width / 2, obj.height);
          ctx.lineTo(0, obj.height / 2);
          ctx.closePath();
          ctx.fill();
          if (strokeWidth > 0) ctx.stroke();
        } else {
          // Rectangle or Rounded-Rect
          const radius = shapeType === 'rounded-rect' ? obj.style.borderRadius || 12 : 0;
          this.roundRect(ctx, 0, 0, obj.width, obj.height, radius);
          ctx.fill();
          if (strokeWidth > 0) ctx.stroke();
        }

        // Shape label / content
        if (obj.content) {
          ctx.fillStyle = obj.style.textColor || '#0f172a';
          ctx.font = `${obj.style.fontSize || 14}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(obj.content, obj.width / 2, obj.height / 2 + 5);
        }
        break;
      }

      default: {
        // Generic box for frames, tasks, etc.
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        this.roundRect(ctx, 0, 0, obj.width, obj.height, 4);
        ctx.fill();
        if (strokeWidth > 0) ctx.stroke();
        if (obj.content) {
          ctx.fillStyle = obj.style.textColor || '#0f172a';
          ctx.font = `13px system-ui, sans-serif`;
          this.wrapText(ctx, obj.content, 8, 20, obj.width - 16, 18);
        }
      }
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (r <= 0) {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const lines = text.split('\n');
    let currentY = y;

    for (const rawLine of lines) {
      const words = rawLine.split(' ');
      let line = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }

  /**
   * Export as high-resolution PNG image download.
   */
  exportAsPng(): void {
    const board = this.store.currentBoard();
    const canvas = this.renderToCanvas({ pixelRatio: 2 });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.sanitizeFilename(board.name)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      this.store.showToast('Exported whiteboard as high-res PNG', 'success');
    }, 'image/png');
  }

  /**
   * Export as clean scalable vector graphics (SVG).
   */
  exportAsSvg(): void {
    const board = this.store.currentBoard();
    const bounds = this.getContentBounds(40);
    const bgColor = board.background === 'dark' ? '#121212' : '#ffffff';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">\n`;
    svg += `  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="${bgColor}" />\n`;

    // 1. Shapes and Objects
    for (const obj of board.objects) {
      const fill = obj.style.fill || '#ffffff';
      const stroke = obj.style.stroke || '#000000';
      const strokeWidth = obj.style.strokeWidth || 1;
      const opacity = obj.style.opacity !== undefined ? obj.style.opacity : 1;
      const rot = obj.rotation ? ` transform="rotate(${obj.rotation} ${obj.x + obj.width / 2} ${obj.y + obj.height / 2})"` : '';

      if (obj.type === 'shape' && obj.metadata?.shapeType === 'circle') {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const r = obj.width / 2;
        svg += `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${rot} />\n`;
      } else if (obj.type === 'shape' && obj.metadata?.shapeType === 'triangle') {
        const points = `${obj.x + obj.width / 2},${obj.y} ${obj.x + obj.width},${obj.y + obj.height} ${obj.x},${obj.y + obj.height}`;
        svg += `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${rot} />\n`;
      } else {
        const rx = obj.style.borderRadius || (obj.type === 'sticky' ? 8 : 0);
        svg += `  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${rot} />\n`;
      }

      if (obj.content) {
        const textX = obj.x + 12;
        const textY = obj.y + 24;
        const fontSize = obj.style.fontSize || 14;
        const textColor = obj.style.textColor || '#0f172a';
        const escaped = this.escapeXml(obj.content);
        svg += `  <text x="${textX}" y="${textY}" font-family="system-ui, sans-serif" font-size="${fontSize}" fill="${textColor}"${rot}>${escaped}</text>\n`;
      }
    }

    // 2. Vector Strokes
    for (const stroke of board.strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      const pts = stroke.points;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x} ${pts[i].y}`;
      }
      svg += `  <path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width || 2}" stroke-linecap="round" stroke-linejoin="round" opacity="${stroke.opacity || 1}" />\n`;
    }

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFilename(board.name)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Exported whiteboard as vector SVG', 'success');
  }

  /**
   * Export as PDF using browser's native canvas export capabilities + printing frame.
   * Generates a clean vector-compatible PDF page matching the board's aspect ratio.
   */
  exportAsPdf(): void {
    const board = this.store.currentBoard();
    const canvas = this.renderToCanvas({ pixelRatio: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png', 1.0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: direct download as PNG with alert or fallback
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${this.escapeXml(board.name)} - FlowBoard PDF Export</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background-color: #ffffff;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .header {
              width: 100%;
              max-width: 1200px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 12px;
              color: #475569;
              font-size: 12px;
            }
            .header h1 {
              font-size: 16px;
              margin: 0;
              color: #0f172a;
            }
            .canvas-img {
              max-width: 100%;
              height: auto;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            @media print {
              .no-print { display: none; }
              body { background: white; }
              .canvas-img { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header no-print">
            <div>
              <h1>${this.escapeXml(board.name)}</h1>
              <span>Exported from FlowBoard · ${new Date().toLocaleDateString()}</span>
            </div>
            <button onclick="window.print()" style="padding: 6px 14px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
              Save / Print PDF
            </button>
          </div>
          <img src="${imgData}" class="canvas-img" alt="${this.escapeXml(board.name)}" />
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    this.store.showToast('Prepared PDF print view with canvas rendering', 'info');
  }

  private sanitizeFilename(name: string): string {
    return (name || 'whiteboard')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
