import { CanvasDOMManager, StaticCanvasDOMManager } from 'fabric';

interface GuardedDOMManager {
  lower?: { el?: HTMLCanvasElement };
  upper?: { el?: HTMLCanvasElement };
  container?: HTMLDivElement;
}

let isPatched = false;

/**
 * Defensive monkey-patch for Fabric.js v6 Canvas DOM managers.
 * Prevents "Cannot destructure property 'el' of 'this.lower' as it is undefined"
 * when canvases are disposed or cleaned up during Angular lifecycle changes or window resizing.
 */
export function ensureFabricDOMGuards(): void {
  if (isPatched) return;
  isPatched = true;

  try {
    const origStaticCleanup = StaticCanvasDOMManager.prototype.cleanupDOM;
    StaticCanvasDOMManager.prototype.cleanupDOM = function (this: GuardedDOMManager, ...args: Parameters<typeof origStaticCleanup>) {
      if (!this.lower?.el) return;
      return origStaticCleanup.apply(this as unknown as StaticCanvasDOMManager, args);
    };

    const origCanvasCleanup = CanvasDOMManager.prototype.cleanupDOM;
    CanvasDOMManager.prototype.cleanupDOM = function (this: GuardedDOMManager, ...args: Parameters<typeof origCanvasCleanup>) {
      if (!this.lower?.el || !this.upper?.el || !this.container) return;
      return origCanvasCleanup.apply(this as unknown as CanvasDOMManager, args);
    };

    const origStaticSetDim = StaticCanvasDOMManager.prototype.setDimensions;
    StaticCanvasDOMManager.prototype.setDimensions = function (this: GuardedDOMManager, ...args: Parameters<typeof origStaticSetDim>) {
      if (!this.lower?.el) return;
      return origStaticSetDim.apply(this as unknown as StaticCanvasDOMManager, args);
    };

    const origCanvasSetDim = CanvasDOMManager.prototype.setDimensions;
    CanvasDOMManager.prototype.setDimensions = function (this: GuardedDOMManager, ...args: Parameters<typeof origCanvasSetDim>) {
      if (!this.lower?.el || !this.upper?.el) return;
      return origCanvasSetDim.apply(this as unknown as CanvasDOMManager, args);
    };

    const origStaticSetCSS = StaticCanvasDOMManager.prototype.setCSSDimensions;
    StaticCanvasDOMManager.prototype.setCSSDimensions = function (this: GuardedDOMManager, ...args: Parameters<typeof origStaticSetCSS>) {
      if (!this.lower?.el) return;
      return origStaticSetCSS.apply(this as unknown as StaticCanvasDOMManager, args);
    };

    const origCanvasSetCSS = CanvasDOMManager.prototype.setCSSDimensions;
    CanvasDOMManager.prototype.setCSSDimensions = function (this: GuardedDOMManager, ...args: Parameters<typeof origCanvasSetCSS>) {
      if (!this.lower?.el || !this.upper?.el || !this.container) return;
      return origCanvasSetCSS.apply(this as unknown as CanvasDOMManager, args);
    };

    const origCalcOffset = StaticCanvasDOMManager.prototype.calcOffset;
    StaticCanvasDOMManager.prototype.calcOffset = function (this: GuardedDOMManager, ...args: Parameters<typeof origCalcOffset>) {
      if (!this.lower?.el) return { left: 0, top: 0 };
      return origCalcOffset.apply(this as unknown as StaticCanvasDOMManager, args);
    };

    const origStaticDispose = StaticCanvasDOMManager.prototype.dispose;
    StaticCanvasDOMManager.prototype.dispose = function (this: GuardedDOMManager, ...args: Parameters<typeof origStaticDispose>) {
      if (!this.lower?.el) return;
      return origStaticDispose.apply(this as unknown as StaticCanvasDOMManager, args);
    };

    const origCanvasDispose = CanvasDOMManager.prototype.dispose;
    CanvasDOMManager.prototype.dispose = function (this: GuardedDOMManager, ...args: Parameters<typeof origCanvasDispose>) {
      if (!this.upper?.el) {
        if (this.lower?.el) {
          StaticCanvasDOMManager.prototype.dispose.apply(this as unknown as StaticCanvasDOMManager, args);
        }
        return;
      }
      return origCanvasDispose.apply(this as unknown as CanvasDOMManager, args);
    };
  } catch (err) {
    console.warn('Failed to patch Fabric.js DOM Managers:', err);
  }
}
