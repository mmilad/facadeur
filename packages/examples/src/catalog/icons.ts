import type { IconDefinition } from '@facadeur/domain';

const lineIcon = (body: string, color = '#817f88') =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`)}`;

export const defaultIcons: IconDefinition[] = [
  {
    id: 'select',
    name: 'Select',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22m5 3 13 11-5.6.7L9.3 20 5 3Z%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'frame',
    name: 'Frame',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect x=%224%22 y=%224%22 width=%2216%22 height=%2216%22 rx=%222%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3C/svg%3E',
  },
  {
    id: 'text',
    name: 'Text',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M5 5h14M12 5v14M8.5 19h7%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'image',
    name: 'Image',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect x=%224%22 y=%225%22 width=%2216%22 height=%2214%22 rx=%222%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3Ccircle cx=%229%22 cy=%2210%22 r=%221.5%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3Cpath d=%22m5 17 4-4 3 3 2-2 5 4%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'chevron-down',
    name: 'Chevron down',
    category: 'controls',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22m4 6 4 4 4-4%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'search',
    name: 'Search',
    category: 'controls',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%226.5%22 cy=%226.5%22 r=%223.5%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22/%3E%3Cpath d=%22m9.2 9.2 4.2 4.2%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'menu',
    name: 'Menu',
    category: 'controls',
    src: lineIcon('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  },
  {
    id: 'saved',
    name: 'Saved',
    category: 'controls',
    src: lineIcon('<path d="m5 12 4 4L19 6"/>', '#277c58'),
  },
  {
    id: 'save',
    name: 'Save',
    category: 'actions',
    src: lineIcon('<path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>'),
  },
  {
    id: 'plus',
    name: 'Plus',
    category: 'actions',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22M8 3v10M3 8h10%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'close',
    name: 'Close',
    category: 'actions',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22m4 4 8 8M12 4l-8 8%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'layers',
    name: 'Layers',
    category: 'editor',
    src: lineIcon('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>'),
  },
  {
    id: 'workspace',
    name: 'Workspace',
    category: 'editor',
    src: lineIcon(
      '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
    ),
  },
  {
    id: 'components',
    name: 'Components',
    category: 'editor',
    src: lineIcon(
      '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    ),
  },
  {
    id: 'assets',
    name: 'Assets',
    category: 'editor',
    src: lineIcon(
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h8M8 10h5"/>',
    ),
  },
  {
    id: 'settings',
    name: 'Settings',
    category: 'editor',
    src: lineIcon(
      '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.2.9-1.2 2-1.4-.6a8 8 0 0 1-1.4.8l-.2 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.5-.8l-1.3.6-1.2-2 1.1-.9a7 7 0 0 1 0-1.7l-1.1-.9 1.2-2 1.3.6a8 8 0 0 1 1.5-.8l.3-1.5h2.4l.2 1.5a8 8 0 0 1 1.4.8l1.4-.6 1.2 2-1.2.9a7 7 0 0 1-.1 1.6Z"/>',
    ),
  },
  {
    id: 'viewport',
    name: 'Viewport',
    category: 'settings',
    src: lineIcon(
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M6 8h.01M6 12h.01M6 16h.01"/>',
    ),
  },
  {
    id: 'typography',
    name: 'Typography',
    category: 'settings',
    src: lineIcon('<path d="M4 6V4h16v2M12 4v16M8 20h8"/>'),
  },
  {
    id: 'schema',
    name: 'Schema',
    category: 'settings',
    src: lineIcon('<path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3M8 12h8M12 8v8"/>'),
  },
  {
    id: 'colors',
    name: 'Colors',
    category: 'settings',
    src: lineIcon(
      '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3Z"/><path d="M7.5 11h.01M10 7.5h.01M15 7.5h.01M17 11h.01"/>',
    ),
  },
  {
    id: 'spacing',
    name: 'Spacing',
    category: 'settings',
    src: lineIcon('<path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"/>'),
  },
  {
    id: 'shadow',
    name: 'Shadow',
    category: 'settings',
    src: lineIcon('<rect x="5" y="4" width="14" height="12" rx="2"/><path d="M8 19h12M8 22h9"/>'),
  },
  {
    id: 'radius',
    name: 'Radius',
    category: 'settings',
    src: lineIcon('<path d="M5 19V9a4 4 0 0 1 4-4h10"/>'),
  },
  {
    id: 'global-styles',
    name: 'Global styles',
    category: 'settings',
    src: lineIcon(
      '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
    ),
  },
];
