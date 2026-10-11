import { BooleanInput, type BooleanInputProps } from './BooleanInput';

export function Toggle(props: BooleanInputProps) {
  return <BooleanInput {...props} switchRole />;
}
