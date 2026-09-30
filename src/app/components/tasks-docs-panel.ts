import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WhiteboardStore } from '../services/whiteboard-store';
import { CanvasObject } from '../models/whiteboard.models';

export interface TaskItem {
  id: string;
  code: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'backlog';
  statusLabel: string;
  statusColor: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priorityColor: string;
  assignee: string;
  assigneeAvatar?: string;
  dueDate: string;
  checklist?: { text: string; done: boolean }[];
  description?: string;
  tags?: string[];
  url?: string;
}

export interface DocItem {
  id: string;
  title: string;
  type: 'doc' | 'spec' | 'notes' | 'roadmap' | 'brief';
  folder: string;
  updatedAt: string;
  author: string;
  icon: string;
  iconColor: string;
  excerpt: string;
  tags?: string[];
  url?: string;
}

@Component({
  selector: 'app-tasks-docs-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (store.showTasksDocsModal()) {
      <!-- Backdrop click dismiss for mobile / desktop -->
      <button
        type="button"
        aria-label="Close Tasks and Docs overlay"
        (click)="close()"
        class="fixed inset-0 z-45 bg-black/25 dark:bg-black/50 backdrop-blur-[2px] transition-opacity cursor-default border-none w-full h-full"
      ></button>

      <!-- Floating Tasks & Docs Panel -->
      <div
        class="fixed bottom-22 left-1/2 -translate-x-1/2 md:left-28 md:translate-x-0 z-50 w-[94vw] max-w-[500px] bg-white dark:bg-[#1a1b1e] border border-neutral-200/90 dark:border-neutral-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-2xl flex flex-col max-h-[620px] overflow-hidden select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <!-- ==================== VIEW 1: CREATE DOC / TASK MODAL (Exact match to Image 2 & Image 3) ==================== -->
        @if (viewMode() === 'create') {
          <!-- Header with Task / Doc Tabs and Close Circle -->
          <div class="px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div class="flex items-center gap-6">
              <!-- Task Tab -->
              <button
                type="button"
                (click)="createTab.set('task')"
                class="pb-2 text-sm font-semibold transition-all cursor-pointer relative"
                [class.text-neutral-900]="createTab() === 'task'"
                [class.dark:text-white]="createTab() === 'task'"
                [class.text-neutral-400]="createTab() !== 'task'"
                [class.hover:text-neutral-700]="createTab() !== 'task'"
              >
                <span>Task</span>
                @if (createTab() === 'task') {
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full"></div>
                }
              </button>

              <!-- Doc Tab (Active with underline in Image 2 & 3) -->
              <button
                type="button"
                (click)="createTab.set('doc')"
                class="pb-2 text-sm font-bold transition-all cursor-pointer relative"
                [class.text-neutral-900]="createTab() === 'doc'"
                [class.dark:text-white]="createTab() === 'doc'"
                [class.text-neutral-400]="createTab() !== 'doc'"
                [class.hover:text-neutral-700]="createTab() !== 'doc'"
              >
                <span>Doc</span>
                @if (createTab() === 'doc') {
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full"></div>
                }
              </button>
            </div>

            <!-- Close Circle button (Image 2 & 3) -->
            <button
              type="button"
              (click)="close()"
              title="Close (Esc)"
              class="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <!-- Body Content Area (Image 2 & 3) -->
          <div class="p-6 flex-1 overflow-y-auto space-y-4">
            <!-- Location Dropdown Pill: [ ≡+ My Docs ⌄ ] -->
            <div class="relative inline-block">
              <button
                type="button"
                (click)="toggleLocationDropdown()"
                class="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <mat-icon class="text-xs text-neutral-500">playlist_add</mat-icon>
                <span>{{ docLocation() }}</span>
                <mat-icon class="text-xs text-neutral-400">expand_more</mat-icon>
              </button>

              @if (showLocationDropdown()) {
                <div class="absolute top-full mt-1 left-0 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-1 z-30 animate-in fade-in duration-100">
                  <button
                    type="button"
                    (click)="docLocation.set('My Docs'); showLocationDropdown.set(false)"
                    class="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
                  >
                    <mat-icon class="text-xs text-blue-500">folder</mat-icon>
                    <span>My Docs</span>
                  </button>
                  <button
                    type="button"
                    (click)="docLocation.set('Engineering / Core'); showLocationDropdown.set(false)"
                    class="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
                  >
                    <mat-icon class="text-xs text-purple-500">folder</mat-icon>
                    <span>Engineering</span>
                  </button>
                  <button
                    type="button"
                    (click)="docLocation.set('Design / Wireframes'); showLocationDropdown.set(false)"
                    class="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
                  >
                    <mat-icon class="text-xs text-amber-500">folder</mat-icon>
                    <span>Design</span>
                  </button>
                </div>
              }
            </div>

            <!-- Document Title input (Image 2 & 3: 'testing') -->
            <div>
              <input
                type="text"
                [value]="newDocTitle()"
                (input)="newDocTitle.set($any($event.target).value)"
                placeholder="testing"
                class="w-full text-2xl font-extrabold text-neutral-900 dark:text-white placeholder-neutral-400 bg-transparent border-none focus:outline-none tracking-tight"
              />
            </div>

            <!-- Editor / Template Choices (Image 2 vs Image 3) -->
            @if (docContentStarted()) {
              <!-- Image 3: Active Inline Document Editor with ':: Hello' -->
              <div class="flex items-start gap-2 pt-1">
                <span class="text-neutral-300 dark:text-neutral-600 font-mono text-sm select-none cursor-grab mt-0.5">⋮⋮</span>
                <textarea
                  [value]="newDocContent()"
                  (input)="newDocContent.set($any($event.target).value)"
                  placeholder="Hello"
                  rows="4"
                  class="w-full bg-transparent resize-none focus:outline-none text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans"
                ></textarea>
              </div>
            } @else {
              <!-- Image 2: Template Choices -->
              <div class="space-y-1.5 pt-1">
                <!-- Start writing -->
                <button
                  type="button"
                  (click)="startWritingDoc()"
                  class="w-full text-left py-2 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-base text-neutral-400">description</mat-icon>
                  <span>Start writing</span>
                </button>

                <!-- Write with AI -->
                <button
                  type="button"
                  (click)="writeWithAI()"
                  class="w-full text-left py-2 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <div class="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center p-0.5">
                    <mat-icon class="text-white text-[10px]">auto_awesome</mat-icon>
                  </div>
                  <span>Write with AI</span>
                </button>

                <!-- Subheader: Add new -->
                <div class="pt-2 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                  Add new
                </div>

                <!-- Table -->
                <button
                  type="button"
                  (click)="insertTemplate('table')"
                  class="w-full text-left py-1.5 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-base text-neutral-400">grid_on</mat-icon>
                  <span>Table</span>
                </button>

                <!-- Column -->
                <button
                  type="button"
                  (click)="insertTemplate('column')"
                  class="w-full text-left py-1.5 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-base text-neutral-400">view_column</mat-icon>
                  <span>Column</span>
                </button>

                <!-- ClickUp List -->
                <button
                  type="button"
                  (click)="insertTemplate('list')"
                  class="w-full text-left py-1.5 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-base text-neutral-400">format_list_bulleted</mat-icon>
                  <span>ClickUp List</span>
                </button>
              </div>
            }
          </div>

          <!-- Bottom Footer (Image 2 & 3: [ (O) ] Private  ...  [ Create Doc ]) -->
          <div class="px-6 py-4 bg-white dark:bg-[#1a1b1e] border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3">
            <!-- Private Toggle Switch (Image 2 & 3) -->
            <button
              type="button"
              (click)="togglePrivate()"
              class="flex items-center gap-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <div
                class="w-8 h-4.5 rounded-full p-0.5 transition-colors relative"
                [class.bg-neutral-800]="isPrivate()"
                [class.dark:bg-white]="isPrivate()"
                [class.bg-neutral-300]="!isPrivate()"
                [class.dark:bg-neutral-700]="!isPrivate()"
              >
                <div
                  class="w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-900 shadow-xs transition-transform"
                  [class.translate-x-3.5]="isPrivate()"
                  [class.translate-x-0]="!isPrivate()"
                ></div>
              </div>
              <span>Private</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="viewMode.set('browse')"
                class="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                Back to list
              </button>

              <!-- [ Create Doc ] Button (Image 2 & 3: Black rounded pill button) -->
              <button
                type="button"
                (click)="submitCreateDoc()"
                class="px-5 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <span>Create {{ createTab() === 'doc' ? 'Doc' : 'Task' }}</span>
              </button>
            </div>
          </div>
        }

        <!-- ==================== VIEW 2: BROWSE RECENT TASKS & DOCS ==================== -->
        @else {
          <!-- Header with Two Tabs: Tasks and Docs -->
          <div class="px-4 pt-3.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
            <!-- Two Tabs (Tasks & Docs) -->
            <div class="flex items-center gap-1 bg-neutral-100/90 dark:bg-neutral-800/80 p-0.5 rounded-xl">
              <button
                type="button"
                (click)="activeTab.set('tasks')"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                [class.bg-white]="activeTab() === 'tasks'"
                [class.dark:bg-neutral-700]="activeTab() === 'tasks'"
                [class.text-neutral-900]="activeTab() === 'tasks'"
                [class.dark:text-white]="activeTab() === 'tasks'"
                [class.shadow-xs]="activeTab() === 'tasks'"
                [class.text-neutral-500]="activeTab() !== 'tasks'"
                [class.hover:text-neutral-800]="activeTab() !== 'tasks'"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Tasks</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200/80 dark:bg-neutral-600 font-mono">
                  {{ recentTasks.length }}
                </span>
              </button>

              <button
                type="button"
                (click)="activeTab.set('docs')"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                [class.bg-white]="activeTab() === 'docs'"
                [class.dark:bg-neutral-700]="activeTab() === 'docs'"
                [class.text-neutral-900]="activeTab() === 'docs'"
                [class.dark:text-white]="activeTab() === 'docs'"
                [class.shadow-xs]="activeTab() === 'docs'"
                [class.text-neutral-500]="activeTab() !== 'docs'"
                [class.hover:text-neutral-800]="activeTab() !== 'docs'"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span>Docs</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200/80 dark:bg-neutral-600 font-mono">
                  {{ recentDocs.length }}
                </span>
              </button>
            </div>

            <!-- Close button -->
            <button
              type="button"
              (click)="close()"
              title="Close Panel (Esc)"
              class="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>

          <!-- ==================== TASKS BROWSER TAB ==================== -->
          @if (activeTab() === 'tasks') {
            <!-- Search field for task name, ID, or URL -->
            <div class="p-3 pb-2">
              <div class="relative flex items-center">
                <mat-icon class="absolute left-2.5 text-neutral-400 text-sm pointer-events-none">search</mat-icon>
                <input
                  type="text"
                  [value]="taskSearchQuery()"
                  (input)="onTaskSearchInput($event)"
                  placeholder="Search by task name, ID, or URL..."
                  class="w-full bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs rounded-xl pl-8 pr-7 py-2 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none transition-all"
                />
                @if (taskSearchQuery()) {
                  <button
                    type="button"
                    (click)="taskSearchQuery.set('')"
                    class="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <mat-icon class="text-xs">cancel</mat-icon>
                  </button>
                }
              </div>

              <!-- Task Status Chips Filter -->
              <div class="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
                <button
                  type="button"
                  (click)="taskStatusFilter.set('all')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="taskStatusFilter() === 'all'"
                  [class.text-blue-600]="taskStatusFilter() === 'all'"
                  [class.dark:bg-blue-950/60]="taskStatusFilter() === 'all'"
                  [class.dark:text-blue-400]="taskStatusFilter() === 'all'"
                  [class.text-neutral-500]="taskStatusFilter() !== 'all'"
                  [class.hover:bg-neutral-100]="taskStatusFilter() !== 'all'"
                >
                  All ({{ recentTasks.length }})
                </button>
                <button
                  type="button"
                  (click)="taskStatusFilter.set('in_progress')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-purple-50]="taskStatusFilter() === 'in_progress'"
                  [class.text-purple-600]="taskStatusFilter() === 'in_progress'"
                  [class.dark:bg-purple-950/60]="taskStatusFilter() === 'in_progress'"
                  [class.dark:text-purple-400]="taskStatusFilter() === 'in_progress'"
                  [class.text-neutral-500]="taskStatusFilter() !== 'in_progress'"
                  [class.hover:bg-neutral-100]="taskStatusFilter() !== 'in_progress'"
                >
                  In Progress
                </button>
                <button
                  type="button"
                  (click)="taskStatusFilter.set('review')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-amber-50]="taskStatusFilter() === 'review'"
                  [class.text-amber-600]="taskStatusFilter() === 'review'"
                  [class.dark:bg-amber-950/60]="taskStatusFilter() === 'review'"
                  [class.dark:text-amber-400]="taskStatusFilter() === 'review'"
                  [class.text-neutral-500]="taskStatusFilter() !== 'review'"
                  [class.hover:bg-neutral-100]="taskStatusFilter() !== 'review'"
                >
                  Review
                </button>
                <button
                  type="button"
                  (click)="taskStatusFilter.set('todo')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="taskStatusFilter() === 'todo'"
                  [class.text-blue-600]="taskStatusFilter() === 'todo'"
                  [class.dark:bg-blue-950/60]="taskStatusFilter() === 'todo'"
                  [class.dark:text-blue-400]="taskStatusFilter() === 'todo'"
                  [class.text-neutral-500]="taskStatusFilter() !== 'todo'"
                  [class.hover:bg-neutral-100]="taskStatusFilter() !== 'todo'"
                >
                  To Do
                </button>
              </div>
            </div>

            <!-- Recent Task List with scrolling support -->
            <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1 max-h-[300px] min-h-[180px]">
              <div class="px-2 pt-1 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <span>Recent Tasks</span>
                <span>{{ filteredTasks().length }} items</span>
              </div>

              @for (task of filteredTasks(); track task.id) {
                <button
                  type="button"
                  (click)="insertTask(task)"
                  class="w-full text-left group p-2 rounded-xl border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-all cursor-pointer flex items-start gap-2.5"
                >
                  <!-- Task status icon -->
                  <div
                    class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    [style.background-color]="task.statusColor + '18'"
                    [style.color]="task.statusColor"
                  >
                    <mat-icon class="text-sm">
                      {{ task.status === 'done' ? 'check_circle' : (task.status === 'in_progress' ? 'pending' : 'assignment') }}
                    </mat-icon>
                  </div>

                  <!-- Task Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span class="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                        {{ task.code }}
                      </span>
                      <span
                        class="px-1.5 py-0.2 rounded text-[9px] font-semibold"
                        [style.background-color]="task.statusColor + '20'"
                        [style.color]="task.statusColor"
                      >
                        {{ task.statusLabel }}
                      </span>
                      <span
                        class="text-[9px] font-semibold ml-auto"
                        [style.color]="task.priorityColor"
                      >
                        {{ task.priority | uppercase }}
                      </span>
                    </div>

                    <p class="text-xs font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {{ task.title }}
                    </p>

                    <div class="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                      <span class="flex items-center gap-0.5">
                        <mat-icon class="text-[10px]">person</mat-icon>
                        {{ task.assignee }}
                      </span>
                      <span>•</span>
                      <span class="flex items-center gap-0.5">
                        <mat-icon class="text-[10px]">schedule</mat-icon>
                        {{ task.dueDate }}
                      </span>
                    </div>
                  </div>

                  <!-- Insert button hover cue -->
                  <span
                    title="Insert task onto whiteboard"
                    class="opacity-0 group-hover:opacity-100 h-6 px-2 rounded-md bg-blue-600 text-white text-[10px] font-semibold flex items-center gap-0.5 shrink-0 transition-opacity self-center shadow-xs"
                  >
                    <mat-icon class="text-[11px]">add</mat-icon>
                    <span>Insert</span>
                  </span>
                </button>
              } @empty {
                <div class="py-8 text-center text-neutral-400 text-xs">
                  <mat-icon class="text-2xl text-neutral-300 dark:text-neutral-600 mb-1">search_off</mat-icon>
                  <p>No tasks match "{{ taskSearchQuery() }}"</p>
                </div>
              }
            </div>

            <!-- Bottom Toolbar & Actions -->
            <div class="p-2.5 bg-neutral-50/90 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                type="button"
                (click)="browseAllTasks()"
                class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Browse tasks</span>
                <mat-icon class="text-xs">arrow_forward</mat-icon>
              </button>

              <!-- Create new button -->
              <button
                type="button"
                (click)="openCreateMode('task')"
                class="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <mat-icon class="text-sm">add</mat-icon>
                <span>Create new</span>
              </button>
            </div>
          }

          <!-- ==================== DOCS BROWSER TAB ==================== -->
          @else {
            <!-- Search field for docs -->
            <div class="p-3 pb-2">
              <div class="relative flex items-center">
                <mat-icon class="absolute left-2.5 text-neutral-400 text-sm pointer-events-none">search</mat-icon>
                <input
                  type="text"
                  [value]="docSearchQuery()"
                  (input)="onDocSearchInput($event)"
                  placeholder="Type to search Docs…"
                  class="w-full bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs rounded-xl pl-8 pr-7 py-2 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none transition-all"
                />
                @if (docSearchQuery()) {
                  <button
                    type="button"
                    (click)="docSearchQuery.set('')"
                    class="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <mat-icon class="text-xs">cancel</mat-icon>
                  </button>
                }
              </div>

              <!-- Doc Categories Filter -->
              <div class="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
                <button
                  type="button"
                  (click)="docCategoryFilter.set('all')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="docCategoryFilter() === 'all'"
                  [class.text-blue-600]="docCategoryFilter() === 'all'"
                  [class.dark:bg-blue-950/60]="docCategoryFilter() === 'all'"
                  [class.dark:text-blue-400]="docCategoryFilter() === 'all'"
                  [class.text-neutral-500]="docCategoryFilter() !== 'all'"
                  [class.hover:bg-neutral-100]="docCategoryFilter() !== 'all'"
                >
                  All Docs
                </button>
                <button
                  type="button"
                  (click)="docCategoryFilter.set('spec')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="docCategoryFilter() === 'spec'"
                  [class.text-blue-600]="docCategoryFilter() === 'spec'"
                  [class.dark:bg-blue-950/60]="docCategoryFilter() === 'spec'"
                  [class.dark:text-blue-400]="docCategoryFilter() === 'spec'"
                  [class.text-neutral-500]="docCategoryFilter() !== 'spec'"
                  [class.hover:bg-neutral-100]="docCategoryFilter() !== 'spec'"
                >
                  Specs
                </button>
                <button
                  type="button"
                  (click)="docCategoryFilter.set('roadmap')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="docCategoryFilter() === 'roadmap'"
                  [class.text-blue-600]="docCategoryFilter() === 'roadmap'"
                  [class.dark:bg-blue-950/60]="docCategoryFilter() === 'roadmap'"
                  [class.dark:text-blue-400]="docCategoryFilter() === 'roadmap'"
                  [class.text-neutral-500]="docCategoryFilter() !== 'roadmap'"
                  [class.hover:bg-neutral-100]="docCategoryFilter() !== 'roadmap'"
                >
                  Roadmaps
                </button>
                <button
                  type="button"
                  (click)="docCategoryFilter.set('brief')"
                  class="px-2 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-colors"
                  [class.bg-blue-50]="docCategoryFilter() === 'brief'"
                  [class.text-blue-600]="docCategoryFilter() === 'brief'"
                  [class.dark:bg-blue-950/60]="docCategoryFilter() === 'brief'"
                  [class.dark:text-blue-400]="docCategoryFilter() === 'brief'"
                  [class.text-neutral-500]="docCategoryFilter() !== 'brief'"
                  [class.hover:bg-neutral-100]="docCategoryFilter() !== 'brief'"
                >
                  Briefs
                </button>
              </div>
            </div>

            <!-- Recently opened documents list -->
            <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1 max-h-[300px] min-h-[180px]">
              <div class="px-2 pt-1 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <span>Recently Opened</span>
                <span>{{ filteredDocs().length }} docs</span>
              </div>

              @for (doc of filteredDocs(); track doc.id) {
                <button
                  type="button"
                  (click)="insertDoc(doc)"
                  class="w-full text-left group p-2.5 rounded-xl border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-all cursor-pointer flex items-start gap-2.5"
                >
                  <!-- Document icon -->
                  <div
                    class="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    [style.background-color]="doc.iconColor + '18'"
                    [style.color]="doc.iconColor"
                  >
                    <mat-icon class="text-base">{{ doc.icon }}</mat-icon>
                  </div>

                  <!-- Document Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {{ doc.folder }}
                      </span>
                      <span class="text-[9px] text-neutral-400 ml-auto">
                        {{ doc.updatedAt }}
                      </span>
                    </div>

                    <p class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {{ doc.title }}
                    </p>

                    <p class="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                      {{ doc.excerpt }}
                    </p>
                  </div>

                  <!-- Insert button hover cue -->
                  <span
                    title="Insert document card onto whiteboard"
                    class="opacity-0 group-hover:opacity-100 h-6 px-2 rounded-md bg-blue-600 text-white text-[10px] font-semibold flex items-center gap-0.5 shrink-0 transition-opacity self-center shadow-xs"
                  >
                    <mat-icon class="text-[11px]">add</mat-icon>
                    <span>Insert</span>
                  </span>
                </button>
              } @empty {
                <div class="py-8 text-center text-neutral-400 text-xs">
                  <mat-icon class="text-2xl text-neutral-300 dark:text-neutral-600 mb-1">description</mat-icon>
                  <p>No documents match "{{ docSearchQuery() }}"</p>
                </div>
              }
            </div>

            <!-- Bottom Toolbar & Actions (Clicking Create new opens Image 2 & 3 modal) -->
            <div class="p-2.5 bg-neutral-50/90 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
              <span class="text-[11px] text-neutral-500">
                Select any doc to insert card
              </span>

              <!-- Create new doc button -->
              <button
                type="button"
                (click)="openCreateMode('doc')"
                class="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <mat-icon class="text-sm">add</mat-icon>
                <span>Create new</span>
              </button>
            </div>
          }
        }

      </div>
    }
  `
})
export class TasksDocsPanel {
  readonly store = inject(WhiteboardStore);

  readonly viewMode = signal<'browse' | 'create'>('create');
  readonly createTab = signal<'task' | 'doc'>('doc');
  readonly activeTab = signal<'tasks' | 'docs'>('docs');

  // Create Mode state (Matching Image 2 & 3)
  readonly docLocation = signal<string>('My Docs');
  readonly showLocationDropdown = signal<boolean>(false);
  readonly newDocTitle = signal<string>('testing');
  readonly newDocContent = signal<string>('Hello');
  readonly docContentStarted = signal<boolean>(false);
  readonly isPrivate = signal<boolean>(false);

  togglePrivate(): void {
    this.isPrivate.update((v) => !v);
  }

  // Search queries & filters
  readonly taskSearchQuery = signal<string>('');
  readonly taskStatusFilter = signal<string>('all');
  readonly docSearchQuery = signal<string>('');
  readonly docCategoryFilter = signal<string>('all');

  onTaskSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.taskSearchQuery.set(input?.value || '');
  }

  onDocSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.docSearchQuery.set(input?.value || '');
  }

  toggleLocationDropdown(): void {
    this.showLocationDropdown.update(v => !v);
  }

  startWritingDoc(): void {
    this.docContentStarted.set(true);
    if (!this.newDocContent()) {
      this.newDocContent.set('Hello');
    }
  }

  writeWithAI(): void {
    this.docContentStarted.set(true);
    this.newDocContent.set('Executive Summary\n\nThis document outlines our technical architecture and UX specifications for high-performance whiteboard collaboration.');
    this.store.showToast('Generated document draft with AI', 'success');
  }

  insertTemplate(type: 'table' | 'column' | 'list'): void {
    this.docContentStarted.set(true);
    if (type === 'table') {
      this.newDocContent.set('| Milestone | Owner | Status |\n|---|---|---|\n| Architecture | Alex | Done |\n| UX Review | Omar | In Progress |');
    } else if (type === 'column') {
      this.newDocContent.set('Column 1: Objectives & Key Results\n\nColumn 2: Action Items & Deliverables');
    } else {
      this.newDocContent.set('• [ ] Phase 1: Interactive Touchscreen Protocol\n• [ ] Phase 2: S-Pen Pressure Calibration\n• [ ] Phase 3: Spatial Caching');
    }
  }

  openCreateMode(tab: 'task' | 'doc'): void {
    this.createTab.set(tab);
    this.viewMode.set('create');
  }

  // Realistic Tasks List
  readonly recentTasks: TaskItem[] = [
    {
      id: 'task-1',
      code: 'TSK-104',
      title: 'Redesign Mobile Onboarding & Gestures',
      status: 'in_progress',
      statusLabel: 'IN PROGRESS',
      statusColor: '#8b5cf6',
      priority: 'high',
      priorityColor: '#ef4444',
      assignee: 'Alex Morgan',
      dueDate: 'Today',
      checklist: [
        { text: 'User testing interview notes', done: true },
        { text: 'Figma prototype review', done: true },
        { text: 'Finalize animation curve presets', done: false }
      ],
      tags: ['UX', 'Mobile']
    },
    {
      id: 'task-2',
      code: 'TSK-108',
      title: 'S-Pen Pressure Calibration & Bluetooth Sync',
      status: 'review',
      statusLabel: 'REVIEW',
      statusColor: '#f59e0b',
      priority: 'urgent',
      priorityColor: '#dc2626',
      assignee: 'Sarah Kim',
      dueDate: 'Tomorrow',
      checklist: [
        { text: 'Measure 4096-level pressure steps', done: true },
        { text: 'Verify WebHID packet decoding', done: true }
      ],
      tags: ['Stylus', 'Hardware']
    },
    {
      id: 'task-3',
      code: 'TSK-112',
      title: 'Implement Live Webhook Sync Architecture',
      status: 'in_progress',
      statusLabel: 'IN PROGRESS',
      statusColor: '#3b82f6',
      priority: 'medium',
      priorityColor: '#f97316',
      assignee: 'David Lin',
      dueDate: 'Oct 5',
      checklist: [
        { text: 'Schema migrations in Firestore', done: true },
        { text: 'Connection heartbeat diagnostics', done: false }
      ],
      tags: ['Backend', 'Sync']
    },
    {
      id: 'task-4',
      code: 'TSK-119',
      title: 'Dark Mode Whiteboard Asset & Contrast Audit',
      status: 'done',
      statusLabel: 'DONE',
      statusColor: '#10b981',
      priority: 'low',
      priorityColor: '#64748b',
      assignee: 'Elena Rostova',
      dueDate: 'Completed',
      checklist: [
        { text: 'Verify WCAG AA ratio on canvas dots', done: true },
        { text: 'Update toolbar shadow tokens', done: true }
      ],
      tags: ['A11y', 'Design']
    },
    {
      id: 'task-5',
      code: 'TSK-124',
      title: 'Infinite Canvas Performance Optimization (60 FPS)',
      status: 'backlog',
      statusLabel: 'BACKLOG',
      statusColor: '#64748b',
      priority: 'high',
      priorityColor: '#ef4444',
      assignee: 'Omar Dash',
      dueDate: 'Oct 12',
      checklist: [
        { text: 'Spatial grid viewport culling', done: false },
        { text: 'Dirty rect canvas repaints', done: false }
      ],
      tags: ['Engine', 'Performance']
    },
    {
      id: 'task-6',
      code: 'TSK-130',
      title: 'Real-time Multi-cursor Presence Overlay',
      status: 'in_progress',
      statusLabel: 'IN PROGRESS',
      statusColor: '#3b82f6',
      priority: 'medium',
      priorityColor: '#3b82f6',
      assignee: 'Liam Taylor',
      dueDate: 'Oct 15',
      checklist: [
        { text: 'Interpolate peer pointer vectors', done: false }
      ],
      tags: ['Collaboration']
    }
  ];

  // Realistic Documents List
  readonly recentDocs: DocItem[] = [
    {
      id: 'doc-1',
      title: 'Whiteboard Engine Architecture & Fabric Integration Spec',
      type: 'spec',
      folder: 'Engineering / Core',
      updatedAt: '10m ago',
      author: 'Alex Morgan',
      icon: 'architecture',
      iconColor: '#2563eb',
      excerpt: 'Technical specification for zero-latency stylus input, scene-graph synchronization, and multi-layer rendering.'
    },
    {
      id: 'doc-2',
      title: 'S-Pen Low-Latency Bluetooth Benchmark Report',
      type: 'spec',
      folder: 'Product / Hardware',
      updatedAt: '2h ago',
      author: 'Sarah Kim',
      icon: 'analytics',
      iconColor: '#7c3aed',
      excerpt: 'Comparative latency benchmarks across 120Hz display refresh rates and pressure curve response times.'
    },
    {
      id: 'doc-3',
      title: 'Q4 Whiteboard Product Roadmap & Key Milestones',
      type: 'roadmap',
      folder: 'Strategy / 2026',
      updatedAt: 'Yesterday',
      author: 'Omar Dash',
      icon: 'flag',
      iconColor: '#f59e0b',
      excerpt: 'Strategic focus on real-time multi-user collaboration, companion devices, and smart spatial organization.'
    },
    {
      id: 'doc-4',
      title: 'Design System Tokens & Component Palette v3',
      type: 'brief',
      folder: 'Design / UI',
      updatedAt: '3 days ago',
      author: 'Elena Rostova',
      icon: 'palette',
      iconColor: '#ec4899',
      excerpt: 'Unified token definitions for dark mode contrast, floating pill docks, and micro-animations.'
    },
    {
      id: 'doc-5',
      title: 'Customer Feedback & Usability Interview Highlights',
      type: 'notes',
      folder: 'Research / UX',
      updatedAt: 'Sep 28',
      author: 'David Lin',
      icon: 'lightbulb',
      iconColor: '#059669',
      excerpt: 'Summary of 24 user testing sessions focusing on gesture shortcuts, floating palettes, and sticky note grouping.'
    }
  ];

  // Filtered Tasks
  readonly filteredTasks = computed(() => {
    const q = this.taskSearchQuery().toLowerCase().trim();
    const filter = this.taskStatusFilter();

    return this.recentTasks.filter((t) => {
      const matchFilter = filter === 'all' || t.status === filter;
      if (!matchFilter) return false;

      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.statusLabel.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  });

  // Filtered Docs
  readonly filteredDocs = computed(() => {
    const q = this.docSearchQuery().toLowerCase().trim();
    const cat = this.docCategoryFilter();

    return this.recentDocs.filter((d) => {
      const matchCat = cat === 'all' || d.type === cat;
      if (!matchCat) return false;

      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.folder.toLowerCase().includes(q) ||
        d.author.toLowerCase().includes(q) ||
        d.excerpt.toLowerCase().includes(q)
      );
    });
  });

  @HostListener('window:keydown.escape')
  onEsc(): void {
    if (this.store.showTasksDocsModal()) {
      this.close();
    }
  }

  close(): void {
    this.store.showTasksDocsModal.set(false);
  }

  submitCreateDoc(): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const title = this.newDocTitle().trim() || 'testing';
    const content = this.newDocContent() || 'Hello';
    const author = 'omar';
    const updatedAt = 'Today at 9:24 pm';

    if (this.createTab() === 'doc') {
      // Create Document Card (Exact replica of Image 1 in current viewport workflow position)
      const cardW = 620;
      const cardH = 580;
      const cx = (screenW / 2 - vp.x) / vp.zoom - cardW / 2;
      const cy = (screenH / 2 - vp.y) / vp.zoom - cardH / 2;

      const docObj: CanvasObject = {
        id: 'doc-' + Date.now(),
        type: 'doc',
        x: cx,
        y: cy,
        width: cardW,
        height: cardH,
        rotation: 0,
        zIndex: Date.now(),
        content: content,
        style: {
          fill: '#ffffff',
          stroke: '#e2e8f0',
          strokeWidth: 1.5,
          borderRadius: 16,
          textColor: '#0f172a',
          fontSize: 14,
          fontWeight: 'normal'
        },
        metadata: {
          isDocCard: true,
          docTitle: title,
          docFolder: this.docLocation(),
          docAuthor: author,
          docUpdatedAt: updatedAt,
          docExcerpt: content,
          docIcon: 'description',
          docIconColor: '#2563eb'
        }
      };

      this.store.addObject(docObj);
      this.store.selectedObjectId.set(docObj.id);
      this.store.activeTool.set('select');
      this.store.showToast(`Added Document "${title}" to workflow`, 'success');
    } else {
      // Create Task Card
      const cardW = 260;
      const cardH = 150;
      const cx = (screenW / 2 - vp.x) / vp.zoom - cardW / 2;
      const cy = (screenH / 2 - vp.y) / vp.zoom - cardH / 2;
      const code = `TSK-${Math.floor(100 + Math.random() * 900)}`;

      const taskObj: CanvasObject = {
        id: 'task-' + Date.now(),
        type: 'task',
        x: cx,
        y: cy,
        width: cardW,
        height: cardH,
        rotation: 0,
        zIndex: Date.now(),
        content: `${code}: ${title}\n☐ ${content}`,
        style: {
          fill: '#ffffff',
          stroke: '#cbd5e1',
          strokeWidth: 1.5,
          borderRadius: 14,
          textColor: '#0f172a',
          fontSize: 13,
          fontWeight: '600'
        },
        metadata: {
          taskCode: code,
          taskTitle: title,
          statusText: 'IN PROGRESS',
          statusColor: '#8b5cf6',
          priority: 'high',
          assignee: author,
          dueDate: 'Today'
        }
      };

      this.store.addObject(taskObj);
      this.store.selectedObjectId.set(taskObj.id);
      this.store.activeTool.set('select');
      this.store.showToast(`Added Task ${code} to workflow`, 'success');
    }

    this.close();
  }

  insertTask(task: TaskItem): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 120;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 75;

    const checklistText = task.checklist && task.checklist.length > 0
      ? '\n' + task.checklist.map((c) => `${c.done ? '✓' : '☐'} ${c.text}`).join('\n')
      : '';

    const taskObj: CanvasObject = {
      id: 'task-' + Date.now(),
      type: 'task',
      x: cx,
      y: cy,
      width: 240,
      height: 140,
      rotation: 0,
      zIndex: Date.now(),
      content: `${task.code}: ${task.title}${checklistText}`,
      style: {
        fill: '#ffffff',
        stroke: '#cbd5e1',
        strokeWidth: 1.5,
        borderRadius: 14,
        textColor: '#0f172a',
        fontSize: 13,
        fontWeight: '600'
      },
      metadata: {
        taskCode: task.code,
        taskTitle: task.title,
        statusText: task.statusLabel,
        statusColor: task.statusColor,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate
      }
    };

    this.store.addObject(taskObj);
    this.store.activeTool.set('select');
    this.store.showToast(`Inserted Task ${task.code} onto whiteboard`, 'success');
    this.close();
  }

  insertDoc(doc: DocItem): void {
    const vp = this.store.currentBoard().viewport;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cx = (screenW / 2 - vp.x) / vp.zoom - 280;
    const cy = (screenH / 2 - vp.y) / vp.zoom - 260;

    const docObj: CanvasObject = {
      id: 'doc-' + Date.now(),
      type: 'doc',
      x: Math.max(50, cx),
      y: Math.max(50, cy),
      width: 580,
      height: 560,
      rotation: 0,
      zIndex: Date.now(),
      content: doc.excerpt || 'Hello',
      style: {
        fill: '#ffffff',
        stroke: '#e2e8f0',
        strokeWidth: 1.5,
        borderRadius: 16,
        textColor: '#0f172a',
        fontSize: 14,
        fontWeight: 'normal'
      },
      metadata: {
        isDocCard: true,
        docTitle: doc.title,
        docFolder: doc.folder,
        docAuthor: doc.author,
        docUpdatedAt: doc.updatedAt,
        docExcerpt: doc.excerpt,
        docIcon: doc.icon,
        docIconColor: doc.iconColor
      }
    };

    this.store.addObject(docObj);
    this.store.activeTool.set('select');
    this.store.showToast(`Inserted Document "${doc.title}" onto whiteboard`, 'success');
    this.close();
  }

  browseAllTasks(): void {
    this.store.showToast('Opening Workspace Tasks Browser...', 'info');
  }
}
