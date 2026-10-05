import {
  structuralChildSchemas,
  structuralCaseValue,
  structuralNodeFields,
  structuralNodeSchema,
  structuralScopeFields,
  findParent,
  type Binding,
  type ContractResolverInput,
  type FlatDocument,
  type FlatNode,
} from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import {
  dataFieldsForNode,
  DataDirectivesEditorControl,
  DisplayConditionEditor,
  fieldPathOptions,
} from '../../../controls/data/index.js';
import { HtmlTagSelect } from '../../../controls/html/index.js';
import { InstanceOverridesControl } from '../../../controls/instance/index.js';
import { TextControl } from '../../../controls/fields/index.js';
import '../../../form/form.css';
import { NodeAttributeFields } from './NodeAttributeFields.js';
import { partitionNodeAttributes } from './preview-attribute-keys.js';
import { PreviewOptionsDisclosure } from './PreviewOptionsDisclosure.js';
import { NodeBindings } from './NodeBindings.js';
import { BoundFieldValues } from './BoundFieldValues.js';
import { ownsComponentFeatures } from './component/owns-component-features.js';
import { VariantRulesEditor } from './VariantRulesEditor.js';

export function ContentPanel({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
}) {
  if (node.type === 'repeater' || node.type === 'switch') {
    return <StructuralNodeContent session={session} snap={snap} node={node} />;
  }

  const catalog = new Map(
    session.documentStores().map((store) => {
      const document = store.getDocument();
      return [document.id, document] as const;
    }),
  );
  const dataContext = { documents: catalog, schemaCatalog: snap.design.schemaCatalog };
  const inheritedScopeFields = inheritedStructuralFields(snap, catalog, dataContext);
  const fieldsAt = (nodeId: string) =>
    dataFieldsForNode(
      snap.document,
      nodeId,
      snap.documentScopeFields,
      false,
      dataContext,
      inheritedScopeFields,
    );
  const parent = findParent(snap.document, node.id);
  const structuralCase =
    node.type === 'instance' && parent?.type === 'switch'
      ? structuralCaseValue(snap.document, node, dataContext)
      : undefined;

  return (
    <>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Document</dt>
        <dd>{snap.document.name}</dd>
      </dl>
      <TextControl
        label="Name"
        name="name"
        value={node.name ?? ''}
        onCommit={(value) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'name',
            value: value.trim() ? value.trim() : null,
          })
        }
      />
      {node.type !== 'instance' ? (
        <HtmlTagSelect
          name="tag"
          value={node.tag ?? ''}
          onCommit={(value) =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'tag',
              value: value.trim() ? value.trim() : null,
            })
          }
        />
      ) : null}
      {node.type !== 'instance' &&
      (ownsComponentFeatures(snap.document.kind) || snap.document.kind === 'section') ? (
        <BoundFieldValues
          session={session}
          snap={snap}
          node={node}
          fields={node.id === snap.activeDocument.rootId ? snap.documentScopeFields : undefined}
        />
      ) : null}
      {node.type === 'text' ? (
        <TextControl
          label="Text"
          name="text"
          value={node.text ?? ''}
          multiline
          onCommit={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'text', value })
          }
        />
      ) : null}
      {node.type === 'image' ? (
        <>
          <TextControl
            label="Source"
            name="src"
            value={node.src ?? ''}
            onCommit={(value) =>
              session.execute({
                type: 'setProp',
                nodeId: node.id,
                prop: 'src',
                value: value.trim() ? value : null,
              })
            }
          />
          <TextControl
            label="Alt"
            name="alt"
            value={node.alt ?? ''}
            onCommit={(value) =>
              session.execute({ type: 'setProp', nodeId: node.id, prop: 'alt', value })
            }
          />
        </>
      ) : null}
      {node.type !== 'instance' && node.attributes ? (
        <AttributeSections
          session={session}
          node={node}
          attributes={node.attributes}
          bindings={node.bindings}
        />
      ) : null}
      {node.type !== 'instance' && ownsComponentFeatures(snap.document.kind) ? (
        <NodeBindings
          session={session}
          snap={snap}
          node={node}
          dataFields={fieldsAt(node.id)}
          schemaCatalog={snap.design.schemaCatalog}
        />
      ) : null}
      {node.type !== 'instance' ? (
        <DataDirectivesEditorControl
          conditionTitle="Render condition"
          node={node}
          fields={fieldsAt(node.id)}
          onChangeDisplayOn={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'displayOn', value })
          }
          onChangeRepeat={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'repeat', value })
          }
          onInvalid={(message) => session.setNotice(message, 'error')}
        />
      ) : (
        <DisplayConditionEditor
          condition={node.displayOn}
          paths={fieldPathOptions(fieldsAt(node.id))}
          title="Render condition"
          emptyHint={
            structuralCase
              ? `Selected automatically for type “${structuralCase}”. Add an optional condition to filter this case.`
              : undefined
          }
          onChange={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'displayOn', value })
          }
          onInvalid={(message) => session.setNotice(message, 'error')}
        />
      )}
      {node.type === 'instance' ? (
        <>
          <VariantRulesEditor
            node={node}
            fields={fieldsAt(node.id)}
            presets={snap.componentTarget?.variantPresets}
            variantLabels={snap.componentTarget?.variantLabels}
            onClearSelection={() =>
              session.execute({ type: 'setVariant', nodeId: node.id, axis: 'variant', value: null })
            }
            onChange={(value) =>
              session.execute({ type: 'setProp', nodeId: node.id, prop: 'variantRules', value })
            }
            onInvalid={(message) => session.setNotice(message, 'error')}
          />
          <InstanceFields
            session={session}
            node={node}
            snap={snap}
            dataFields={fieldsAt(node.id)}
          />
        </>
      ) : null}
      {node.type === 'instance' ? (
        <SwitchCaseNameEditor
          session={session}
          document={snap.document}
          node={node}
          context={dataContext}
        />
      ) : null}
    </>
  );
}

