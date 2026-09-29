import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { CompanionSyncService } from '../services/companion-sync.service';
import { CompanionAction } from '../models/whiteboard.models';

@Component({
  selector: 'app-galaxy-phone-simulator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showSimulatedPhone()) {
      <div
        class="fixed top-20 right-6 z-40 select-none shadow-2xl rounded-3xl overflow-hidden border-4 border-neutral-800 bg-neutral-950 text-white w-72 transition-all flex flex-col font-sans"
        [class.h-[580px]]="!isMinimized()"
        [class.h-14]="isMinimized()"
      >
        <!-- Phone Top Bezel & Speaker -->
        <div class="px-4 py-2 bg-neutral-900 flex items-center justify-between border-b border-neutral-800">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <span class="text-[11px] font-semibold text-neutral-300">Galaxy Note9 Remote</span>
          </div>

          <div class="flex items-center gap-1">
            <button
              (click)="toggleMinimized()"
              title="Minimize/Expand"
              class="p-1 text-neutral-400 hover:text-white rounded"
            >
              <mat-icon class="text-sm">{{ isMinimized() ? 'expand_more' : 'expand_less' }}</mat-icon>
            </button>
            <button
              (click)="store.showSimulatedPhone.set(false)"
              title="Close"
              class="p-1 text-neutral-400 hover:text-white rounded"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>
        </div>

        @if (!isMinimized()) {
          <!-- Phone Screen Container -->
          <div class="p-3.5 flex-1 flex flex-col justify-between bg-neutral-950 overflow-y-auto">
            <!-- Top Status Bar -->
            <div class="flex items-center justify-between text-[10px] text-neutral-400 pb-2 border-b border-neutral-800">
              <span class="font-mono">Wi-Fi · FlowBoard</span>
              <div class="flex items-center gap-2">
                <span>BLE 5.0</span>
                <span class="text-emerald-400">88% 🔋</span>
              </div>
            </div>

            <!-- Command Trigger Feedback Banner -->
            @if (activeCommandMessage()) {
              <div class="my-2 py-1.5 px-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-center text-xs text-blue-300 animate-pulse font-mono">
                {{ activeCommandMessage() }}
              </div>
            }

            <!-- SECTION 1: PHYSICAL S PEN BUTTONS -->
            <div class="my-2 p-2.5 bg-neutral-900/90 rounded-2xl border border-neutral-800">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                  <mat-icon class="text-xs text-amber-400">edit</mat-icon>
                  S Pen Physical Button
                </span>
                <span class="text-[9px] text-neutral-500">Bluetooth BLE</span>
              </div>

              <div class="grid grid-cols-3 gap-1.5">
                <button
                  (click)="triggerMappedAction('singlePress')"
                  class="py-2 px-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 rounded-xl text-[11px] font-medium flex flex-col items-center gap-1 transition-all cursor-pointer border border-neutral-700"
                >
                  <span class="font-bold text-blue-400">1x</span>
                  <span>Single</span>
                </button>
                <button
                  (click)="triggerMappedAction('doublePress')"
                  class="py-2 px-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 rounded-xl text-[11px] font-medium flex flex-col items-center gap-1 transition-all cursor-pointer border border-neutral-700"
                >
                  <span class="font-bold text-purple-400">2x</span>
                  <span>Double</span>
                </button>
                <button
                  (click)="triggerMappedAction('longPress')"
                  class="py-2 px-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 rounded-xl text-[11px] font-medium flex flex-col items-center gap-1 transition-all cursor-pointer border border-neutral-700"
                >
                  <span class="font-bold text-rose-400">Hold</span>
                  <span>Long Press</span>
                </button>
              </div>
            </div>

            <!-- SECTION 2: S PEN AIR GESTURES D-PAD -->
            <div class="my-1 p-2 bg-neutral-900/90 rounded-2xl border border-neutral-800 flex flex-col items-center">
              <span class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5 self-start flex items-center gap-1">
                <mat-icon class="text-xs text-cyan-400">air</mat-icon>
                S Pen Air Gestures
              </span>

              <div class="flex flex-col items-center gap-1">
                <!-- Air Up -->
                <button
                  (click)="triggerAirGesture('airUp')"
                  title="Flick Up (Zoom In)"
                  class="w-10 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 flex items-center justify-center transition-colors text-neutral-300"
                >
                  <mat-icon class="text-sm">arrow_upward</mat-icon>
                </button>

                <div class="flex items-center gap-2">
                  <!-- Air Left -->
                  <button
                    (click)="triggerAirGesture('airLeft')"
                    title="Flick Left (Prev Frame)"
                    class="w-10 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 flex items-center justify-center transition-colors text-neutral-300"
                  >
                    <mat-icon class="text-sm">arrow_back</mat-icon>
                  </button>

                  <!-- Center Shake -->
                  <button
                    (click)="triggerAirGesture('shake')"
                    title="Shake S Pen (Clear Laser Marks)"
                    class="w-10 h-7 rounded-lg bg-neutral-700 hover:bg-neutral-600 active:bg-amber-600 flex items-center justify-center transition-colors text-neutral-200"
                  >
                    <mat-icon class="text-sm">vibration</mat-icon>
                  </button>

                  <!-- Air Right -->
                  <button
                    (click)="triggerAirGesture('airRight')"
                    title="Flick Right (Next Frame)"
                    class="w-10 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 flex items-center justify-center transition-colors text-neutral-300"
                  >
                    <mat-icon class="text-sm">arrow_forward</mat-icon>
                  </button>
                </div>

                <!-- Air Down -->
                <button
                  (click)="triggerAirGesture('airDown')"
                  title="Flick Down (Zoom Out)"
                  class="w-10 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 flex items-center justify-center transition-colors text-neutral-300"
                >
                  <mat-icon class="text-sm">arrow_downward</mat-icon>
                </button>
              </div>
            </div>

            <!-- SECTION 3: PHONE SCREEN REMOTE SHORTCUTS -->
            <div class="my-1.5 p-2 bg-neutral-900/90 rounded-2xl border border-neutral-800">
              <span class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2 block">
                Screen Remote Pad
              </span>

              <!-- Tool Toggles -->
              <div class="grid grid-cols-4 gap-1.5 mb-2">
                <button
                  (click)="exec('TOOL_PEN')"
                  class="py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5"
                  [class.bg-blue-600]="store.activeTool() === 'pen'"
                  [class.bg-neutral-800]="store.activeTool() !== 'pen'"
                >
                  <mat-icon class="text-sm">brush</mat-icon>
                  <span class="text-[9px]">Pen</span>
                </button>
                <button
                  (click)="exec('TOOL_ERASER')"
                  class="py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5"
                  [class.bg-rose-600]="store.activeTool() === 'eraser'"
                  [class.bg-neutral-800]="store.activeTool() !== 'eraser'"
                >
                  <mat-icon class="text-sm">auto_fix_normal</mat-icon>
                  <span class="text-[9px]">Eraser</span>
                </button>
                <button
                  (click)="exec('TOOL_LASER')"
                  class="py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5"
                  [class.bg-red-600]="store.isLaserActive()"
                  [class.bg-neutral-800]="!store.isLaserActive()"
                >
                  <mat-icon class="text-sm">highlight</mat-icon>
                  <span class="text-[9px]">Laser</span>
                </button>
                <button
                  (click)="exec('TOGGLE_PRESENT')"
                  class="py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5"
                  [class.bg-violet-600]="store.isPresentationMode()"
                  [class.bg-neutral-800]="!store.isPresentationMode()"
                >
                  <mat-icon class="text-sm">play_arrow</mat-icon>
                  <span class="text-[9px]">Slide</span>
                </button>
              </div>

              <!-- Quick Colors -->
              <div class="flex items-center justify-between px-1 py-1">
                @for (c of remoteColors; track c) {
                  <button
                    (click)="pickColor(c)"
                    [title]="'Select Color ' + c"
                    class="w-5 h-5 rounded-full border border-white/20 transition-transform active:scale-125"
                    [style.background-color]="c"
                  >
                    <span class="sr-only">Color {{ c }}</span>
                  </button>
                }
                <div class="h-4 w-px bg-neutral-800 mx-1"></div>
                <button (click)="exec('UNDO')" title="Undo" class="p-1 hover:text-blue-400">
                  <mat-icon class="text-sm">undo</mat-icon>
                </button>
                <button (click)="exec('REDO')" title="Redo" class="p-1 hover:text-blue-400">
                  <mat-icon class="text-sm">redo</mat-icon>
                </button>
              </div>
            </div>

            <!-- Footer Hardware Disclaimer -->
            <div class="text-[9px] text-neutral-500 text-center leading-tight">
              Drawing occurs on laptop screen stylus. Note9 serves as remote command deck.
            </div>
          </div>
        }
      </div>
    }
  `
})
export class GalaxyPhoneSimulator {
  readonly store = inject(WhiteboardStore);
  readonly companionService = inject(CompanionSyncService);

  readonly isMinimized = signal<boolean>(false);
  readonly activeCommandMessage = signal<string>('');

  readonly remoteColors = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#f59e0b'];

  toggleMinimized(): void {
    this.isMinimized.update((v) => !v);
  }

  triggerMappedAction(pressType: 'singlePress' | 'doublePress' | 'longPress'): void {
    const action = this.store.spenMappings()[pressType];
    this.exec(action, `S Pen Button (${pressType}): ${action}`);
  }

  triggerAirGesture(gesture: 'airLeft' | 'airRight' | 'airUp' | 'airDown' | 'shake'): void {
    const action = this.store.spenMappings()[gesture];
    this.exec(action, `Air Gesture (${gesture}): ${action}`);
  }

  exec(action: CompanionAction, message?: string): void {
    this.companionService.sendCommand(action);
    this.activeCommandMessage.set(message || `Command: ${action}`);
    setTimeout(() => this.activeCommandMessage.set(''), 2000);
  }

  pickColor(color: string): void {
    this.companionService.sendCommand('COLOR_SELECT', { color });
    this.activeCommandMessage.set(`Color set: ${color}`);
    setTimeout(() => this.activeCommandMessage.set(''), 1500);
  }
}
