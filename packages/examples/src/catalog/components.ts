import { definition as card } from '../card';
import { definition as content_card } from '../content-card';
import { definition as form_checkbox_group } from '../form-checkbox-group';
import { definition as form_checkbox_option } from '../form-checkbox-option';
import { definition as form_radio_group } from '../form-radio-group';
import { definition as form_radio_option } from '../form-radio-option';
import { definition as fullbleed_teaser } from '../fullbleed-teaser';
import { definition as form_controls_section } from '../form-controls-section';
import { definition as form_field_row } from '../form-field-row';
import { definition as form_segmented } from '../form-segmented';
import { definition as form_select } from '../form-select';
import { definition as form_text_input } from '../form-text-input';
import { definition as form_toggle } from '../form-toggle';
import { definition as input } from '../input';
import { definition as media } from '../media';
import { definition as new_section } from '../new-section';
import { definition as product_card } from '../product-card';
import { definition as sign_in } from '../sign-in';
import { definition as specimen_section } from '../specimen-section';
import { definition as textarea } from '../textarea';
import { definition as variant_input } from '../variant-input';
import type { ProjectCatalog } from '@facadeur/domain';

export const definitions = {
  [card.uuid]: card,
  [content_card.uuid]: content_card,
  [form_checkbox_group.uuid]: form_checkbox_group,
  [form_checkbox_option.uuid]: form_checkbox_option,
  [form_radio_group.uuid]: form_radio_group,
  [form_radio_option.uuid]: form_radio_option,
  [fullbleed_teaser.uuid]: fullbleed_teaser,
  [form_controls_section.uuid]: form_controls_section,
  [form_field_row.uuid]: form_field_row,
  [form_segmented.uuid]: form_segmented,
  [form_select.uuid]: form_select,
  [form_text_input.uuid]: form_text_input,
  [form_toggle.uuid]: form_toggle,
  [input.uuid]: input,
  [media.uuid]: media,
  [new_section.uuid]: new_section,
  [product_card.uuid]: product_card,
  [sign_in.uuid]: sign_in,
  [specimen_section.uuid]: specimen_section,
  [textarea.uuid]: textarea,
  [variant_input.uuid]: variant_input,
} satisfies ProjectCatalog['components'];
