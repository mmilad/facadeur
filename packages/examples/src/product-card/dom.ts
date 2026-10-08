import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-c0a5800714f9',
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-2be787034eaa',
        dom: {
          tagName: 'img',
          attributes: {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 540'%3E%3Crect width='720' height='540' fill='%23eee8df'/%3E%3Cellipse cx='360' cy='430' rx='170' ry='24' fill='%23d7cec0'/%3E%3Cpath d='M450 210h42a60 60 0 0 1 0 120h-42' fill='none' stroke='%23758674' stroke-width='28'/%3E%3Cpath d='M245 185h220v170a65 65 0 0 1-65 65h-90a65 65 0 0 1-65-65z' fill='%238b9d88'/%3E%3Cellipse cx='355' cy='185' rx='110' ry='24' fill='%23687965'/%3E%3Cellipse cx='355' cy='185' rx='90' ry='14' fill='%233f4c3e'/%3E%3C/svg%3E",
            alt: 'Sage green ceramic mug on a warm neutral background',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-323107734940',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-d4bf52b891cb',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Everyday ceramic mug',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-ba278b0f8976',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: '€24.00',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-2226d2a09f81',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                previewData: {
                  fields: {
                    label: 'buttonLabel',
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
};
