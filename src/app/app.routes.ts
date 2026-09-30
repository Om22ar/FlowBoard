import { Routes } from '@angular/router';
import { WhiteboardWorkspace } from './pages/whiteboard-workspace';
import { CompanionRemote } from './pages/companion-remote';

export const routes: Routes = [
  {
    path: '',
    component: WhiteboardWorkspace
  },
  {
    path: 'companion',
    component: CompanionRemote
  },
  {
    path: '**',
    redirectTo: ''
  }
];
