import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { TEMPLATES } from '../data/templates';

@Component({
  selector: 'app-dashboard-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex-1 flex bg-neutral-50 dark:bg-neutral-950 overflow-hidden font-sans select-none">
      <!-- Left Dashboard Navigation Sidebar -->
      <aside class="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col justify-between shrink-0">
        <div>
          <!-- Workspace Title -->
          <div class="flex items-center justify-between mb-6 px-2">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                F
              </div>
              <span class="font-bold text-sm text-neutral-800 dark:text-neutral-100 tracking-tight">
                FREELANCERS WORKSPACE
              </span>
            </div>
          </div>

          <!-- Section Nav -->
          <div class="space-y-1">
            <button
              (click)="selectedTab.set('all')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              [class.bg-neutral-100]="selectedTab() === 'all'"
              [class.dark:bg-neutral-800]="selectedTab() === 'all'"
              [class.text-neutral-900]="selectedTab() === 'all'"
              [class.text-neutral-600]="selectedTab() !== 'all'"
            >
              <div class="flex items-center gap-2.5">
                <mat-icon class="text-base text-neutral-500">grid_view</mat-icon>
                <span>All Whiteboards</span>
              </div>
              <span class="text-[11px] font-mono text-neutral-400">{{ store.boards().length }}</span>
            </button>

            <button
              (click)="selectedTab.set('my')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              [class.bg-neutral-100]="selectedTab() === 'my'"
              [class.dark:bg-neutral-800]="selectedTab() === 'my'"
              [class.text-neutral-900]="selectedTab() === 'my'"
              [class.text-neutral-600]="selectedTab() !== 'my'"
            >
              <div class="flex items-center gap-2.5">
                <div class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">O</div>
                <span>My Whiteboards</span>
              </div>
              <span class="text-[11px] font-mono text-neutral-400">{{ store.boards().length }}</span>
            </button>
          </div>

          <!-- Favorites -->
          <div class="mt-8">
            <div class="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Favorites
            </div>
            <div class="space-y-0.5">
              @for (b of favoriteBoards(); track b.id) {
                <button
                  (click)="openBoard(b.id)"
                  class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <mat-icon class="text-amber-500 text-sm">star</mat-icon>
                  <span class="truncate">{{ b.name }}</span>
                </button>
              }
              @if (favoriteBoards().length === 0) {
                <div class="px-3 py-1 text-xs text-neutral-400 italic">No favorites yet</div>
              }
            </div>
          </div>

          <!-- Recents -->
          <div class="mt-6">
            <div class="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Recents
            </div>
            <div class="space-y-0.5">
              @for (b of recentBoards(); track b.id) {
                <button
                  (click)="openBoard(b.id)"
                  class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <mat-icon class="text-amber-500 text-sm">folder</mat-icon>
                  <span class="truncate">{{ b.name }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- S Pen / Hardware quick status -->
        <div class="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
          <div class="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            <mat-icon class="text-sm text-blue-600">smartphone</mat-icon>
            <span>Galaxy Companion</span>
          </div>
          <p class="text-[11px] text-neutral-500 leading-tight">
            {{ store.companionState().connected ? 'Paired with Galaxy Note9' : 'Pair Note9 for wireless remote control' }}
          </p>
        </div>
      </aside>

      <!-- Main Dashboard Content Area -->
      <main class="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        <!-- Top Notification Banner (matching screenshot 2150) -->
        <div class="bg-indigo-600 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xs">
          <div class="flex items-center gap-3">
            <mat-icon class="text-xl text-indigo-200">notifications_active</mat-icon>
            <span class="text-xs md:text-sm font-medium">
              Don't let important updates slip by. FlowBoard autosaves everything in real-time to your device.
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="bannerDismissed.set(true)"
              class="px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
            >
              Got it
            </button>
            <button
              (click)="bannerDismissed.set(true)"
              class="p-1 hover:bg-indigo-700 rounded-lg text-indigo-200"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Header Row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              All Whiteboards
            </h1>
            <p class="text-xs text-neutral-500">
              Infinite workspaces for diagrams, mind maps, user journeys, and stylus sketches
            </p>
          </div>

          <!-- New Whiteboard Primary Button -->
          <div class="flex items-center gap-2">
            <button
              (click)="createNewBoard()"
              class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <mat-icon class="text-base">add</mat-icon>
              <span>New Whiteboard</span>
            </button>
          </div>
        </div>

        <!-- Templates Carousel / Cards (matching screenshot 2150) -->
        <div>
          <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Recommended Templates
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Template 1: Org Chart -->
            <button
              (click)="createFromTemplate('org-chart')"
              class="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-purple-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
            >
              <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <mat-icon>account_tree</mat-icon>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 transition-colors">
                  Organizational Chart
                </h4>
                <p class="text-xs text-neutral-500 leading-snug mt-0.5">
                  Visualize your team structure
                </p>
              </div>
            </button>

            <!-- Template 2: Action Plan -->
            <button
              (click)="createFromTemplate('action-plan')"
              class="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
            >
              <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <mat-icon>assignment_turned_in</mat-icon>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 transition-colors">
                  Action Plan
                </h4>
                <p class="text-xs text-neutral-500 leading-snug mt-0.5">
                  Turn goals into actionable steps
                </p>
              </div>
            </button>

            <!-- Template 3: Customer Journey -->
            <button
              (click)="createFromTemplate('customer-journey')"
              class="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
            >
              <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <mat-icon>alt_route</mat-icon>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">
                  Customer Journey Map
                </h4>
                <p class="text-xs text-neutral-500 leading-snug mt-0.5">
                  Optimize every customer touchpoint
                </p>
              </div>
            </button>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="flex items-center justify-between gap-4 pt-2">
          <!-- Sort -->
          <div class="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <mat-icon class="text-base">sort</mat-icon>
            <span class="font-medium">Sort by:</span>
            <select
              [value]="sortOrder()"
              (change)="sortOrder.set($any($event.target).value)"
              class="bg-transparent border-none text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Updated</option>
              <option value="created">Date Created</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          <!-- Search Input -->
          <div class="relative w-64">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-base">search</mat-icon>
            <input
              type="text"
              placeholder="Search whiteboards..."
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              class="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Whiteboards Table (matching screenshot 2150) -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider bg-neutral-50/50 dark:bg-neutral-900">
                <th class="py-3 px-4 font-semibold">Name</th>
                <th class="py-3 px-4 font-semibold hidden md:table-cell">Location</th>
                <th class="py-3 px-4 font-semibold hidden sm:table-cell">Date updated</th>
                <th class="py-3 px-4 font-semibold hidden lg:table-cell">Date created</th>
                <th class="py-3 px-4 font-semibold">Creator</th>
                <th class="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
              @for (b of filteredBoards(); track b.id) {
                <tr
                  (click)="openBoard(b.id)"
                  class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                >
                  <!-- Name -->
                  <td class="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <mat-icon class="text-amber-500 text-base">folder</mat-icon>
                    <span class="group-hover:text-blue-600 transition-colors">{{ b.name }}</span>
                    @if (b.isFavorite) {
                      <mat-icon class="text-amber-500 text-xs">star</mat-icon>
                    }
                  </td>

                  <!-- Location -->
                  <td class="py-3 px-4 text-neutral-400 hidden md:table-cell">—</td>

                  <!-- Date updated -->
                  <td class="py-3 px-4 text-neutral-500 font-mono hidden sm:table-cell">
                    {{ formatDate(b.updatedAt) }}
                  </td>

                  <!-- Date created -->
                  <td class="py-3 px-4 text-neutral-500 font-mono hidden lg:table-cell">
                    {{ formatDate(b.createdAt) }}
                  </td>

                  <!-- Creator -->
                  <td class="py-3 px-4">
                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                      O
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-3 px-4 text-right" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        (click)="store.duplicateBoard(b.id)"
                        title="Duplicate"
                        class="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
                      >
                        <mat-icon class="text-sm">content_copy</mat-icon>
                      </button>
                      <button
                        (click)="store.deleteBoard(b.id)"
                        title="Delete"
                        class="p-1 text-neutral-400 hover:text-rose-600 rounded"
                      >
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (filteredBoards().length === 0) {
                <tr>
                  <td colspan="6" class="py-12 text-center text-neutral-400">
                    No whiteboards matching "{{ searchQuery() }}"
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </main>
    </div>
  `
})
export class DashboardView {
  readonly store = inject(WhiteboardStore);

  readonly selectedTab = signal<'all' | 'my'>('all');
  readonly searchQuery = signal<string>('');
  readonly sortOrder = signal<'recent' | 'created' | 'name'>('recent');
  readonly bannerDismissed = signal<boolean>(false);

  readonly favoriteBoards = computed(() =>
    this.store.boards().filter((b) => b.isFavorite)
  );

  readonly recentBoards = computed(() =>
    [...this.store.boards()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
  );

  readonly filteredBoards = computed(() => {
    let list = [...this.store.boards()];
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    const sort = this.sortOrder();
    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'created') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return list;
  });

  openBoard(id: string): void {
    this.store.currentBoardId.set(id);
    this.store.viewMode.set('canvas');
  }

  createNewBoard(): void {
    const id = this.store.createBoard('Untitled Whiteboard');
    this.store.currentBoardId.set(id);
    this.store.viewMode.set('canvas');
  }

  createFromTemplate(templateId: string): void {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    const name = tmpl ? tmpl.name : 'New Whiteboard';
    const id = this.store.createBoard(name, templateId);
    this.store.currentBoardId.set(id);
    this.store.viewMode.set('canvas');
  }

  formatDate(ts: number): string {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
