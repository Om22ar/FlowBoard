import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { CompanionSyncService } from '../services/companion-sync.service';
import { generateQrSvg } from '../utils/qr-code';
import { CompanionAction } from '../models/whiteboard.models';

@Component({
  selector: 'app-galaxy-companion-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showCompanionModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <mat-icon class="text-xl">smartphone</mat-icon>
              </div>
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  Connect Galaxy Note9 Companion
                  @if (store.companionState().connected) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Waiting to Pair
                    </span>
                  }
                </h3>
                <p class="text-xs text-neutral-500">
                  Wireless S Pen Remote Control for FlowBoard on Windows 10
                </p>
              </div>
            </div>
            <button
              (click)="store.showCompanionModal.set(false)"
              class="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Hardware Architecture Notice (Transparency about Bluetooth vs Stylus) -->
          <div class="px-6 py-3 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <mat-icon class="text-base text-blue-600 shrink-0 mt-0.5">info</mat-icon>
            <div>
              <span class="font-semibold">Hardware Synergy Workflow:</span>
              The Galaxy Note9 acts as an ultra-low-latency remote command companion (S Pen button clicks, Air Gestures &amp; shortcut buttons) over Wi-Fi / WebSocket.
              Direct handwriting &amp; drawing is performed on your Windows 10 touchscreen or Windows pen with pressure sensitivity.
            </div>
          </div>

          <!-- Content Body -->
          <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <!-- Pairing Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <!-- QR Code & 6-digit Code -->
              <div class="flex flex-col items-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center">
                <div class="w-44 h-44 bg-white p-2 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-center" [innerHTML]="qrSvg()"></div>

                <div class="mt-3">
                  <div class="text-[11px] font-semibold text-neutral-400 tracking-wider">PAIRING PIN</div>
                  <div class="text-2xl font-mono font-bold tracking-widest text-neutral-900 dark:text-neutral-100">
                    {{ store.companionState().pairingCode }}
                  </div>
                </div>

                <div class="mt-2 text-[11px] text-neutral-500">
                  Scan with your Galaxy Note9 camera or open companion URL on same Wi-Fi
                </div>
              </div>

              <!-- Connection Status & Hardware Telemetry -->
              <div class="space-y-4">
                <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 space-y-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">Device</span>
                    <span class="font-semibold text-neutral-800 dark:text-neutral-200">{{ store.companionState().deviceName }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">Link Protocol</span>
                    <span class="font-mono text-emerald-600 dark:text-emerald-400 font-medium">WebSocket / SSE ({{ store.companionState().latencyMs }}ms)</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">Phone Battery</span>
                    <div class="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                      <mat-icon class="text-sm text-emerald-500">battery_full</mat-icon>
                      <span>{{ store.companionState().phoneBattery }}%</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">S Pen BLE Battery</span>
                    <div class="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                      <mat-icon class="text-sm text-blue-500">edit</mat-icon>
                      <span>{{ store.companionState().spenBattery }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Simulate / Action buttons -->
                <div class="flex flex-col gap-2">
                  @if (!store.companionState().connected) {
                    <button
                      (click)="companionService.simulateConnectDevice()"
                      class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <mat-icon class="text-sm">phonelink</mat-icon>
                      <span>Simulate Note9 Pairing Now</span>
                    </button>
                  } @else {
                    <div class="flex gap-2">
                      <button
                        (click)="openSimulator()"
                        class="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-sm">mobile_screen_share</mat-icon>
                        <span>Open Note9 Remote</span>
                      </button>
                      <button
                        (click)="companionService.disconnectDevice()"
                        class="py-2 px-3 border border-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-medium transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  }

                  <button
                    (click)="copyPairingLink()"
                    class="w-full py-2 px-3 border border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <mat-icon class="text-sm">content_copy</mat-icon>
                    <span>{{ copyFeedback() || 'Copy Direct Companion Web Link' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- S Pen Button Mappings Configuration -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <mat-icon class="text-base text-blue-600">tune</mat-icon>
                  Configure S Pen Button &amp; Gesture Mappings
                </h4>
                <button
                  (click)="resetDefaultMappings()"
                  class="text-[11px] text-blue-600 hover:underline"
                >
                  Reset Defaults
                </button>
              </div>

              <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700 text-xs">
                <!-- Single Press -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-[10px]">1x</span>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Single Press</div>
                      <div class="text-[11px] text-neutral-500">Click physical S Pen button once</div>
                    </div>
                  </div>
                  <select
                    [value]="store.spenMappings().singlePress"
                    (change)="updateMapping('singlePress', $event)"
                    class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    @for (act of availableActions; track act.id) {
                      <option [value]="act.id">{{ act.label }}</option>
                    }
                  </select>
                </div>

                <!-- Double Press -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-[10px]">2x</span>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Double Press</div>
                      <div class="text-[11px] text-neutral-500">Quick double-click S Pen button</div>
                    </div>
                  </div>
                  <select
                    [value]="store.spenMappings().doublePress"
                    (change)="updateMapping('doublePress', $event)"
                    class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    @for (act of availableActions; track act.id) {
                      <option [value]="act.id">{{ act.label }}</option>
                    }
                  </select>
                </div>

                <!-- Long Press -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-[10px]">Hold</span>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Long Press</div>
                      <div class="text-[11px] text-neutral-500">Hold button down for 0.6s</div>
                    </div>
                  </div>
                  <select
                    [value]="store.spenMappings().longPress"
                    (change)="updateMapping('longPress', $event)"
                    class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    @for (act of availableActions; track act.id) {
                      <option [value]="act.id">{{ act.label }}</option>
                    }
                  </select>
                </div>

                <!-- Air Gesture Left / Right -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-base text-neutral-500">swap_horiz</mat-icon>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Air Gesture Left / Right</div>
                      <div class="text-[11px] text-neutral-500">Flick S Pen sideways in air</div>
                    </div>
                  </div>
                  <span class="text-neutral-500 font-medium">Previous / Next Frame</span>
                </div>

                <!-- Air Gesture Up / Down -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-base text-neutral-500">swap_vert</mat-icon>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Air Gesture Up / Down</div>
                      <div class="text-[11px] text-neutral-500">Flick S Pen vertically in air</div>
                    </div>
                  </div>
                  <span class="text-neutral-500 font-medium">Zoom In / Zoom Out</span>
                </div>

                <!-- Shake Gesture -->
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-base text-neutral-500">vibration</mat-icon>
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">Shake Gesture</div>
                      <div class="text-[11px] text-neutral-500">Rapid shake while holding button</div>
                    </div>
                  </div>
                  <span class="text-neutral-500 font-medium">Clear Temporary Laser Marks</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span class="text-xs text-neutral-500">
              FlowBoard S Pen Engine 2.4 · Windows 10 Touchscreen Compatible
            </span>
            <button
              (click)="store.showCompanionModal.set(false)"
              class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class GalaxyCompanionModal {
  readonly store = inject(WhiteboardStore);
  readonly companionService = inject(CompanionSyncService);
  readonly copyFeedback = signal<string>('');

  readonly qrSvg = computed(() => {
    const url = this.companionService.pairingUrl() || `https://flowboard.local/pair?code=${this.store.companionState().pairingCode}`;
    return generateQrSvg(url, 160);
  });

  readonly availableActions: { id: CompanionAction; label: string }[] = [
    { id: 'UNDO', label: 'Undo Action' },
    { id: 'REDO', label: 'Redo Action' },
    { id: 'TOOL_PEN', label: 'Switch to Pen' },
    { id: 'TOOL_ERASER', label: 'Toggle Pen / Eraser' },
    { id: 'TOOL_SELECT', label: 'Select Tool' },
    { id: 'TOOL_LASER', label: 'Laser Pointer Mode' },
    { id: 'NEXT_FRAME', label: 'Next Presentation Frame' },
    { id: 'PREV_FRAME', label: 'Previous Presentation Frame' },
    { id: 'ZOOM_IN', label: 'Zoom In' },
    { id: 'ZOOM_OUT', label: 'Zoom Out' },
    { id: 'RESET_ZOOM', label: 'Reset Zoom (100%)' },
    { id: 'CLEAR_LASER', label: 'Clear Laser Marks' },
    { id: 'TOGGLE_PRESENT', label: 'Toggle Presentation' }
  ];

  updateMapping(key: string, event: Event): void {
    const val = (event.target as HTMLSelectElement).value as CompanionAction;
    this.store.spenMappings.update((m) => ({ ...m, [key]: val }));
  }

  resetDefaultMappings(): void {
    this.store.spenMappings.set({
      singlePress: 'UNDO',
      doublePress: 'TOOL_ERASER',
      longPress: 'TOOL_LASER',
      airLeft: 'PREV_FRAME',
      airRight: 'NEXT_FRAME',
      airUp: 'ZOOM_IN',
      airDown: 'ZOOM_OUT',
      shake: 'CLEAR_LASER'
    });
  }

  copyPairingLink(): void {
    const url = this.companionService.pairingUrl() || window.location.href;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      this.copyFeedback.set('Link Copied to Clipboard!');
      setTimeout(() => this.copyFeedback.set(''), 2500);
    }
  }

  openSimulator(): void {
    this.store.showCompanionModal.set(false);
    this.store.showSimulatedPhone.set(true);
  }
}
