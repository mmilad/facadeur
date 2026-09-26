import { Field, Select } from '../../form/index.js';
import '../../form/form.css';
import { HTML_TAG_OPTIONS } from './value.js';

export function HtmlTagSelect({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const options =
    value && !HTML_TAG_OPTIONS.includes(value as (typeof HTML_TAG_OPTIONS)[number])
      ? [value, ...HTML_TAG_OPTIONS]
      : [...HTML_TAG_OPTIONS];
  return (
    <Field label="Tag">
      <Select
        name={name}
        value={value || 'div'}
        options={options.map((tag) => ({ value: tag, label: tag }))}
        onCommit={(next) => onCommit(next)}
      />
    </Field>
  );
}
