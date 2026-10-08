import { definition as form_checkbox } from '../form-checkbox';
import { definition as form_native_select } from '../form-native-select';
import { definition as form_radio } from '../form-radio';
import { definition as form_textarea } from '../form-textarea';
import { definition as image } from '../image';
import { definition as text_body } from '../text-body';
import { definition as text_heading } from '../text-heading';
import { definition as video } from '../video';
import { definition as button } from '../button';
import { definition as form_input } from '../form-input';
import { definition as link } from '../link';
import type { ProjectCatalog } from '@facadeur/domain';

export const definitions = {
  [form_checkbox.uuid]: form_checkbox,
  [form_native_select.uuid]: form_native_select,
  [form_radio.uuid]: form_radio,
  [form_textarea.uuid]: form_textarea,
  [image.uuid]: image,
  [text_body.uuid]: text_body,
  [text_heading.uuid]: text_heading,
  [video.uuid]: video,
  [button.uuid]: button,
  [form_input.uuid]: form_input,
  [link.uuid]: link,
} satisfies ProjectCatalog['atoms'];
