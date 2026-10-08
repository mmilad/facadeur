import { definition as form_controls } from '../form-controls';
import { definition as specimen } from '../specimen';
import type { ProjectCatalog } from '@facadeur/domain';

export const definitions = {
  [form_controls.uuid]: form_controls,
  [specimen.uuid]: specimen,
} satisfies ProjectCatalog['pages'];
