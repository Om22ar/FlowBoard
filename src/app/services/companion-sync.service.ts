import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WhiteboardStore } from './whiteboard-store';
import { CompanionAction } from '../models/whiteboard.models';

@Injectable({
  providedIn: 'root'
})
export class CompanionSyncService {
  private readonly store = inject(WhiteboardStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  readonly pairingUrl = signal<string>('');
  readonly isListening = signal<boolean>(false);
  readonly lastReceivedCommand = signal<{ action: string; timestamp: number } | null>(null);

  constructor() {
    if (this.isBrowser) {
      this.initBroadcastChannel();
      this.initPairingCode();
    }
  }

  private initBroadcastChannel(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('flowboard_companion_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'COMMAND') {
            this.handleRemoteCommand(event.data.action, event.data.payload);
          } else if (event.data?.type === 'DEVICE_PAIRED') {
            this.handleDevicePaired(event.data.payload);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }
  }

  async initPairingCode(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const res = await fetch('/api/companion/session', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.pairingCode) {
        this.store.companionState.update((state) => ({
          ...state,
          pairingCode: data.pairingCode
        }));

        const host = window.location.origin;
        this.pairingUrl.set(`${host}/companion?code=${data.pairingCode}`);
        this.connectSse(data.pairingCode);
      }
    } catch {
      // Fallback code if offline
      const fallbackCode = '839-204';
      this.store.companionState.update((s) => ({ ...s, pairingCode: fallbackCode }));
      if (typeof window !== 'undefined') {
        this.pairingUrl.set(`${window.location.origin}/companion?code=${fallbackCode}`);
      }
    }
  }

  private connectSse(code: string): void {
    if (!this.isBrowser || typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource(`/api/companion/events/${code}`);
      this.isListening.set(true);

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'DEVICE_PAIRED') {
            this.handleDevicePaired(parsed.payload);
          } else if (parsed.type === 'COMMAND') {
            this.handleRemoteCommand(parsed.action, parsed.payload);
          }
        } catch {
          // ignore parse error
        }
      };

      this.eventSource.onerror = () => {
        // SSE error, keep polling status occasionally
        this.startFallbackPolling(code);
      };
    } catch (e) {
      console.warn('SSE connection failed', e);
      this.startFallbackPolling(code);
    }
  }

  private startFallbackPolling(code: string): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/companion/status/${code}`);
        const data = await res.json();
        if (data.connected) {
          this.store.companionState.update((s) => ({
            ...s,
            connected: true,
            deviceName: data.deviceName || s.deviceName,
            phoneBattery: data.phoneBattery ?? s.phoneBattery,
            spenBattery: data.spenBattery ?? s.spenBattery
          }));
        }
      } catch {
        // quiet
      }
    }, 4000);
  }

  private handleDevicePaired(payload?: Record<string, unknown>): void {
    this.store.companionState.update((s) => ({
      ...s,
      connected: true,
      deviceName: (payload?.['deviceName'] as string) || 'Samsung Galaxy Note9 (SM-N960F)',
      phoneBattery: (payload?.['phoneBattery'] as number) ?? 88,
      spenBattery: (payload?.['spenBattery'] as number) ?? 100,
      signalStrength: 96,
      latencyMs: 12
    }));
  }

  private handleRemoteCommand(action: CompanionAction, payload?: Record<string, unknown>): void {
    this.lastReceivedCommand.set({ action, timestamp: Date.now() });
    this.store.executeCompanionCommand(action, payload);
  }

  /**
   * Send a command from either the companion screen, companion simulator, or external device
   */
  async sendCommand(action: CompanionAction, payload?: Record<string, unknown>): Promise<void> {
    this.handleRemoteCommand(action, payload);

    // Broadcast across windows/tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'COMMAND',
        action,
        payload
      });
    }

    // Also dispatch to API if online
    const code = this.store.companionState().pairingCode;
    if (code) {
      try {
        await fetch('/api/companion/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, action, payload })
        });
      } catch {
        // offline resilient
      }
    }
  }

  /**
   * Pair simulation for testing directly in browser
   */
  simulateConnectDevice(): void {
    this.handleDevicePaired({
      deviceName: 'Samsung Galaxy Note9 (SM-N960F)',
      phoneBattery: 85,
      spenBattery: 100
    });
  }

  disconnectDevice(): void {
    this.store.companionState.update((s) => ({
      ...s,
      connected: false
    }));
  }
}
