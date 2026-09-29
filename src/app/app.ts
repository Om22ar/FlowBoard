import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhiteboardStore } from './services/whiteboard-store';
import { CompanionSyncService } from './services/companion-sync.service';
import { TopToolbar } from './components/top-toolbar';
import { LeftToolbar } from './components/left-toolbar';
import { CanvasWorkspace } from './components/canvas-workspace';
import { BottomFloatingToolbar } from './components/bottom-floating-toolbar';
import { Minimap } from './components/minimap';
import { GalaxyCompanionModal } from './components/galaxy-companion-modal';
import { GalaxyPhoneSimulator } from './components/galaxy-phone-simulator';
import { PresentationOverlay } from './components/presentation-overlay';
import { TemplatesModal } from './components/templates-modal';
import { ShareModal } from './components/share-modal';
import { ShortcutsModal } from './components/shortcuts-modal';
import { DashboardView } from './components/dashboard-view';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TopToolbar,
    LeftToolbar,
    CanvasWorkspace,
    BottomFloatingToolbar,
    Minimap,
    GalaxyCompanionModal,
    GalaxyPhoneSimulator,
    PresentationOverlay,
    TemplatesModal,
    ShareModal,
    ShortcutsModal,
    DashboardView
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly store = inject(WhiteboardStore);
  // Ensure companion sync service is initialized
  readonly companionSync = inject(CompanionSyncService);
}
