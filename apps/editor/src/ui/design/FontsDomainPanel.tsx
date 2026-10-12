import { useMemo, useState } from 'react';
import type { FontFamily } from '@facadeur/core';
import { fontStack } from '@facadeur/core';
import {
  createDefaultFont,
  editedFont,
  formatFontWeightList,
  parseFontFallbacks,
  parseFontWeights,
  type FontPatch,
} from '../../domain/edits/font-edit';
import { fontFamilyTokens } from '@facadeur/core';
import type { EditorSnapshot } from '../../domain/session';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { Table, type TableRowData } from '../settings/Table';
import { TextControl } from '../controls/fields/index';
import { Field } from '../components/feedback';
import { Popover } from '../components/overlay';
import { TextInput } from '../controls/form-binding/index';
import './design-resources.css';

export function FontsDomainPanel({
  snap,
  onEvent,
}: {
  snap: EditorSnapshot;
  onEvent: (event: EditorEvent) => void;
}) {
  const fonts = useMemo(() => fontFamilyTokens(snap.design.tokens), [snap.design.tokens]);
  const [newFontLabel, setNewFontLabel] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const visibleFonts = useMemo(() => {
    if (!needle) return fonts;
    return fonts.filter((font) => {
      const source = font.value.source.type === 'google' ? font.value.source.family : 'file';
      return [font.label, font.value.family, source, font.value.source.type].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [fonts, needle]);

  function commitFont(font: Font, patch: FontPatch) {
    try {
      onEvent({
        type: EditorEventType.DesignCommandExecute,
        data: {
          command: { type: 'setToken', family: 'font', token: editedFont(font, patch) },
        },
      });
    } catch (error) {
      onEvent({
        type: EditorEventType.NoticeSet,
        data: { text: error instanceof Error ? error.message : 'Invalid font', tone: 'error' },
      });
    }
  }

  function removeFont(font: Font) {
    onEvent({
      type: EditorEventType.DesignTokenRemove,
      data: { family: 'font', uuid: font.uuid, label: font.label },
    });
    setExpandedUuid((current) => (current === font.uuid ? null : current));
  }

  function addFont() {
    try {
      const label = newFontLabel.trim();
      if (!label) throw new Error('Font label is required');
      if (fonts.some((font) => font.label.toLowerCase() === label.toLowerCase())) {
        throw new Error(`Font "${label}" already exists`);
      }
      const font = createDefaultFont(label);
      onEvent({
        type: EditorEventType.DesignCommandExecute,
        data: { command: { type: 'setToken', family: 'font', token: font } },
      });
      setNewFontLabel('');
      setExpandedUuid(font.uuid);
      setAddOpen(false);
    } catch (error) {
      onEvent({
        type: EditorEventType.NoticeSet,
        data: { text: error instanceof Error ? error.message : 'Invalid font', tone: 'error' },
      });
    }
  }

  return (
    <div className="stack design-domain-panel fonts-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project fonts. Fallbacks end with a generic family. Font files are shared across
          viewports; type size changes live on typography tokens.
        </p>
      </div>
      <Table
        id="font-search"
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search fonts"
        searchPlaceholder="Search names, ids, or source"
        count={`${visibleFonts.length} of ${fonts.length} fonts`}
        columns={[
          { id: 'label', label: 'Label', width: '16%' },
          { id: 'preview', label: 'Preview', width: '10%' },
          { id: 'family', label: 'Family', width: '18%' },
          { id: 'source', label: 'Source', width: '18%' },
          { id: 'weights', label: 'Weights', width: '27%' },
          { id: 'actions', label: 'Actions', visuallyHidden: true, width: '11%' },
        ]}
        addAction={
          <Popover
            open={addOpen}
            onOpenChange={setAddOpen}
            trigger={
              <button
                type="button"
                className="eu-icon-button"
                name="add-font-trigger"
                aria-expanded={addOpen}
                aria-haspopup="dialog"
              >
                Add font
              </button>
            }
          >
            <div className="font-add-popover">
              <Field label="Font label">
                <TextInput
                  name="new-font-label"
                  aria-label="Font label"
                  value={newFontLabel}
                  placeholder="Display"
                  onChange={setNewFontLabel}
                />
              </Field>
              <button type="button" className="text-button" name="add-font" onClick={addFont}>
                Add
              </button>
            </div>
          </Popover>
        }
        emptyState={
          visibleFonts.length === 0 ? <p className="inspector-empty">No fonts match.</p> : undefined
        }
        tableClassName="font-table"
        rows={visibleFonts.map((font): TableRowData => {
          const expanded = expandedUuid === font.uuid;
          const source =
            font.value.source.type === 'google' ? `Google · ${font.value.source.family}` : 'File';
          return renderFontTableRow({
            font,
            expanded,
            source,
            onToggle: () => setExpandedUuid(expanded ? null : font.uuid),
            onRemove: () => removeFont(font),
            onCommit: (patch) => commitFont(font, patch),
            onError: (error) =>
              onEvent({
                type: EditorEventType.NoticeSet,
                data: {
                  text: error instanceof Error ? error.message : 'Invalid font',
                  tone: 'error',
                },
              }),
          });
        })}
      />
    </div>
  );
}

type Font = FontFamily;

function renderFontTableRow({
  font,
  expanded,
  source,
  onToggle,
  onRemove,
  onCommit,
  onError,
}: {
  font: Font;
  expanded: boolean;
  source: string;
  onToggle: () => void;
  onRemove: () => void;
  onCommit: (patch: FontPatch) => void;
  onError: (error: unknown) => void;
}): TableRowData {
  const googleFamily = font.value.source.type === 'google' ? font.value.source.family : null;
  return {
    id: font.uuid,
    className: expanded ? 'font-row is-expanded' : 'font-row',
    cellClassNames: [
      undefined,
      undefined,
      'font-family-cell',
      undefined,
      undefined,
      'font-actions',
    ],
    detailsClassName: 'font-detail-row',
    details: (
      <div className="font-details">
        <section className="font-detail-section">
          <h3>Source metadata</h3>
          <TextControl
            label="Label"
            name={`font-${font.uuid}-label`}
            value={font.label}
            onCommit={(label) => {
              const trimmed = label.trim();
              if (!trimmed || trimmed === font.label) return;
              onCommit({ label: trimmed });
            }}
          />
          <TextControl
            label="Family"
            name={`font-${font.uuid}-family`}
            value={font.value.family}
            onCommit={(family) => {
              const trimmed = family.trim();
              if (!trimmed || trimmed === font.value.family) return;
              onCommit({ family: trimmed });
            }}
          />
          {googleFamily ? (
            <TextControl
              label="Google family"
              name={`font-${font.uuid}-google-family`}
              value={googleFamily}
              onCommit={(family) => {
                const trimmed = family.trim();
                if (!trimmed || trimmed === googleFamily) return;
                onCommit({ googleFamily: trimmed });
              }}
            />
          ) : (
            <p className="meta resource-detail-note">
              File source · file list editing is not supported in the UI yet.
            </p>
          )}
        </section>
        <section className="font-detail-section">
          <h3>Fallbacks and weights</h3>
          <TextControl
            label="Fallbacks"
            name={`font-${font.uuid}-fallbacks`}
            value={font.value.fallbacks.join(', ')}
            onCommit={(text) => {
              try {
                const fallbacks = parseFontFallbacks(text);
                if (fallbacks.join(', ') === font.value.fallbacks.join(', ')) return;
                onCommit({ fallbacks });
              } catch (error) {
                onError(error);
              }
            }}
          />
          <TextControl
            label="Weights"
            name={`font-${font.uuid}-weights`}
            value={font.value.weights.join(', ')}
            onCommit={(text) => {
              try {
                const weights = parseFontWeights(text);
                if (weights.join(',') === font.value.weights.join(',')) return;
                onCommit({ weights });
              } catch (error) {
                onError(error);
              }
            }}
          />
          <p className="meta">
            {formatFontWeightList(font.value.weights)}. Typography styles pick one of these.
          </p>
        </section>
      </div>
    ),
    expanded,
    toggleName: `font-details-${font.uuid}`,
    onToggle,
    cells: [
      <code>{font.label}</code>,
      <span className="font-preview" style={{ fontFamily: fontStack(font) }}>
        Aa
      </span>,
      font.value.family,
      source,
      <span className="font-weights">{formatFontWeightList(font.value.weights)}</span>,
      <button
        type="button"
        className="icon-button danger-button"
        name={`remove-font-${font.uuid}`}
        title={`Remove font ${font.label}`}
        aria-label={`Remove font ${font.label}`}
        onClick={onRemove}
      >
        <TrashIcon />
      </button>,
    ],
  };
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 5.5v7h9v-7M2.5 4h11M6 4V2.5h4V4M6.5 7.5v3M9.5 7.5v3" />
    </svg>
  );
}