function inheritedStructuralFields(
  snap: EditorSnapshot,
  catalog: ReadonlyMap<string, FlatDocument>,
  context: ContractResolverInput,
) {
  let inherited: ReturnType<typeof structuralScopeFields> = [];
  for (const frame of snap.drillParents) {
    const parentDocument = catalog.get(frame.documentId);
    if (!parentDocument) continue;
    const fields = structuralScopeFields(parentDocument, frame.instanceNodeId, context, inherited);
    const aliases = fields.filter((field) =>
      ['item', 'index', 'props', 'parent'].includes(field.name),
    );
    if (aliases.length) inherited = aliases;
  }
  return inherited;
}

function StructuralNodeContent({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Extract<FlatNode, { type: 'repeater' | 'switch' }>;
}) {
  const catalog = new Map(
    session.documentStores().map((store) => {
      const document = store.getDocument();
      return [document.id, document] as const;
    }),
  );
  const context = {
    documents: catalog,
    schemaCatalog: snap.design.schemaCatalog,
  };
  const schema = structuralNodeSchema(snap.document, node.id, context);
  const targets = structuralChildSchemas(snap.document, node.id, context);
  const fields = structuralNodeFields(snap.document, context);
  return (
    <>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Document</dt>
        <dd>{snap.document.name}</dd>
      </dl>
      <TextControl
        label="Name"
        name="name"
        value={node.name ?? ''}
        onCommit={(value) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'name',
            value: value.trim() ? value.trim() : null,
          })
        }
      />
      {node.id === snap.document.rootId || node.type === 'repeater' ? (
        <BoundFieldValues
          session={session}
          snap={snap}
          node={node}
          fields={
            node.id === snap.document.rootId
              ? [...fields.values()]
              : [...fields.values()].filter((field) => field.name === 'items')
          }
        />
      ) : null}
      <section className="stack" aria-label="Structural schema">
        <h3>Derived schema</h3>
        {schema ? (
          <pre className="schema-json" data-testid="structural-node-schema">
            {JSON.stringify(schema, null, 2)}
          </pre>
        ) : (
          <p className="meta">No child targets yet. Add a component or section in Layers.</p>
        )}
      </section>
      <section className="stack" aria-label="Schema targets">
        <h3>Schema targets</h3>
        {targets.length ? (
          <ul className="structural-schema-targets" data-testid="structural-schema-targets">
            {targets.map(({ node: targetNode, path }) => {
              const target =
                snap.catalog.find((item) => item.id === targetNode.component)?.name ??
                targetNode.component;
              const dependencyPath = path
                .map((id) => {
                  const pathNode = snap.document.nodes[id];
                  if (pathNode?.type === 'instance')
                    return (
                      snap.catalog.find((item) => item.id === pathNode.component)?.name ??
                      pathNode.component
                    );
                  return pathNode?.name ?? pathNode?.type ?? id;
                })
                .join(' / ');
              return (
                <li key={path.join('/')}>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => session.selectNode(targetNode.id)}
                    aria-label={`Select ${target} schema target`}
                    title={dependencyPath}
                  >
                    {target}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="meta">No component or section targets.</p>
        )}
      </section>
    </>
  );
}

function AttributeSections({
  session,
  node,
  attributes,
  bindings,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
  attributes: Record<string, string>;
  bindings?: Binding[] | null;
}) {
  const { main, preview } = partitionNodeAttributes(attributes);
  const visibleMain = filterBoundAttributeEntries(main, bindings);
  return (
    <>
      <NodeAttributeFields session={session} node={node} entries={visibleMain} />
      <PreviewOptionsDisclosure session={session} node={node} entries={preview} />
    </>
  );
}

function filterBoundAttributeEntries(
  entries: [string, string][],
  bindings?: Binding[] | null,
): [string, string][] {
  const boundNames = boundAttributeNames(bindings);
  if (boundNames.size === 0) {
    return entries;
  }
  return entries.filter(([key]) => !boundNames.has(key.toLowerCase()));
}

function boundAttributeNames(bindings?: Binding[] | null): Set<string> {
  const names = new Set<string>();
  for (const binding of bindings ?? []) {
    if (binding.target !== 'attribute') {
      continue;
    }
    const name = binding.name?.trim();
    if (name) {
      names.add(name.toLowerCase());
    }
  }
  return names;
}

function InstanceFields({
  session,
  node,
  snap,
  dataFields,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  snap: EditorSnapshot;
  dataFields: ReturnType<typeof dataFieldsForNode>;
}) {
  const target = snap.componentTarget;
  if (!target) {
    return <p className="meta">Unknown component {node.component}.</p>;
  }
  return (
    <InstanceOverridesControl
      masterName={target.name}
      fields={snap.componentFields}
      variants={[]}
      fieldOverrides={node.fields}
      fieldBindings={node.fieldBindings}
      forwardFields={node.forwardFields !== false}
      dataFields={dataFields}
      variantOverrides={node.variants}
      onOpenMaster={() => session.openAsset(node.component, 'root')}
      showMasterAction={false}
      onSetField={(field, value) =>
        session.execute({ type: 'setField', nodeId: node.id, field, value })
      }
      onSetFieldBindings={(value) =>
        session.execute({ type: 'setProp', nodeId: node.id, prop: 'fieldBindings', value })
      }
      onSetForwardFields={(value) =>
        session.execute({ type: 'setProp', nodeId: node.id, prop: 'forwardFields', value })
      }
      onSetVariant={() => undefined}
      onInvalid={(message) => session.setNotice(message, 'error')}
    />
  );
}

function SwitchCaseNameEditor({
  session,
  document,
  node,
  context,
}: {
  session: EditorSession;
  document: FlatDocument;
  node: Extract<FlatNode, { type: 'instance' }>;
  context: ContractResolverInput;
}) {
  const parent = findParent(document, node.id);
  if (parent?.type !== 'switch') return null;
  const alternatives = structuralChildSchemas(document, parent.id, context);
  const current =
    alternatives.find((entry) => entry.node.id === node.id)?.caseValue ??
    structuralCaseValue(document, node, context);
  return (
    <TextControl
      label="Switch case"
      name="switch-case"
      value={current}
      onCommit={(raw) => {
        const value = raw.trim();
        const duplicate = alternatives.find(
          (entry) => entry.node.id !== node.id && entry.caseValue === value,
        );
        if (value && duplicate) {
          session.setNotice(`Switch case “${value}” is already used.`, 'error');
          return;
        }
        session.execute({
          type: 'setProp',
          nodeId: node.id,
          prop: 'switchCase',
          value: value || null,
        });
      }}
    />
  );
}
