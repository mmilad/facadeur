import { BooleanInput, type BooleanInputProps } from './BooleanInput';

export function Checkbox(props: BooleanInputProps) {
  return <BooleanInput {...props} labelGap={6} />;
}
