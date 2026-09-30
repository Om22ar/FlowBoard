import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { CompanionSyncService } from '../services/companion-sync.service';
import { TopToolbar } from '../components/top-toolbar';
import { FloatingToolDock } from '../components/floating-tool-dock';
import { CanvasWorkspace } from '../components/canvas-workspace';
import { BottomFloatingToolbar } from '../components/bottom-floating-toolbar';
import { Minimap } from '../components/minimap';
import { GalaxyCompanionModal } from '../components/galaxy-companion-modal';
import { GalaxyPhoneSimulator } from '../components/galaxy-phone-simulator';
import { PresentationOverlay } from '../components/presentation-overlay';
import { TemplatesModal } from '../components/templates-modal';
import { ShareModal } from '../components/share-modal';
import { ShortcutsModal } from '../components/shortcuts-modal';
import { DashboardView } from '../components/dashboard-view';
import { TouchpadFloatingPad } from '../components/touchpad-floating-pad';
import { TasksDocsPanel } from '../components/tasks-docs-panel';
import { WhiteboardBackgroundModal } from '../components/whiteboard-background-modal';

@Component({
  selector: 'app-whiteboard-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    TopToolbar,
    FloatingToolDock,
    CanvasWorkspace,
    BottomFloatingToolbar,
    Minimap,
    GalaxyCompanionModal,
    GalaxyPhoneSimulator,
    PresentationOverlay,
    TemplatesModal,
    ShareModal,
    ShortcutsModal,
    DashboardView,
    TouchpadFloatingPad,
    TasksDocsPanel,
    WhiteboardBackgroundModal
  ],
  template: `
    <div class="h-screen w-screen flex flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans select-none relative">
      <!-- Top Navigation & Control Toolbar (Always visible in canvas mode) -->
      @if (store.viewMode() === 'canvas') {
        <app-top-toolbar></app-top-toolbar>

        <!-- Canvas Layout with Floating Tool Dock & Infinite Canvas -->
        <div class="flex-1 flex overflow-hidden relative">
          <app-floating-tool-dock></app-floating-tool-dock>
          <app-canvas-workspace class="flex-1"></app-canvas-workspace>
          <app-bottom-floating-toolbar></app-bottom-floating-toolbar>
          <app-minimap></app-minimap>
          <app-touchpad-floating-pad></app-touchpad-floating-pad>
        </div>
      } @else {
        <!-- Dashboard View (Projects, Templates, Search) -->
        <app-dashboard-view></app-dashboard-view>
      }

      <!-- Modals & Overlays -->
      <app-galaxy-companion-modal></app-galaxy-companion-modal>
      <app-galaxy-phone-simulator></app-galaxy-phone-simulator>
      <app-presentation-overlay></app-presentation-overlay>
      <app-templates-modal></app-templates-modal>
      <app-share-modal></app-share-modal>
      <app-shortcuts-modal></app-shortcuts-modal>
      <app-tasks-docs-panel></app-tasks-docs-panel>
      <app-whiteboard-background-modal></app-whiteboard-background-modal>

      <!-- Live Floating Notification Toast (Displays Ping results, S Pen triggers, and status) -->
      @if (store.activeToast(); as toast) {
        <div
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md transition-all animate-bounce-in"
          [class.bg-emerald-900/90]="toast.type === 'success'"
          [class.border-emerald-700]="toast.type === 'success'"
          [class.text-emerald-100]="toast.type === 'success'"
          [class.bg-blue-900/90]="toast.type === 'info'"
          [class.border-blue-700]="toast.type === 'info'"
          [class.text-blue-100]="toast.type === 'info'"
          [class.bg-amber-900/90]="toast.type === 'warning'"
          [class.border-amber-700]="toast.type === 'warning'"
          [class.text-amber-100]="toast.type === 'warning'"
        >
          <mat-icon class="text-sm">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'info' }}
          </mat-icon>
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `
})
export class WhiteboardWorkspace {
  readonly store = inject(WhiteboardStore);
  // Ensure companion sync service is active
  readonly companionSync = inject(CompanionSyncService);
}
