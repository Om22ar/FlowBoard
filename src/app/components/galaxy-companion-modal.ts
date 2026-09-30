import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { CompanionSyncService } from '../services/companion-sync.service';
import { WebSocketGatewayService } from '../services/websocket-gateway.service';
import { generateQrSvg } from '../utils/qr-code';
import { CompanionAction } from '../models/whiteboard.models';

@Component({
  selector: 'app-galaxy-companion-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showCompanionModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <mat-icon class="text-xl">phonelink</mat-icon>
              </div>
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  Pen &amp; Hardware Connection Diagnostics
                  @if (store.companionState().connected) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Note9 Connected
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Ready to Pair
                    </span>
                  }
                </h3>
                <p class="text-xs text-neutral-500">
                  Real-time status for Galaxy Note9 S Pen Remote and Windows Touchscreen Stylus
                </p>
              </div>
            </div>

            <button
              (click)="store.showCompanionModal.set(false)"
              class="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Navigation Tabs -->
          <div class="px-6 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
            <button
              (click)="activeTab.set('remote')"
              class="py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer"
              [class.border-blue-600]="activeTab() === 'remote'"
              [class.text-blue-600]="activeTab() === 'remote'"
              [class.dark:text-blue-400]="activeTab() === 'remote'"
              [class.border-transparent]="activeTab() !== 'remote'"
              [class.text-neutral-500]="activeTab() !== 'remote'"
            >
              <mat-icon class="text-sm">smartphone</mat-icon>
              <span>Galaxy Note9 Companion (Remote S Pen)</span>
            </button>

            <button
              (click)="activeTab.set('stylus')"
              class="py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer"
              [class.border-blue-600]="activeTab() === 'stylus'"
              [class.text-blue-600]="activeTab() === 'stylus'"
              [class.dark:text-blue-400]="activeTab() === 'stylus'"
              [class.border-transparent]="activeTab() !== 'stylus'"
              [class.text-neutral-500]="activeTab() !== 'stylus'"
            >
              <mat-icon class="text-sm">gesture</mat-icon>
              <span>Windows Laptop Stylus Hardware (Direct Drawing)</span>
              @if (store.hardwareStylus().detected) {
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              }
            </button>
          </div>

          <!-- TAB 1: GALAXY NOTE9 COMPANION REMOTE -->
          @if (activeTab() === 'remote') {
            <div class="p-6 space-y-5 overflow-y-auto flex-1">
              <!-- Real Status & Diagnostics Banner -->
              <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-3 h-3 rounded-full"
                      [class.bg-emerald-500]="store.companionState().connected"
                      [class.animate-pulse]="store.companionState().connected"
                      [class.bg-amber-500]="!store.companionState().connected"
                    ></div>
                    <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {{ store.companionState().connected ? 'Live Companion Link Active' : 'Waiting for Galaxy Note9 to Connect' }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      (click)="runPingTest()"
                      [disabled]="isPinging()"
                      class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <mat-icon class="text-xs" [class.animate-spin]="isPinging()">network_check</mat-icon>
                      <span>{{ isPinging() ? 'Measuring...' : 'Test Connection Ping' }}</span>
                    </button>

                    <button
                      (click)="openCompanionWindow()"
                      class="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                      title="Open Companion Remote in a new browser window to test side-by-side"
                    >
                      <mat-icon class="text-xs">open_in_new</mat-icon>
                      <span>Open Remote in New Tab</span>
                    </button>
                  </div>
                </div>

                <!-- Real Ping Test Telemetry Output -->
                @if (store.connectionTestResult(); as result) {
                  <div class="p-2.5 rounded-lg text-xs font-mono flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-neutral-500">REAL PING:</span>
                      <span
                        class="font-bold"
                        [class.text-emerald-600]="result.status === 'connected'"
                        [class.dark:text-emerald-400]="result.status === 'connected'"
                        [class.text-amber-500]="result.status === 'testing'"
                        [class.text-rose-500]="result.status === 'error'"
                      >
                        {{ result.status === 'testing' ? 'Testing...' : result.roundTripMs > 0 ? result.roundTripMs + ' ms Roundtrip' : 'Not tested yet' }}
                      </span>
                    </div>

                    <span class="text-[11px] text-neutral-400">
                      {{ result.testedAt ? 'Checked at ' + result.testedAt : 'Click "Test Connection Ping"' }}
                    </span>
                  </div>
                }
              </div>

              <!-- Two Column: Pairing Ways + Device Telemetry -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                <!-- QR Code & Direct Pairing PIN -->
                <div class="flex flex-col items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center">
                  <div>
                    <div class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Scan with Galaxy Note9 Camera
                    </div>
                    <div
                      class="w-40 h-40 bg-white p-2 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-center mx-auto"
                      [innerHTML]="qrSvg()"
                    ></div>
                  </div>

                  <div class="mt-3 w-full">
                    <div class="text-[10px] text-neutral-500 uppercase tracking-wider">Pairing PIN</div>
                    <div class="text-2xl font-mono font-bold tracking-widest text-neutral-900 dark:text-neutral-100">
                      {{ store.companionState().pairingCode }}
                    </div>

                    <div class="flex items-center justify-center gap-1.5 mt-2">
                      <button
                        (click)="copyPairingLink()"
                        class="px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md border border-neutral-300 dark:border-neutral-600 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-xs">content_copy</mat-icon>
                        <span>{{ copyFeedback() || 'Copy Mobile Link' }}</span>
                      </button>

                      <button
                        (click)="companionService.simulateConnectDevice()"
                        class="px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md border border-blue-200 dark:border-blue-900 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-xs">bolt</mat-icon>
                        <span>Auto-Connect</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Device Telemetry & Pairing Form -->
                <div class="flex flex-col justify-between p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                  <div>
                    <div class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3">
                      Connection Parameters
                    </div>

                    <div class="space-y-2 text-xs">
                      <div class="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-700/60">
                        <span class="text-neutral-500">Device Model</span>
                        <span class="font-semibold text-neutral-800 dark:text-neutral-200">{{ store.companionState().deviceName }}</span>
                      </div>
                      <div class="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-700/60">
                        <span class="text-neutral-500">Gateway Transport</span>
                        <div class="flex items-center gap-1.5">
                          @if (wsGateway.isConnected()) {
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="font-mono text-emerald-600 dark:text-emerald-400 font-bold">WebSocket Gateway (Active)</span>
                          } @else {
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span class="font-mono text-amber-600 dark:text-amber-400 font-medium">WS {{ wsGateway.connectionStatus() }}</span>
                          }
                        </div>
                      </div>
                      <div class="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-700/60">
                        <span class="text-neutral-500">Gateway Packets</span>
                        <span class="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                          TX: {{ wsGateway.txPackets() }} · RX: {{ wsGateway.rxPackets() }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-700/60">
                        <span class="text-neutral-500">Phone Battery</span>
                        <div class="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                          <mat-icon class="text-xs text-emerald-500">battery_std</mat-icon>
                          <span>{{ store.companionState().phoneBattery }}%</span>
                        </div>
                      </div>
                      <div class="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-700/60">
                        <span class="text-neutral-500">S Pen BLE Battery</span>
                        <div class="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                          <mat-icon class="text-xs text-blue-500">edit</mat-icon>
                          <span>{{ store.companionState().spenBattery }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Connect by Code Input -->
                  <div class="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1.5">
                    <div class="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
                      Connect via Specific 6-Digit PIN
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        [value]="customInputCode()"
                        (input)="onCustomCodeInput($event)"
                        placeholder="e.g. 839-204"
                        maxlength="7"
                        class="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                      />
                      <button
                        (click)="submitCustomCode()"
                        class="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Pair
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Real-Time Event Terminal Log -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <mat-icon class="text-sm text-emerald-500">terminal</mat-icon>
                    Live Incoming Event Log (Real-time telemetry)
                  </h4>
                  <span class="text-[10px] text-neutral-400">Captures remote commands, S Pen clicks &amp; pings</span>
                </div>

                <div class="h-28 bg-neutral-950 text-neutral-300 font-mono text-[11px] p-2.5 rounded-xl border border-neutral-800 overflow-y-auto space-y-1">
                  @for (log of store.connectionLogs(); track log.id) {
                    <div class="flex items-start justify-between gap-2 border-b border-neutral-900/80 pb-1">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0 uppercase">
                          {{ log.source }}
                        </span>
                        <span class="truncate" [class.text-emerald-400]="log.success" [class.text-rose-400]="!log.success">
                          {{ log.action }}
                        </span>
                      </div>
                      <span class="text-[9px] text-neutral-500 shrink-0 font-mono">{{ log.time }}</span>
                    </div>
                  }
                  @if (store.connectionLogs().length === 0) {
                    <div class="text-neutral-600 text-center py-4">No events received yet.</div>
                  }
                </div>
              </div>

              <!-- S Pen Button Mappings Configuration -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <mat-icon class="text-sm text-blue-600">tune</mat-icon>
                    S Pen Remote Actions Mapping
                  </h4>
                  <button
                    (click)="resetDefaultMappings()"
                    class="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700 text-xs">
                  <div class="p-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">1x</span>
                      <span class="font-medium text-neutral-800 dark:text-neutral-200">S Pen Single Press</span>
                    </div>
                    <select
                      [value]="store.spenMappings().singlePress"
                      (change)="updateMapping('singlePress', $event)"
                      class="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs"
                    >
                      @for (act of availableActions; track act.id) {
                        <option [value]="act.id">{{ act.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="p-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">2x</span>
                      <span class="font-medium text-neutral-800 dark:text-neutral-200">S Pen Double Press</span>
                    </div>
                    <select
                      [value]="store.spenMappings().doublePress"
                      (change)="updateMapping('doublePress', $event)"
                      class="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs"
                    >
                      @for (act of availableActions; track act.id) {
                        <option [value]="act.id">{{ act.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="p-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center font-bold text-[10px]">Hold</span>
                      <span class="font-medium text-neutral-800 dark:text-neutral-200">S Pen Long Press</span>
                    </div>
                    <select
                      [value]="store.spenMappings().longPress"
                      (change)="updateMapping('longPress', $event)"
                      class="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs"
                    >
                      @for (act of availableActions; track act.id) {
                        <option [value]="act.id">{{ act.label }}</option>
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: WINDOWS LAPTOP STYLUS HARDWARE (DIRECT DRAWING) -->
          @if (activeTab() === 'stylus') {
            <div class="p-6 space-y-5 overflow-y-auto flex-1">
              <!-- Explanation Notice -->
              <div class="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <mat-icon class="text-base text-blue-600 shrink-0 mt-0.5">info</mat-icon>
                <div>
                  <span class="font-bold">Windows 10 Hardware Stylus Architecture:</span>
                  Direct stylus drawing, handwriting, and pressure sensitivity are executed directly on your Windows 10 touchscreen laptop via native browser Pointer Events.
                  The Galaxy Note9 acts as a companion remote control. Test your physical pen below!
                </div>
              </div>

              <!-- Live Hardware Sensors Readout -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div class="text-[10px] text-neutral-400 uppercase font-bold">Pointer Type</div>
                  <div class="text-sm font-mono font-bold mt-1 text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-1">
                    <mat-icon class="text-xs text-blue-500">
                      {{ store.hardwareStylus().pointerType === 'pen' ? 'edit' : store.hardwareStylus().pointerType === 'touch' ? 'touch_app' : 'mouse' }}
                    </mat-icon>
                    <span>{{ store.hardwareStylus().pointerType.toUpperCase() }}</span>
                  </div>
                </div>

                <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div class="text-[10px] text-neutral-400 uppercase font-bold">Real Pressure</div>
                  <div class="text-sm font-mono font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {{ Math.round(store.hardwareStylus().pressure * 100) }}% ({{ store.hardwareStylus().pressure }})
                  </div>
                </div>

                <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div class="text-[10px] text-neutral-400 uppercase font-bold">Tilt (X / Y)</div>
                  <div class="text-sm font-mono font-bold mt-1 text-neutral-700 dark:text-neutral-300">
                    {{ store.hardwareStylus().tiltX }}° / {{ store.hardwareStylus().tiltY }}°
                  </div>
                </div>

                <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div class="text-[10px] text-neutral-400 uppercase font-bold">Barrel Button</div>
                  <div class="text-sm font-mono font-bold mt-1" [class.text-purple-600]="store.hardwareStylus().barrelButton">
                    {{ store.hardwareStylus().barrelButton ? 'PRESSED' : 'RELEASED' }}
                  </div>
                </div>
              </div>

              <!-- Pressure Gauge Meter Bar -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-neutral-600 dark:text-neutral-400">Live Hardware Pressure Meter:</span>
                  <span class="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                    {{ Math.round(store.hardwareStylus().pressure * 100) }}%
                  </span>
                </div>
                <div class="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-300 dark:border-neutral-700">
                  <div
                    class="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 rounded-full transition-all duration-75"
                    [style.width.%]="store.hardwareStylus().pressure * 100"
                  ></div>
                </div>
              </div>

              <!-- Interactive Stylus Hardware Test Canvas Pad -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <mat-icon class="text-sm text-blue-600">draw</mat-icon>
                    Interactive Stylus Test &amp; Calibration Pad
                  </h4>
                  <button
                    (click)="clearTestPad()"
                    class="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Clear Test Pad
                  </button>
                </div>

                <div class="relative w-full h-44 bg-white dark:bg-neutral-950 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 overflow-hidden touch-none flex flex-col justify-end">
                  <canvas
                    #testCanvas
                    class="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    (pointerdown)="onTestPointerDown($event)"
                    (pointermove)="onTestPointerMove($event)"
                    (pointerup)="onTestPointerUp()"
                    (pointercancel)="onTestPointerUp()"
                  ></canvas>

                  <div class="relative z-10 p-2 text-center text-[11px] text-neutral-400 pointer-events-none bg-neutral-100/70 dark:bg-neutral-900/70 backdrop-blur-xs border-t border-neutral-200 dark:border-neutral-800">
                    Touch, draw, or press your physical stylus here to verify pressure sensitivity &amp; palm rejection
                  </div>
                </div>
              </div>

              <!-- Auto-switch Toggle -->
              <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <div>
                  <div class="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Auto-switch to Pen Tool on Stylus Contact
                  </div>
                  <div class="text-[11px] text-neutral-500">
                    Automatically activates freehand pen drawing when a physical stylus touches the screen
                  </div>
                </div>
                <input
                  type="checkbox"
                  [checked]="store.autoSwitchToPenOnStylus()"
                  (change)="toggleAutoSwitch($event)"
                  class="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          }

          <!-- Modal Footer -->
          <div class="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span class="text-xs text-neutral-500">
              FlowBoard Diagnostics Engine · Windows 10 &amp; Note9 S Pen
            </span>
            <button
              (click)="store.showCompanionModal.set(false)"
              class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class GalaxyCompanionModal implements AfterViewInit {
  readonly store = inject(WhiteboardStore);
  readonly companionService = inject(CompanionSyncService);
  readonly wsGateway = inject(WebSocketGatewayService);

  readonly activeTab = signal<'remote' | 'stylus'>('remote');
  readonly copyFeedback = signal<string>('');
  readonly customInputCode = signal<string>('839-204');
  readonly isPinging = signal<boolean>(false);

  readonly Math = Math;

  @ViewChild('testCanvas') testCanvasRef?: ElementRef<HTMLCanvasElement>;
  private testCtx: CanvasRenderingContext2D | null = null;
  private isDrawingTest = false;
  private lastTestPoint: { x: number; y: number } | null = null;

  readonly qrSvg = computed(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flowboard.local';
    const url = `${origin}/companion?code=${this.store.companionState().pairingCode}`;
    return generateQrSvg(url, 160);
  });

  readonly availableActions: { id: CompanionAction; label: string }[] = [
    { id: 'UNDO', label: 'Undo Action' },
    { id: 'REDO', label: 'Redo Action' },
    { id: 'TOOL_PEN', label: 'Switch to Pen' },
    { id: 'TOOL_ERASER', label: 'Toggle Pen / Eraser' },
    { id: 'TOOL_SELECT', label: 'Select Tool' },
    { id: 'TOOL_LASER', label: 'Laser Pointer Mode' },
    { id: 'NEXT_FRAME', label: 'Next Slide' },
    { id: 'PREV_FRAME', label: 'Previous Slide' },
    { id: 'ZOOM_IN', label: 'Zoom In' },
    { id: 'ZOOM_OUT', label: 'Zoom Out' },
    { id: 'RESET_ZOOM', label: 'Reset Zoom (100%)' },
    { id: 'CLEAR_LASER', label: 'Clear Laser Marks' },
    { id: 'TOGGLE_PRESENT', label: 'Toggle Presentation' }
  ];

  ngAfterViewInit(): void {
    this.initTestCanvas();
  }

  private initTestCanvas(): void {
    if (!this.testCanvasRef) return;
    const canvas = this.testCanvasRef.nativeElement;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    this.testCtx = canvas.getContext('2d');
    if (this.testCtx) {
      this.testCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      this.testCtx.lineCap = 'round';
      this.testCtx.lineJoin = 'round';
    }
  }

  async runPingTest(): Promise<void> {
    this.isPinging.set(true);
    await this.store.runConnectionSelfTest();
    this.isPinging.set(false);
  }

  openCompanionWindow(): void {
    if (typeof window !== 'undefined') {
      const code = this.store.companionState().pairingCode;
      window.open(`/companion?code=${code}`, '_blank', 'width=420,height=780');
    }
  }

  copyPairingLink(): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flowboard.local';
    const url = `${origin}/companion?code=${this.store.companionState().pairingCode}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      this.copyFeedback.set('Link Copied!');
      setTimeout(() => this.copyFeedback.set(''), 2500);
    }
  }

  onCustomCodeInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.customInputCode.set(val);
  }

  async submitCustomCode(): Promise<void> {
    const code = this.customInputCode().trim();
    if (code) {
      await this.companionService.pairWithCode(code);
      this.runPingTest();
    }
  }

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

  toggleAutoSwitch(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.store.autoSwitchToPenOnStylus.set(checked);
  }

  // --- Test Pad Drawing ---
  onTestPointerDown(e: PointerEvent): void {
    this.store.recordStylusPointerEvent(e);
    if (!this.testCtx && this.testCanvasRef) {
      this.initTestCanvas();
    }
    this.isDrawingTest = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.lastTestPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onTestPointerMove(e: PointerEvent): void {
    this.store.recordStylusPointerEvent(e);
    if (!this.isDrawingTest || !this.testCtx || !this.lastTestPoint) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const width = Math.max(1.5, pressure * 14);

    this.testCtx.beginPath();
    this.testCtx.moveTo(this.lastTestPoint.x, this.lastTestPoint.y);
    this.testCtx.lineTo(curX, curY);
    this.testCtx.strokeStyle = e.pointerType === 'pen' ? '#2563eb' : '#10b981';
    this.testCtx.lineWidth = width;
    this.testCtx.stroke();

    this.lastTestPoint = { x: curX, y: curY };
  }

  onTestPointerUp(): void {
    this.isDrawingTest = false;
    this.lastTestPoint = null;
  }

  clearTestPad(): void {
    if (!this.testCtx || !this.testCanvasRef) return;
    const canvas = this.testCanvasRef.nativeElement;
    this.testCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
