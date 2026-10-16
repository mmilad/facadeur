import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import catalog from '../../../src/app/facadeur-editor.catalog.json';
import {
  SchemaCatalogEditor,
  type CatalogSchemaEntry,
} from '../../../src/ui/schema/editor/SchemaCatalogEditor';
import {
  SchemaEditor,
  type SchemaReferenceTargetChoice,
  type SchemaReferenceChoice,
} from '../../../src/ui/schema/editor/SchemaEditor';
import { iconReferenceTarget } from '../../../src/ui/schema/editor/schema';
import { catalogSchemaTitle } from '../../../src/domain/catalog/schema-display';
import type { JsonSchema } from '@facadeur/core';
import { exampleCatalog } from '@facadeur/examples';

const fixtureSchemas: Record<string, JsonSchema> = {
  ...(exampleCatalog.schemas ?? {}),
  ...(catalog.schemas as Record<string, JsonSchema>),
};
const imageSchemaId = Object.entries(fixtureSchemas).find(
  ([, schema]) => schema.title === 'Image',
)?.[0];
const imageReference = `urn:facadeur:schema:${imageSchemaId}`;
const referenceTargets: readonly SchemaReferenceTargetChoice[] = [iconReferenceTarget];

const meta = {
  title: 'Schema/Schema editor',
  component: SchemaCatalogEditor,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SchemaCatalogEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function CatalogEditorExample() {
  const [schemas, setSchemas] = useState<CatalogSchemaEntry[]>(() =>
    Object.entries(fixtureSchemas).map(([uuid, schema]) => ({
      uuid,
      schema: structuredClone(schema),
    })),
  );
  const [selectedId, setSelectedId] = useState(
    () =>
      Object.keys(fixtureSchemas).sort((a, b) =>
        catalogSchemaTitle(fixtureSchemas[a], a).localeCompare(
          catalogSchemaTitle(fixtureSchemas[b], b),
        ),
      )[0] ?? '',
  );
  const [query, setQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const references = useMemo<SchemaReferenceChoice[]>(
    () =>
      schemas.map(({ uuid, schema }) => ({
        ref: `urn:facadeur:schema:${uuid}`,
        label: catalogSchemaTitle(schema, uuid),
        group: 'Catalog schemas',
      })),
    [schemas],
  );

  return (
    <SchemaCatalogEditor
      schemas={schemas}
      selectedId={selectedId}
      query={query}
      references={references}
      referenceTargets={referenceTargets}
      isSaved={isSaved}
      onQueryChange={setQuery}
      onSelect={setSelectedId}
      onCreate={() => {
        const uuid = `storybook-${crypto.randomUUID()}`;
        setSchemas((current) => [
          ...current,
          {
            uuid,
            schema: {
              title: 'New schema',
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ]);
        setSelectedId(uuid);
        setQuery('');
        setIsSaved(false);
      }}
      onSchemaChange={(uuid, schema) => {
        setSchemas((current) =>
          current.map((entry) => (entry.uuid === uuid ? { ...entry, schema } : entry)),
        );
        setIsSaved(false);
      }}
      onDelete={(uuid) => {
        setSchemas((current) => {
          const next = current.filter((entry) => entry.uuid !== uuid);
          setSelectedId(next[0]?.uuid ?? '');
          return next;
        });
        setIsSaved(false);
      }}
      onSave={() => setIsSaved(true)}
    />
  );
}

function SingleSchemaExample() {
  const [schema, setSchema] = useState<JsonSchema>(() =>
    structuredClone(
      (imageSchemaId ? fixtureSchemas[imageSchemaId] : undefined) ?? {
        title: 'Image',
        type: 'object',
        properties: {
          src: { type: 'string' },
          alt: { type: 'string' },
          ratio: { type: 'string' },
        },
        required: ['src'],
        additionalProperties: false,
      },
    ),
  );
  const references = useMemo<SchemaReferenceChoice[]>(
    () =>
      Object.entries(fixtureSchemas).map(([uuid, referencedSchema]) => ({
        ref: `urn:facadeur:schema:${uuid}`,
        label: catalogSchemaTitle(referencedSchema, uuid),
        group: 'Catalog schemas',
      })),
    [],
  );

  return (
    <SchemaEditor
      schema={schema}
      references={references}
      referenceTargets={referenceTargets}
      onChange={setSchema}
    />
  );
}

function CompositionExamples() {
  const [oneOf, setOneOf] = useState<JsonSchema>({
    oneOf: [
      {
        title: 'Text content',
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
        additionalProperties: false,
      },
      {
        title: 'Image content',
        type: 'object',
        properties: { src: { type: 'string' }, alt: { type: 'string' } },
        required: ['src'],
        additionalProperties: false,
      },
    ],
  });
  const [anyOf, setAnyOf] = useState<JsonSchema>({
    anyOf: [
      { title: 'Email', type: 'string', format: 'email' },
      { title: 'Phone', type: 'string', pattern: '^\\+?[0-9]+$' },
    ],
  });

  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
      <SchemaEditor
        heading="One of · exactly one branch matches"
        schema={oneOf}
        references={[]}
        onChange={setOneOf}
      />
      <SchemaEditor
        heading="Any of · one or more branches match"
        schema={anyOf}
        references={[]}
        onChange={setAnyOf}
      />
    </div>
  );
}

function RecursiveReferencesExample() {
  const firstId = 'storybook-recursive-node';
  const secondId = 'storybook-recursive-parent';
  const [schemas, setSchemas] = useState<CatalogSchemaEntry[]>([
    {
      uuid: firstId,
      schema: {
        title: 'Tree node',
        type: 'object',
        properties: { parent: { $ref: `urn:facadeur:schema:${secondId}` } },
        required: ['parent'],
      },
    },
    {
      uuid: secondId,
      schema: {
        title: 'Tree parent',
        type: 'object',
        properties: { node: { $ref: `urn:facadeur:schema:${firstId}` } },
        required: ['node'],
      },
    },
  ]);
  const references = schemas.map(({ uuid, schema }) => ({
    ref: `urn:facadeur:schema:${uuid}`,
    label: String(schema.title ?? uuid),
    group: 'Catalog schemas',
  }));

  return (
    <SchemaCatalogEditor
      schemas={schemas}
      selectedId={firstId}
      query=""
      references={references}
      onQueryChange={() => undefined}
      onSelect={() => undefined}
      onCreate={() => undefined}
      onSchemaChange={(uuid, schema) =>
        setSchemas((current) =>
          current.map((entry) => (entry.uuid === uuid ? { ...entry, schema } : entry)),
        )
      }
      onDelete={() => undefined}
      onSave={() => undefined}
    />
  );
}

export const CatalogManager: Story = {
  render: () => <CatalogEditorExample />,
};

export const SingleSchema: Story = {
  render: () => <SingleSchemaExample />,
};

export const Compositions: Story = {
  render: () => <CompositionExamples />,
};

export const RecursiveReferences: Story = {
  render: () => <RecursiveReferencesExample />,
};

export const Playground: Story = {
  render: () => <CatalogEditorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Settings · Schemas' })).toBeTruthy();
    await expect(canvas.getByRole('complementary', { name: 'Schema list' })).toBeTruthy();
    await userEvent.click(canvas.getByRole('button', { name: 'Image', exact: true }));
    await expect(canvas.getByLabelText('Display name')).toHaveValue('Image');
    await userEvent.click(canvas.getByRole('button', { name: 'Icon button', exact: true }));
    await expect(canvas.getByLabelText('Display name')).toHaveValue('Icon button');
    await userEvent.click(canvas.getByRole('button', { name: 'Expand field icon' }));
    const iconReferenceTarget = canvas.getByLabelText('Reference target');
    await expect(iconReferenceTarget).toHaveValue('icon');
    await userEvent.selectOptions(iconReferenceTarget, '');
    await userEvent.selectOptions(iconReferenceTarget, 'icon');

    await userEvent.click(canvas.getByRole('button', { name: 'New schema', exact: true }));
    const displayName = canvas.getByLabelText('Display name');
    await expect(displayName).toHaveValue('New schema');
    await userEvent.clear(displayName);
    await userEvent.type(displayName, 'Storybook test schema');

    await userEvent.click(canvas.getAllByRole('button', { name: 'Add field' }).at(-1)!);
    const newField = canvas.getByRole('group', { name: 'field1' });
    const disclosure = canvas.getByRole('button', { name: 'Expand field field1' });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    const nameInput = within(newField).getByRole('textbox', { name: 'Field name' });
    const descriptionInput = within(newField).getByRole('textbox', {
      name: 'Description for field1',
    });
    const requiredInput = within(newField).getByRole('checkbox', { name: 'Required field1' });
    await expect(nameInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await expect(requiredInput).toBeVisible();
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'An example field');
    await userEvent.click(requiredInput);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(disclosure);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const minLength = within(newField).getByLabelText('Minimum length');
    const maxLength = within(newField).getByLabelText('Maximum length');
    const pattern = within(newField).getByLabelText('Pattern (regex)');
    const format = within(newField).getByLabelText('Format');
    await userEvent.type(minLength, '2');
    await userEvent.type(maxLength, '64');
    await userEvent.click(pattern);
    await userEvent.paste('^[a-z]+$');
    await userEvent.type(format, 'email');
    const output = canvas.getByText('JSON Schema output').closest('details');
    await userEvent.click(canvas.getByText('JSON Schema output'));
    await expect(output?.querySelector('pre')).toHaveTextContent('"minLength": 2');
    await expect(output?.querySelector('pre')).toHaveTextContent('"maxLength": 64');
    await expect(output?.querySelector('pre')).toHaveTextContent('"pattern": "^[a-z]+$"');
    await expect(output?.querySelector('pre')).toHaveTextContent('"format": "email"');
    await userEvent.clear(maxLength);
    await expect(output?.querySelector('pre')).not.toHaveTextContent('"maxLength"');
    await userEvent.selectOptions(within(newField).getByLabelText('Type'), 'enum');
    const enumValues = within(newField).getByLabelText('Allowed values');
    await expect(within(newField).getByLabelText('Required field1')).toBeVisible();
    await userEvent.type(enumValues, 'primary');
    await userEvent.tab();
    await expect(within(newField).getByLabelText('Allowed values')).toHaveValue('');
    await expect(within(newField).getByRole('button', { name: 'Remove primary' })).toBeTruthy();
    await userEvent.click(disclosure);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(canvas.getByRole('button', { name: 'Expand field field1' }));

    await userEvent.click(canvas.getAllByRole('button', { name: 'Add field' }).at(-1)!);
    const referenceField = canvas.getByRole('group', { name: 'field2' });
    await userEvent.selectOptions(within(referenceField).getByLabelText('Type'), 'reference');
    await userEvent.click(canvas.getByRole('button', { name: 'Expand field field2' }));
    await userEvent.selectOptions(
      within(referenceField).getByLabelText('Reference'),
      imageReference,
    );
    await expect(output?.querySelector('pre')).toHaveTextContent(imageReference);

    await userEvent.click(canvas.getAllByRole('button', { name: 'Add field' }).at(-1)!);
    const field3 = canvas.getByRole('group', { name: 'field3' });
    await userEvent.selectOptions(within(field3).getByLabelText('Type'), 'integer');
    await userEvent.click(canvas.getAllByRole('button', { name: 'Add field' }).at(-1)!);
    const field4 = canvas.getByRole('group', { name: 'field4' });
    await expect(canvas.getByRole('group', { name: 'field3' })).toBeTruthy();
    await expect(within(field3).getByLabelText('Type')).toHaveValue('integer');
    await expect(within(field4).getByLabelText('Field name')).toHaveValue('field4');
    await userEvent.click(canvas.getByRole('button', { name: 'Remove field field2' }));
    await userEvent.click(canvas.getAllByRole('button', { name: 'Add field' }).at(-1)!);
    const field5 = canvas.getByRole('group', { name: 'field5' });
    await expect(within(field3).getByLabelText('Type')).toHaveValue('integer');
    await expect(within(field5).getByLabelText('Field name')).toHaveValue('field5');

    await userEvent.click(canvas.getByRole('button', { name: 'Remove field field1' }));
    await expect(canvas.queryByRole('group', { name: 'field1' })).toBeNull();

    await userEvent.selectOptions(canvas.getByLabelText('Root type'), 'reference');
    await userEvent.selectOptions(canvas.getByLabelText('Reference'), imageReference);
    await expect(output?.querySelector('pre')).toHaveTextContent(`"$ref": "${imageReference}"`);

    await userEvent.selectOptions(canvas.getByLabelText('Root type'), 'array');
    await userEvent.selectOptions(canvas.getByLabelText('Item type'), 'reference');
    await userEvent.selectOptions(canvas.getByLabelText('Item reference'), imageReference);
    await expect(output?.querySelector('pre')).toHaveTextContent(`"$ref": "${imageReference}"`);

    await userEvent.click(canvas.getByRole('button', { name: 'Save schemas to project' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Changes saved');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete schema' }));
    await expect(
      canvas.queryByRole('button', { name: 'Storybook test schema', exact: true }),
    ).toBeNull();
  },
};
