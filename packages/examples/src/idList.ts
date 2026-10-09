import { ids as button } from './button/idList';
import { ids as card } from './card/idList';
import { ids as contentCard } from './content-card/idList';
import { ids as formCheckbox } from './form-checkbox/idList';
import { ids as formCheckboxGroup } from './form-checkbox-group/idList';
import { ids as formCheckboxOption } from './form-checkbox-option/idList';
import { ids as formControls } from './form-controls/idList';
import { ids as formControlsSection } from './form-controls-section/idList';
import { ids as formFieldRow } from './form-field-row/idList';
import { ids as formInput } from './form-input/idList';
import { ids as formNativeSelect } from './form-native-select/idList';
import { ids as formRadio } from './form-radio/idList';
import { ids as formRadioGroup } from './form-radio-group/idList';
import { ids as formRadioOption } from './form-radio-option/idList';
import { ids as formSegmented } from './form-segmented/idList';
import { ids as formSelect } from './form-select/idList';
import { ids as formTextInput } from './form-text-input/idList';
import { ids as formTextarea } from './form-textarea/idList';
import { ids as formToggle } from './form-toggle/idList';
import { ids as fullbleedTeaser } from './fullbleed-teaser/idList';
import { ids as image } from './image/idList';
import { ids as input } from './input/idList';
import { ids as link } from './link/idList';
import { ids as media } from './media/idList';
import { ids as newSection } from './new-section/idList';
import { ids as productCard } from './product-card/idList';
import { ids as signIn } from './sign-in/idList';
import { ids as specimen } from './specimen/idList';
import { ids as specimenSection } from './specimen-section/idList';
import { ids as textBody } from './text-body/idList';
import { ids as textHeading } from './text-heading/idList';
import { ids as textarea } from './textarea/idList';
import { ids as variantInput } from './variant-input/idList';
import { ids as video } from './video/idList';
import { globalIds } from './catalog/idList';
import { tokenIds } from './catalog/tokens/idList';

export const exampleIds = {
  components: {
    button,
    card,
    contentCard,
    formCheckbox,
    formCheckboxGroup,
    formCheckboxOption,
    formControls,
    formControlsSection,
    formFieldRow,
    formInput,
    formNativeSelect,
    formRadio,
    formRadioGroup,
    formRadioOption,
    formSegmented,
    formSelect,
    formTextInput,
    formTextarea,
    formToggle,
    fullbleedTeaser,
    image,
    input,
    link,
    media,
    newSection,
    productCard,
    signIn,
    specimen,
    specimenSection,
    textBody,
    textHeading,
    textarea,
    variantInput,
    video,
  },
  catalog: globalIds,
  tokens: tokenIds,
} as const;
