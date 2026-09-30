import { Injectable, inject, signal, computed, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ConnectedPeer,
  DrawingPoint,
  DrawingStroke,
  WsClientRole,
  WsConnectionStatus,
  WsMessagePayload,
  CompanionAction,
  ToolType
} from '../models/whiteboard.models';
import { WhiteboardStore } from './whiteboard-store';

@Injectable({
  providedIn: 'root'
})
export class WebSocketGatewayService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly store = inject(WhiteboardStore);
  private readonly ngZone = inject(NgZone);

  // --- Angular Signals for Reactive Gateway State ---
  readonly connectionStatus = signal<WsConnectionStatus>('disconnected');
  readonly isConnected = computed(() => this.connectionStatus() === 'connected');
  readonly latencyMs = signal<number>(0);
  readonly connectedPeers = signal<ConnectedPeer[]>([]);
  readonly role = signal<WsClientRole>('host');
  readonly pairingCode = signal<string>('839-204');
  
  // Real-time Traffic Counters
  readonly txPackets = signal<number>(0);
  readonly rxPackets = signal<number>(0);
  readonly lastActivityTimestamp = signal<number>(0);

  // Real-time Drawing & Gesture Signals
  readonly activeLivePoint = signal<{ point: DrawingPoint; color: string; width: number; tool: string } | null>(null);
  readonly lastCommittedStroke = signal<DrawingStroke | null>(null);
  readonly activeLaserPos = signal<{ x: number; y: number } | null>(null);
  readonly lastSPenEvent = signal<{ action: CompanionAction; timestamp: number } | null>(null);

  // Internal WebSocket and connection management
  private socket: WebSocket | null = null;
  private clientId = 'client-' + Math.random().toString(36).slice(2, 9);
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private isIntentionallyClosed = false;
  private activeMetadata: { deviceName?: string; phoneBattery?: number; spenBattery?: number } = {};

  constructor() {
    if (this.isBrowser) {
      // Initialize with default pairing code from store
      const initialCode = this.store.companionState().pairingCode || '839-204';
      this.pairingCode.set(initialCode);
    }
  }

  /**
   * Connects to the WebSocket gateway on the server
   */
  connect(
    code = '839-204',
    role: WsClientRole = 'host',
    metadata: { deviceName?: string; phoneBattery?: number; spenBattery?: number } = {}
  ): void {
    if (!this.isBrowser) return;

    this.isIntentionallyClosed = false;
    this.pairingCode.set(code);
    this.role.set(role);
    this.activeMetadata = metadata;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
    }

    this.connectionStatus.set(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.ngZone.run(() => {
          this.connectionStatus.set('connected');
          this.reconnectAttempts = 0;

          // Send JOIN handshake
          this.sendDirect({
            type: 'JOIN',
            id: this.clientId,
            code: this.pairingCode(),
            senderRole: this.role(),
            senderId: this.clientId,
            timestamp: Date.now(),
            payload: {
              deviceName: this.activeMetadata.deviceName || (this.role() === 'host' ? 'Windows Host Workstation' : 'Samsung Galaxy Note9 (SM-N960F)'),
              phoneBattery: this.activeMetadata.phoneBattery ?? 88,
              spenBattery: this.activeMetadata.spenBattery ?? 100
            }
          });

          this.startHeartbeat();
          this.store.logCompanionEvent({
            source: 'system',
            action: `WebSocket Gateway Connected (${this.role().toUpperCase()})`,
            success: true
          });
        });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.ngZone.run(() => {
          this.rxPackets.update((c) => c + 1);
          this.lastActivityTimestamp.set(Date.now());
          try {
            const data: WsMessagePayload = JSON.parse(event.data);
            this.handleIncomingMessage(data);
          } catch (e) {
            console.warn('Failed parsing WS payload', e);
          }
        });
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket error', err);
      };

      this.socket.onclose = () => {
        this.ngZone.run(() => {
          this.stopHeartbeat();
          if (!this.isIntentionallyClosed) {
            this.connectionStatus.set('disconnected');
            this.scheduleReconnect();
          } else {
            this.connectionStatus.set('disconnected');
          }
        });
      };
    } catch (e) {
      console.warn('WebSocket connection initiation error', e);
      this.scheduleReconnect();
    }
  }

  /**
   * Closes active WebSocket session
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionStatus.set('disconnected');
  }

  /**
   * Broadcasts the initial pointerdown contact event
   */
  broadcastDrawStart(strokeId: string, point: DrawingPoint, color: string, width: number, tool: string): void {
    const payload: WsMessagePayload = {
      type: 'DRAW_START',
      id: strokeId,
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      point,
      payload: { color, width, tool, strokeId }
    };
    this.send(payload);
  }

  /**
   * Broadcasts live in-progress drawing points (60 FPS low-latency stream)
   */
  broadcastDrawLive(strokeId: string, point: DrawingPoint, color: string, width: number, tool: string): void {
    const payload: WsMessagePayload = {
      type: 'DRAW_LIVE',
      id: strokeId,
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      point,
      payload: { color, width, tool, strokeId }
    };
    this.send(payload);
  }

  /**
   * Broadcasts pointerup drawing completion
   */
  broadcastDrawEnd(strokeId: string): void {
    const payload: WsMessagePayload = {
      type: 'DRAW_END',
      id: strokeId,
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      payload: { strokeId }
    };
    this.send(payload);
  }

  /**
   * Broadcasts a finalized committed vector stroke to all peers and host
   */
  broadcastStrokeCommit(stroke: DrawingStroke): void {
    const payload: WsMessagePayload = {
      type: 'DRAW_COMMIT',
      id: stroke.id,
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      stroke
    };
    this.send(payload);
  }

  /**
   * Broadcasts S Pen hardware button and air gesture triggers
   */
  broadcastSPenEvent(action: CompanionAction, extraPayload?: Record<string, unknown>): void {
    const payload: WsMessagePayload = {
      type: 'SPEN_EVENT',
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      action,
      timestamp: Date.now(),
      payload: extraPayload
    };
    this.send(payload);
  }

  /**
   * Broadcasts laser pointer coordinate
   */
  broadcastLaser(x: number, y: number): void {
    const payload: WsMessagePayload = {
      type: 'STATE_CHANGE',
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      payload: { isLaserActive: true, laserX: x, laserY: y }
    };
    this.send(payload);
  }

  /**
   * Broadcasts general whiteboard state changes (tool, color, zoom, clear)
   */
  broadcastStateChange(state: Record<string, unknown>): void {
    const payload: WsMessagePayload = {
      type: 'STATE_CHANGE',
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      payload: state
    };
    this.send(payload);
  }

  /**
   * Sends arbitrary payload through gateway
   */
  send(message: Partial<WsMessagePayload>): void {
    const fullMsg: WsMessagePayload = {
      type: message.type || 'COMMAND',
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      code: this.pairingCode(),
      senderRole: this.role(),
      senderId: this.clientId,
      timestamp: Date.now(),
      ...message
    };
    this.sendDirect(fullMsg);
  }

  private sendDirect(msg: WsMessagePayload): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
      this.txPackets.update((c) => c + 1);
    }
  }

  private handleIncomingMessage(msg: WsMessagePayload): void {
    switch (msg.type) {
      case 'PONG': {
        if (msg.clientTime) {
          const rtt = Math.max(1, Date.now() - msg.clientTime);
          this.latencyMs.set(rtt);
          this.store.companionState.update((s) => ({ ...s, latencyMs: rtt, lastPing: Date.now() }));
        }
        break;
      }

      case 'PRESENCE_UPDATE':
      case 'PEER_JOINED':
      case 'PEER_LEFT': {
        if (msg.peers) {
          this.connectedPeers.set(msg.peers);
          const devicePeer = msg.peers.find((p) => p.role === 'device');
          if (devicePeer) {
            this.store.companionState.update((s) => ({
              ...s,
              connected: true,
              deviceName: devicePeer.deviceName,
              phoneBattery: devicePeer.phoneBattery ?? s.phoneBattery,
              spenBattery: devicePeer.spenBattery ?? s.spenBattery,
              signalStrength: 98
            }));
          }
        }
        break;
      }

      case 'DRAW_START': {
        if (msg.point && msg.payload) {
          const color = (msg.payload['color'] as string) || '#ef4444';
          const width = (msg.payload['width'] as number) || 4;
          const tool = (msg.payload['tool'] as string) || 'pen';
          const strokeId = (msg.payload['strokeId'] as string) || msg.id;
          this.activeLivePoint.set({ point: msg.point, color, width, tool });

          this.store.executeCompanionCommand('REMOTE_DRAW_START', {
            strokeId,
            x: msg.point.x,
            y: msg.point.y,
            pressure: msg.point.pressure ?? 0.5,
            color,
            width,
            tool
          });
        }
        break;
      }

      case 'DRAW_LIVE': {
        if (msg.point && msg.payload) {
          const color = (msg.payload['color'] as string) || '#ef4444';
          const width = (msg.payload['width'] as number) || 4;
          const tool = (msg.payload['tool'] as string) || 'pen';
          const strokeId = (msg.payload['strokeId'] as string) || msg.id;
          this.activeLivePoint.set({ point: msg.point, color, width, tool });

          // Forward to store for real-time viewport drawing
          this.store.executeCompanionCommand('REMOTE_DRAW_MOVE', {
            strokeId,
            x: msg.point.x,
            y: msg.point.y,
            pressure: msg.point.pressure ?? 0.5,
            color,
            width,
            tool
          });
        }
        break;
      }

      case 'DRAW_END': {
        this.store.executeCompanionCommand('REMOTE_DRAW_END', {
          strokeId: msg.payload?.['strokeId'] || msg.id
        });
        break;
      }

      case 'DRAW_COMMIT': {
        if (msg.stroke) {
          this.lastCommittedStroke.set(msg.stroke);
          // Pass raw points to executeCompanionCommand REMOTE_STROKE_COMMIT
          this.store.executeCompanionCommand('REMOTE_STROKE_COMMIT', {
            strokeId: msg.stroke.id,
            points: msg.stroke.points,
            color: msg.stroke.color,
            width: msg.stroke.width,
            tool: msg.stroke.tool,
            opacity: msg.stroke.opacity
          });
        }
        break;
      }

      case 'SPEN_EVENT':
      case 'COMMAND': {
        if (msg.action) {
          this.lastSPenEvent.set({ action: msg.action, timestamp: Date.now() });
          this.store.executeCompanionCommand(msg.action, msg.payload);
        }
        break;
      }

      case 'STATE_CHANGE': {
        if (msg.payload) {
          if (typeof msg.payload['laserX'] === 'number' && typeof msg.payload['laserY'] === 'number') {
            this.activeLaserPos.set({ x: msg.payload['laserX'] as number, y: msg.payload['laserY'] as number });
            this.store.executeCompanionCommand('LASER_MOVE', {
              x: msg.payload['laserX'],
              y: msg.payload['laserY']
            });
          }
          if (msg.payload['isLaserActive'] === false) {
            this.store.executeCompanionCommand('CLEAR_LASER');
          }
          if (typeof msg.payload['activeTool'] === 'string') {
            this.store.activeTool.set(msg.payload['activeTool'] as ToolType);
          }
          if (typeof msg.payload['penColor'] === 'string') {
            this.store.penColor.set(msg.payload['penColor'] as string);
          }
        }
        break;
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendDirect({
          type: 'PING',
          code: this.pairingCode(),
          senderRole: this.role(),
          senderId: this.clientId,
          timestamp: Date.now(),
          clientTime: Date.now()
        });
      }
    }, 4000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached');
      return;
    }

    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.pairingCode(), this.role(), this.activeMetadata);
    }, delay);
  }
}
