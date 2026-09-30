import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type InputPointerType = 'pen' | 'touch' | 'mouse';

export interface NormalizedInputEvent {
  type: 'down' | 'move' | 'up' | 'cancel';
  originalEvent: PointerEvent;
  canvasX: number;
  canvasY: number;
  pressure: number;
  pointerType: InputPointerType;
  isPrimary: boolean;
  button: number;
}

@Injectable({ providedIn: 'root' })
export class InputService {
  private inputEventsSubject = new Subject<NormalizedInputEvent>();
  inputEvents$ = this.inputEventsSubject.asObservable();

  /**
   * Processes a raw pointer event and emits a normalized event.
   * Handles coordinate translation and pressure normalization.
   */
  processPointerEvent(
    e: PointerEvent,
    element: HTMLElement,
    viewport: { x: number; y: number; zoom: number }
  ): void {
    const rect = element.getBoundingClientRect();
    
    // Calculate position relative to the element
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Transform to canvas coordinates based on the current viewport
    // canvasPoint = (relPoint - viewportTranslate) / viewportZoom
    const canvasX = (relX - viewport.x) / viewport.zoom;
    const canvasY = (relY - viewport.y) / viewport.zoom;

    // Pressure normalization (Palm rejection often starts with pressure/pointerType)
    // Most mice report 0 or 0.5. Stylus reports 0 to 1.
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    const normalizedEvent: NormalizedInputEvent = {
      type: this.mapPointerEventType(e.type),
      originalEvent: e,
      canvasX,
      canvasY,
      pressure,
      pointerType: e.pointerType as InputPointerType,
      isPrimary: e.isPrimary,
      button: e.button
    };

    this.inputEventsSubject.next(normalizedEvent);
  }

  private mapPointerEventType(type: string): 'down' | 'move' | 'up' | 'cancel' {
    if (type.includes('down')) return 'down';
    if (type.includes('move')) return 'move';
    if (type.includes('up')) return 'up';
    return 'cancel';
  }
}
