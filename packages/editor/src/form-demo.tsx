import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AddPopover,
  ArrayField,
  Checkbox,
  ColorInput,
  Combobox,
  Divider,
  Field,
  Form,
  Grid,
  Inline,
  Modal,
  NumberInput,
  RadioGroup,
  RecordField,
  SearchInput,
  Section,
  SegmentedControl,
  Select,
  Stack,
  TextArea,
  TextInput,
  Toggle,
  type FormChangeMeta,
} from './ui/form/index.js';

type DemoValue = {
  label: string;
  description: string;
  amount: number | null;
  query: string;
  color: string;
  role: string;
  framework: string;
  alignment: string;
  plan: string;
  enabled: boolean;
  newsletter: boolean;
  tags: { name: string }[];
  declarations: Record<string, string>;
};

const initial: DemoValue = {
  label: 'Primary action',
  description: 'Used on the main call to action.',
  amount: 12,
  query: 'search me',
  color: '#3D5A80FF',
  role: 'button',
  framework: 'react',
  alignment: 'start',
  plan: 'pro',
  enabled: true,
  newsletter: false,
  tags: [{ name: 'ui' }, { name: 'forms' }],
  declarations: { padding: '8px', 'margin.top': '4px' },
};

function FormDemoApp() {
  const [value, setValue] = useState(initial);
  const [lastMeta, setLastMeta] = useState<FormChangeMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Editor form kit (v1)</h1>
      <p style={{ color: '#6b6258', marginBottom: 16 }}>
        Dev demo for primitives under <code>packages/editor/src/ui/form</code>.
      </p>
      <Form
        value={value}
        onChange={(next, meta) => {
          setValue(next);
          setLastMeta(meta);
        }}
        onCommit={(_, meta) => setLastMeta(meta)}
        density="comfortable"
      >
        <Stack gap={16}>
          <Section title="Basics">
            <Grid columns={2}>
              <Field label="Label" hint="Shown on the control">
                <TextInput name="label" />
              </Field>
              <Field label="Amount">
                <NumberInput name="amount" min={0} step={1} />
              </Field>
            </Grid>
            <Field label="Description">
              <TextArea name="description" />
            </Field>
            <Field label="Search">
              <SearchInput name="query" />
            </Field>
          </Section>

          <Section title="Color">
            <Field label="Accent">
              <ColorInput name="color" />
            </Field>
          </Section>

          <Section title="Selection">
            <Field label="Role">
              <Select
                name="role"
                options={[
                  { value: 'button', label: 'Button' },
                  { value: 'link', label: 'Link' },
                ]}
              />
            </Field>
            <Field label="Framework">
              <Combobox
                name="framework"
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'vue', label: 'Vue' },
                  { value: 'svelte', label: 'Svelte' },
                ]}
              />
            </Field>
            <Field label="Alignment">
              <SegmentedControl
                name="alignment"
                options={[
                  { value: 'start', label: 'Start' },
                  { value: 'center', label: 'Center' },
                  { value: 'end', label: 'End' },
                ]}
              />
            </Field>
            <Field label="Plan">
              <RadioGroup
                name="plan"
                label="Billing plan"
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'team', label: 'Team' },
                ]}
              />
            </Field>
            <Inline gap={16}>
              <Toggle name="enabled" label="Enabled" />
              <Checkbox name="newsletter" label="Newsletter" />
            </Inline>
          </Section>

          <Divider />

          <Section
            title="Dynamic collections"
            action={
              <AddPopover label="Add tag via popover" onConfirm={() => undefined}>
                <TextInput value={modalLabel} onChange={setModalLabel} placeholder="Tag name" />
              </AddPopover>
            }
          >
            <Field label="Tags">
              <ArrayField name="tags" defaultItem={() => ({ name: '' })}>
                {(_, __, helpers) => (
                  <Field label={`Tag ${helpers.index + 1}`}>
                    <TextInput name="name" />
                  </Field>
                )}
              </ArrayField>
            </Field>
            <Field label="CSS declarations">
              <RecordField name="declarations" />
            </Field>
          </Section>

          <Inline gap={8}>
            <button type="button" className="eu-button" onClick={() => setModalOpen(true)}>
              Open modal add flow
            </button>
          </Inline>
        </Stack>
      </Form>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add annotation"
        footer={
          <>
            <button type="button" className="eu-button" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="eu-button eu-button--primary"
              onClick={() => {
                setValue((current) => ({
                  ...current,
                  tags: [...current.tags, { name: modalLabel || 'new' }],
                }));
                setModalLabel('');
                setModalOpen(false);
              }}
            >
              Apply
            </button>
          </>
        }
      >
        <TextInput value={modalLabel} onChange={setModalLabel} placeholder="Annotation label" />
      </Modal>

      <pre
        style={{
          marginTop: 24,
          padding: 12,
          background: '#fffdf9',
          border: '1px solid #d8cfc4',
          borderRadius: 6,
          fontSize: 11,
          overflow: 'auto',
        }}
      >
        {JSON.stringify({ lastMeta, value }, null, 2)}
      </pre>
    </div>
  );
}

const root = document.querySelector('#root');
if (root instanceof HTMLElement) {
  createRoot(root).render(<FormDemoApp />);
}
