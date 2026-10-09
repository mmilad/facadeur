import type { Node } from '@facadeur/domain';
import { ids as exampleMediaIds } from './idList';

export const root: Node = {
  uuid: exampleMediaIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleMediaIds.nodes.img1,
        dom: {
          tagName: 'img',
          attributes: {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23e0e7ff'/%3E%3Ccircle cx='480' cy='90' r='42' fill='%23818cf8'/%3E%3Cpath d='M0 360L210 120L370 300L470 200L640 360Z' fill='%234f46e5'/%3E%3C/svg%3E",
            alt: 'Illustrated landscape',
          },
        },
      },
      {
        uuid: exampleMediaIds.nodes.video1,
        dom: {
          tagName: 'video',
          attributes: {
            controls: 'true',
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23e0e7ff'/%3E%3Ccircle cx='480' cy='90' r='42' fill='%23818cf8'/%3E%3Cpath d='M0 360L210 120L370 300L470 200L640 360Z' fill='%234f46e5'/%3E%3C/svg%3E",
          },
        },
      },
    ],
  },
};
