import type { Node } from '@facadeur/domain';
import { ids as exampleFullbleedTeaserIds } from './idList';
import { ids as exampleImageIds } from '../image/idList';
import { ids as exampleLinkIds } from '../link/idList';
import { ids as exampleTextBodyIds } from '../text-body/idList';
import { ids as exampleTextHeadingIds } from '../text-heading/idList';

export const root: Node = {
  uuid: exampleFullbleedTeaserIds.nodes.root,
  data: {
    name: 'Teaser',
  },
  dom: {
    tagName: 'section',
    children: [
      {
        uuid: exampleFullbleedTeaserIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleImageIds.definition,
          fieldExposure: { mode: 'manual', fields: { src: 'imageSrc', alt: 'imageAlt' } },
        },
      },
      {
        uuid: exampleFullbleedTeaserIds.nodes.div2,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFullbleedTeaserIds.nodes.div3,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleTextHeadingIds.definition,
                fieldExposure: { mode: 'manual', fields: { text: 'title' } },
              },
            },
            {
              uuid: exampleFullbleedTeaserIds.nodes.div4,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleTextBodyIds.definition,
                fieldExposure: { mode: 'manual', fields: { text: 'body' } },
              },
            },
            {
              uuid: exampleFullbleedTeaserIds.nodes.div5,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleLinkIds.definition,
                fieldExposure: {
                  mode: 'manual',
                  fields: { label: 'ctaLabel', href: 'ctaHref' },
                },
              },
            },
          ],
        },
      },
    ],
  },
};
