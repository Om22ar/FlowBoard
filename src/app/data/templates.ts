import { CanvasObject, DrawingStroke } from '../models/whiteboard.models';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  objects: CanvasObject[];
  strokes: DrawingStroke[];
}

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'action-plan',
    name: 'Action Plan & Goal Strategy',
    description: 'Turn vision into actionable execution steps with structured phases and milestone dates.',
    icon: 'assignment_turned_in',
    category: 'Planning',
    strokes: [
      {
        id: 'stroke-header-underline',
        points: [
          { x: 300, y: 70, pressure: 0.6 },
          { x: 420, y: 72, pressure: 0.8 },
          { x: 550, y: 69, pressure: 0.7 },
          { x: 680, y: 71, pressure: 0.5 }
        ],
        color: '#10b981',
        width: 4,
        opacity: 0.85,
        tool: 'highlighter',
        smoothing: true
      }
    ],
    objects: [
      // Frame 1
      {
        id: 'frame-1',
        type: 'frame',
        x: 180,
        y: 20,
        width: 1040,
        height: 780,
        rotation: 0,
        zIndex: 0,
        style: {
          fill: '#ffffff',
          stroke: '#e2e8f0',
          strokeWidth: 2,
          strokeStyle: 'dashed',
          borderRadius: 16
        },
        metadata: {
          frameNumber: 1,
          frameTitle: 'Phase 1: Goal Strategy Architecture'
        }
      },
      // Header Box
      {
        id: 'obj-header-box',
        type: 'shape',
        x: 260,
        y: 90,
        width: 880,
        height: 70,
        rotation: 0,
        zIndex: 1,
        style: {
          fill: '#ffffff',
          stroke: '#1e293b',
          strokeWidth: 2,
          borderRadius: 8,
          shadow: true
        },
        content: 'freelancer_source:  An action plan that defines the intent, strategy and execution of my goals',
        metadata: {
          shapeType: 'rectangle'
        }
      },
      // Main Goal (Green)
      {
        id: 'obj-goal',
        type: 'shape',
        x: 520,
        y: 200,
        width: 360,
        height: 48,
        rotation: 0,
        zIndex: 2,
        style: {
          fill: '#d1fae5',
          stroke: '#059669',
          strokeWidth: 2,
          borderRadius: 8,
          textColor: '#064e3b',
          fontWeight: '700',
          fontSize: 18,
          textAlign: 'center'
        },
        content: 'PRIMARY GOAL',
        metadata: {
          shapeType: 'rounded-rect'
        }
      },
      // Question 1 (Pink)
      {
        id: 'obj-q1',
        type: 'shape',
        x: 500,
        y: 280,
        width: 400,
        height: 44,
        rotation: 0,
        zIndex: 2,
        style: {
          fill: '#fce7f3',
          stroke: '#db2777',
          strokeWidth: 1.5,
          borderRadius: 8,
          textColor: '#831843',
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center'
        },
        content: 'What is pushing me to make this happen?',
        metadata: {
          shapeType: 'rounded-rect'
        }
      },
      // Question 2 (Pink)
      {
        id: 'obj-q2',
        type: 'shape',
        x: 530,
        y: 350,
        width: 340,
        height: 44,
        rotation: 0,
        zIndex: 2,
        style: {
          fill: '#fce7f3',
          stroke: '#db2777',
          strokeWidth: 1.5,
          borderRadius: 8,
          textColor: '#831843',
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center'
        },
        content: 'How do I get there?',
        metadata: {
          shapeType: 'rounded-rect'
        }
      },

      // Column 1
      {
        id: 'col1-1',
        type: 'shape',
        x: 280,
        y: 450,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Define core deliverables',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col1-2',
        type: 'shape',
        x: 280,
        y: 500,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Create milestone tasks',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col1-3',
        type: 'shape',
        x: 280,
        y: 550,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Resources: Figma, Tablet',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col1-4',
        type: 'shape',
        x: 280,
        y: 600,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Status: In Progress',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col1-5',
        type: 'shape',
        x: 280,
        y: 650,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Completion: Oct 15',
        metadata: { shapeType: 'rounded-rect' }
      },

      // Column 2
      {
        id: 'col2-1',
        type: 'shape',
        x: 590,
        y: 450,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Develop UI architecture',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col2-2',
        type: 'shape',
        x: 590,
        y: 500,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Pointer & S Pen calibration',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col2-3',
        type: 'shape',
        x: 590,
        y: 550,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Resources: Win10 + Note9',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col2-4',
        type: 'shape',
        x: 590,
        y: 600,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Status: Active Testing',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col2-5',
        type: 'shape',
        x: 590,
        y: 650,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Completion: Oct 28',
        metadata: { shapeType: 'rounded-rect' }
      },

      // Column 3
      {
        id: 'col3-1',
        type: 'shape',
        x: 900,
        y: 450,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Release & team review',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col3-2',
        type: 'shape',
        x: 900,
        y: 500,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Gather stylus feedback',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col3-3',
        type: 'shape',
        x: 900,
        y: 550,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Resources: User group',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col3-4',
        type: 'shape',
        x: 900,
        y: 600,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Status: Scheduled',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'col3-5',
        type: 'shape',
        x: 900,
        y: 650,
        width: 220,
        height: 38,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1, borderRadius: 6, fontSize: 13, textColor: '#0369a1', textAlign: 'center' },
        content: 'Completion: Nov 05',
        metadata: { shapeType: 'rounded-rect' }
      },

      // Sticky notes for quick brainstorming on side
      {
        id: 'sticky-1',
        type: 'sticky',
        x: 1250,
        y: 120,
        width: 200,
        height: 200,
        rotation: -2,
        zIndex: 3,
        style: { fill: '#fef08a', stroke: '#facc15', fontSize: 14, textColor: '#713f12', shadow: true },
        content: '📌 Note for Note9:\nPress S Pen button to quickly undo mistakes during brainstorm sessions!'
      },
      {
        id: 'sticky-2',
        type: 'sticky',
        x: 1250,
        y: 350,
        width: 200,
        height: 200,
        rotation: 2,
        zIndex: 3,
        style: { fill: '#fed7aa', stroke: '#fb923c', fontSize: 14, textColor: '#7c2d12', shadow: true },
        content: '⚡ Touchscreen tip:\nPinch with 2 fingers to zoom freely or double tap to reset to 100%!'
      },

      // Connectors
      {
        id: 'conn-1',
        type: 'connector',
        x: 700,
        y: 248,
        width: 0,
        height: 32,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#64748b', strokeWidth: 2 },
        metadata: { fromId: 'obj-goal', toId: 'obj-q1', arrowEnd: true }
      },
      {
        id: 'conn-2',
        type: 'connector',
        x: 700,
        y: 324,
        width: 0,
        height: 26,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#64748b', strokeWidth: 2 },
        metadata: { fromId: 'obj-q1', toId: 'obj-q2', arrowEnd: true }
      },
      {
        id: 'conn-3',
        type: 'connector',
        x: 700,
        y: 394,
        width: -310,
        height: 56,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#64748b', strokeWidth: 2 },
        metadata: { fromId: 'obj-q2', toId: 'col1-1', arrowEnd: true }
      },
      {
        id: 'conn-4',
        type: 'connector',
        x: 700,
        y: 394,
        width: 0,
        height: 56,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#64748b', strokeWidth: 2 },
        metadata: { fromId: 'obj-q2', toId: 'col2-1', arrowEnd: true }
      },
      {
        id: 'conn-5',
        type: 'connector',
        x: 700,
        y: 394,
        width: 310,
        height: 56,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#64748b', strokeWidth: 2 },
        metadata: { fromId: 'obj-q2', toId: 'col3-1', arrowEnd: true }
      }
    ]
  },
  {
    id: 'org-chart',
    name: 'Organizational Chart',
    description: 'Visualize your team structure, leadership reporting lines, and departmental roles.',
    icon: 'account_tree',
    category: 'Organization',
    strokes: [],
    objects: [
      {
        id: 'org-ceo',
        type: 'shape',
        x: 500,
        y: 100,
        width: 240,
        height: 70,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#ede9fe', stroke: '#7c3aed', strokeWidth: 2, borderRadius: 12, textColor: '#4c1d95', textAlign: 'center', fontSize: 14, fontWeight: '700' },
        content: 'Chief Executive Officer\nElena Vance',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'org-cto',
        type: 'shape',
        x: 250,
        y: 240,
        width: 220,
        height: 65,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0e7ff', stroke: '#4f46e5', strokeWidth: 2, borderRadius: 12, textColor: '#312e81', textAlign: 'center', fontSize: 13, fontWeight: '600' },
        content: 'VP of Technology\nMarcus Brody',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'org-cpo',
        type: 'shape',
        x: 510,
        y: 240,
        width: 220,
        height: 65,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2, borderRadius: 12, textColor: '#0369a1', textAlign: 'center', fontSize: 13, fontWeight: '600' },
        content: 'VP of Product\nAria Thorne',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'org-cmo',
        type: 'shape',
        x: 770,
        y: 240,
        width: 220,
        height: 65,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#fdf2f8', stroke: '#db2777', strokeWidth: 2, borderRadius: 12, textColor: '#831843', textAlign: 'center', fontSize: 13, fontWeight: '600' },
        content: 'VP of Marketing\nDavid Chen',
        metadata: { shapeType: 'rounded-rect' }
      }
    ]
  },
  {
    id: 'customer-journey',
    name: 'Customer Journey Map',
    description: 'Optimize every customer touchpoint across Awareness, Consideration, Purchase, and Retention.',
    icon: 'alt_route',
    category: 'Strategy',
    strokes: [],
    objects: [
      {
        id: 'cj-stage-1',
        type: 'shape',
        x: 150,
        y: 120,
        width: 220,
        height: 50,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#fef3c7', stroke: '#d97706', strokeWidth: 2, borderRadius: 8, textColor: '#92400e', textAlign: 'center', fontWeight: '700' },
        content: '1. Discovery & Awareness',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'cj-stage-2',
        type: 'shape',
        x: 410,
        y: 120,
        width: 220,
        height: 50,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2, borderRadius: 8, textColor: '#1e40af', textAlign: 'center', fontWeight: '700' },
        content: '2. Evaluation & Trial',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'cj-stage-3',
        type: 'shape',
        x: 670,
        y: 120,
        width: 220,
        height: 50,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 2, borderRadius: 8, textColor: '#166534', textAlign: 'center', fontWeight: '700' },
        content: '3. Conversion & Purchase',
        metadata: { shapeType: 'rounded-rect' }
      },
      {
        id: 'cj-stage-4',
        type: 'shape',
        x: 930,
        y: 120,
        width: 220,
        height: 50,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#f3e8ff', stroke: '#9333ea', strokeWidth: 2, borderRadius: 8, textColor: '#581c87', textAlign: 'center', fontWeight: '700' },
        content: '4. Retention & Advocacy',
        metadata: { shapeType: 'rounded-rect' }
      }
    ]
  },
  {
    id: 'kanban-sprint',
    name: 'Sprint Kanban Board',
    description: 'Track workflow columns, backlog priorities, tasks in progress, and completed items.',
    icon: 'view_kanban',
    category: 'Agile',
    strokes: [],
    objects: [
      {
        id: 'kanban-col-1',
        type: 'frame',
        x: 100,
        y: 100,
        width: 280,
        height: 550,
        rotation: 0,
        zIndex: 0,
        style: { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1.5, borderRadius: 12 },
        metadata: { frameTitle: 'Backlog (3)' }
      },
      {
        id: 'kanban-col-2',
        type: 'frame',
        x: 410,
        y: 100,
        width: 280,
        height: 550,
        rotation: 0,
        zIndex: 0,
        style: { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1.5, borderRadius: 12 },
        metadata: { frameTitle: 'In Progress (2)' }
      },
      {
        id: 'kanban-col-3',
        type: 'frame',
        x: 720,
        y: 100,
        width: 280,
        height: 550,
        rotation: 0,
        zIndex: 0,
        style: { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1.5, borderRadius: 12 },
        metadata: { frameTitle: 'Done (4)' }
      },
      {
        id: 'task-1',
        type: 'task',
        x: 120,
        y: 160,
        width: 240,
        height: 100,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#ffffff', stroke: '#e2e8f0', borderRadius: 8, shadow: true },
        content: 'Implement pressure-sensitive S Pen stroke thickness',
        metadata: { statusText: 'High Priority', statusColor: '#ef4444', dueDate: 'Tomorrow' }
      },
      {
        id: 'task-2',
        type: 'task',
        x: 430,
        y: 160,
        width: 240,
        height: 100,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#ffffff', stroke: '#e2e8f0', borderRadius: 8, shadow: true },
        content: 'WebSocket pairing for Note9 companion device',
        metadata: { statusText: 'In Progress', statusColor: '#3b82f6', dueDate: 'Friday' }
      }
    ]
  },
  {
    id: 'mindmap-project',
    name: 'Brainstorm Mind Map',
    description: 'Dynamic tree of ideas with expandable and collapsible branches for creative discovery.',
    icon: 'hub',
    category: 'Ideation',
    strokes: [],
    objects: [
      {
        id: 'mind-root',
        type: 'mindmap',
        x: 550,
        y: 350,
        width: 220,
        height: 60,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#3b82f6', stroke: '#1d4ed8', textColor: '#ffffff', textAlign: 'center', fontWeight: '700', borderRadius: 30, fontSize: 16 },
        content: 'Product Vision 2026',
        metadata: { isRoot: true, childIds: ['mind-sub-1', 'mind-sub-2', 'mind-sub-3'] }
      },
      {
        id: 'mind-sub-1',
        type: 'mindmap',
        x: 250,
        y: 220,
        width: 180,
        height: 48,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#dbeafe', stroke: '#3b82f6', textColor: '#1e40af', textAlign: 'center', fontWeight: '600', borderRadius: 24, fontSize: 14 },
        content: 'User Experience',
        metadata: { parentId: 'mind-root', branchColor: '#3b82f6' }
      },
      {
        id: 'mind-sub-2',
        type: 'mindmap',
        x: 850,
        y: 220,
        width: 180,
        height: 48,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#dcfce7', stroke: '#16a34a', textColor: '#166534', textAlign: 'center', fontWeight: '600', borderRadius: 24, fontSize: 14 },
        content: 'Hardware Synergy',
        metadata: { parentId: 'mind-root', branchColor: '#16a34a' }
      },
      {
        id: 'mind-sub-3',
        type: 'mindmap',
        x: 550,
        y: 500,
        width: 180,
        height: 48,
        rotation: 0,
        zIndex: 2,
        style: { fill: '#fef3c7', stroke: '#d97706', textColor: '#92400e', textAlign: 'center', fontWeight: '600', borderRadius: 24, fontSize: 14 },
        content: 'Ecosystem Sync',
        metadata: { parentId: 'mind-root', branchColor: '#d97706' }
      },
      {
        id: 'mind-conn-1',
        type: 'connector',
        x: 430,
        y: 244,
        width: 120,
        height: 106,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#3b82f6', strokeWidth: 2.5 },
        metadata: { fromId: 'mind-root', toId: 'mind-sub-1', connectorType: 'curved' }
      },
      {
        id: 'mind-conn-2',
        type: 'connector',
        x: 770,
        y: 350,
        width: 80,
        height: -130,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#16a34a', strokeWidth: 2.5 },
        metadata: { fromId: 'mind-root', toId: 'mind-sub-2', connectorType: 'curved' }
      },
      {
        id: 'mind-conn-3',
        type: 'connector',
        x: 660,
        y: 410,
        width: 0,
        height: 90,
        rotation: 0,
        zIndex: 1,
        style: { stroke: '#d97706', strokeWidth: 2.5 },
        metadata: { fromId: 'mind-root', toId: 'mind-sub-3', connectorType: 'curved' }
      }
    ]
  }
];
