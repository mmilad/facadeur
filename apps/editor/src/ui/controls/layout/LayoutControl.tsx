import type { LayoutOverride } from '@facadeur/core';
import type { ReactNode } from 'react';
import type { LayoutPatch } from '../../../domain/editing.js';
import {
  Combobox,
  Field,
  Grid,
  NumberInput,
  Section,
  Select,
  Stack,
  Toggle,
} from '../../form/index.js';
import '../../form/form.css';
import { dimensionTokenOptions } from '../token-options.js';
import { AxisSizeEditor } from './axis-size-editor.js';
import { SpacingControl } from '../spacing/index.js';
import type { LayoutControlValue } from './value.js';
import {
  alignLayoutPatch,
  directionPatch,
  freePositionPatch,
  justifyLayoutPatch,
  wrapLayoutPatch,
} from './value.js';

const JUSTIFY_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'space-between', label: 'space-between' },
];

const ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
];

export type LayoutControlSection = 'layout' | 'size' | 'spacing';

export type LayoutControlSectionContent = Partial<Record<LayoutControlSection, ReactNode>>;

export function LayoutControl({
  value,
  dimensionTokens,
  writingBreakpointId,
  onCommit,
  afterField,
  section,
  sectionContent,
}: {
  value: LayoutControlValue;
  dimensionTokens: readonly string[];
  writingBreakpointId: string | null;
  onCommit: (patch: LayoutPatch) => void;
  afterField?: (key: keyof LayoutOverride) => ReactNode;
  section?: LayoutControlSection;
  sectionContent?: LayoutControlSectionContent;
}) {
  const free = value.position === 'absolute';
  const margin = value.margin;

  return (
    <Stack gap={12}>
      {value.isFrame && (!section || section === 'layout') ? (
        <Section title="Layout">
          <Field label="Direction">
            <Select
              name="layout-direction"
              value={value.direction ?? ''}
              options={[
                { value: '', label: 'Default (column)' },
                { value: 'column', label: 'Column' },
                { value: 'row', label: 'Row' },
              ]}
              onCommit={(next) => onCommit(directionPatch(next))}
            />
          </Field>
          {afterField?.('direction')}
          <Field label="Gap">
            <Combobox
              name="layout-gap"
              value={value.gap ?? ''}
              options={dimensionTokenOptions(dimensionTokens, value.gap)}
              onCommit={(gap) => onCommit({ gap: gap || null })}
            />
          </Field>
          {afterField?.('gap')}
          <Field label="Justify">
            <Select
              name="layout-justify"
              value={value.justify ?? ''}
              options={JUSTIFY_OPTIONS}
              onCommit={(next) => onCommit(justifyLayoutPatch(next))}
            />
          </Field>
          {afterField?.('justify')}
          <Field label="Align">
            <Select
              name="layout-align"
              value={value.align ?? ''}
              options={ALIGN_OPTIONS}
              onCommit={(next) => onCommit(alignLayoutPatch(next))}
            />
          </Field>
          {afterField?.('align')}
          <Toggle
            name="layout-wrap"
            label="Wrap"
            value={value.wrap === true}
            onCommit={(checked) => onCommit(wrapLayoutPatch(checked, writingBreakpointId))}
          />
          {afterField?.('wrap')}
          {sectionContent?.layout}
        </Section>
      ) : null}

      {!section || section === 'size' ? (
        <Section title="Size & Position">
          <Toggle
            name="layout-free"
            label="Free position"
            value={free}
            onCommit={(checked) => onCommit(freePositionPatch(checked, writingBreakpointId))}
          />
          {afterField?.('position')}
          {free ? (
            <Grid columns={2}>
              <Field label="X">
                <NumberInput
                  name="layout-x"
                  value={value.x ?? null}
                  onCommit={(x) => onCommit({ x })}
                />
              </Field>
              <Field label="Y">
                <NumberInput
                  name="layout-y"
                  value={value.y ?? null}
                  onCommit={(y) => onCommit({ y })}
                />
              </Field>
            </Grid>
          ) : null}
          {afterField?.('x')}
          {afterField?.('y')}
          {!free ? (
            <span className="eu-field__hint">Arrow keys move only free-positioned elements.</span>
          ) : null}
          <AxisSizeEditor
            label="Width"
            name="width"
            axis={value.width}
            dimensionTokens={dimensionTokens}
            onCommit={(width) => onCommit({ width })}
          />
          {afterField?.('width')}
          <AxisSizeEditor
            label="Height"
            name="height"
            axis={value.height}
            dimensionTokens={dimensionTokens}
            onCommit={(height) => onCommit({ height })}
          />
          {afterField?.('height')}
          {sectionContent?.size}
        </Section>
      ) : null}

      {!section || section === 'spacing' ? (
        <Section title="Spacing">
          {value.isFrame ? (
            <SpacingControl
              legend="Padding"
              namePrefix="layout-padding"
              spacing={value.padding}
              dimensionTokens={dimensionTokens}
              onCommit={(padding) => onCommit({ padding })}
            />
          ) : null}
          {value.isFrame ? afterField?.('padding') : null}
          <SpacingControl
            legend="Margin"
            namePrefix="layout-margin"
            spacing={margin}
            dimensionTokens={dimensionTokens}
            onCommit={(next) => onCommit({ margin: next })}
          />
          {afterField?.('margin')}
          {sectionContent?.spacing}
        </Section>
      ) : null}
    </Stack>
  );
}
