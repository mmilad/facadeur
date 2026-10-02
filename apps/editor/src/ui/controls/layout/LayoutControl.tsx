import type { LayoutOverride } from '@facadeur/core';
import type { ReactNode } from 'react';
import type { LayoutPatch } from '../../../domain/editing.js';
import type { LayoutCapabilities, LayoutField } from '../../../domain/layout-capabilities.js';
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
import { useTokenOptions } from '../token-options.js';
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
  capabilities,
  onCommit,
  afterField,
  resetField,
  section,
  sectionContent,
}: {
  value: LayoutControlValue;
  dimensionTokens: readonly string[];
  writingBreakpointId: string | null;
  capabilities?: LayoutCapabilities;
  onCommit: (patch: LayoutPatch) => void;
  afterField?: (key: keyof LayoutOverride) => ReactNode;
  /** Reset cue used only when a retained value is inactive in this context. */
  resetField?: (key: keyof LayoutOverride) => ReactNode;
  section?: LayoutControlSection;
  sectionContent?: LayoutControlSectionContent;
}) {
  const free = value.position === 'absolute';
  const tokenOptions = useTokenOptions();
  const margin = value.margin;
  const has = (field: LayoutField): boolean => {
    switch (field) {
      case 'direction':
        return value.direction !== undefined;
      case 'gap':
        return value.gap !== undefined;
      case 'padding':
        return value.padding !== undefined;
      case 'margin':
        return value.margin !== undefined;
      case 'justify':
        return value.justify !== undefined;
      case 'align':
        return value.align !== undefined;
      case 'wrap':
        return value.wrap !== undefined;
      case 'x':
        return value.x !== undefined;
      case 'y':
        return value.y !== undefined;
      case 'width':
        return value.width !== undefined;
      case 'height':
        return value.height !== undefined;
      case 'position':
        return true;
    }
  };
  const available = (field: LayoutField): boolean =>
    !capabilities || capabilities.availableFields.includes(field);
  const show = (field: LayoutField): boolean => available(field) || has(field);
  const reason = (field: LayoutField): string | undefined =>
    capabilities?.disabledReasons[field] ??
    (field === 'x' || field === 'y'
      ? 'X and Y are only active for absolutely positioned nodes.'
      : undefined);
  const containerFields = (['direction', 'gap', 'justify', 'align', 'wrap'] as const).filter(show);
  const capability = (field: LayoutField, children: ReactNode) => (
    <CapabilityField
      disabled={!available(field)}
      reason={reason(field)}
      reset={!available(field) ? resetField?.(field) : afterField?.(field)}
    >
      {children}
    </CapabilityField>
  );
  const showLayoutSection =
    (!section || section === 'layout') &&
    (containerFields.length > 0 || Boolean(sectionContent?.layout));

  return (
    <Stack gap={12}>
      {showLayoutSection ? (
        <Section title="Layout">
          {show('direction')
            ? capability(
                'direction',
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
                </Field>,
              )
            : null}
          {show('gap')
            ? capability(
                'gap',
                <Field label="Gap">
                  <Combobox
                    name="layout-gap"
                    value={value.gap ?? ''}
                    options={tokenOptions(dimensionTokens, value.gap)}
                    onCommit={(gap) => onCommit({ gap: gap || null })}
                  />
                </Field>,
              )
            : null}
          {show('justify')
            ? capability(
                'justify',
                <Field label="Justify">
                  <Select
                    name="layout-justify"
                    value={value.justify ?? ''}
                    options={JUSTIFY_OPTIONS}
                    onCommit={(next) => onCommit(justifyLayoutPatch(next))}
                  />
                </Field>,
              )
            : null}
          {show('align')
            ? capability(
                'align',
                <Field label="Align">
                  <Select
                    name="layout-align"
                    value={value.align ?? ''}
                    options={ALIGN_OPTIONS}
                    onCommit={(next) => onCommit(alignLayoutPatch(next))}
                  />
                </Field>,
              )
            : null}
          {show('wrap')
            ? capability(
                'wrap',
                <Toggle
                  name="layout-wrap"
                  label="Wrap"
                  value={value.wrap === true}
                  onCommit={(checked) => onCommit(wrapLayoutPatch(checked, writingBreakpointId))}
                />,
              )
            : null}
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
          {free || has('x') || has('y') ? (
            <Grid columns={2}>
              {show('x')
                ? capability(
                    'x',
                    <Field label="X">
                      <NumberInput
                        name="layout-x"
                        value={value.x ?? null}
                        onCommit={(x) => onCommit({ x })}
                      />
                    </Field>,
                  )
                : null}
              {show('y')
                ? capability(
                    'y',
                    <Field label="Y">
                      <NumberInput
                        name="layout-y"
                        value={value.y ?? null}
                        onCommit={(y) => onCommit({ y })}
                      />
                    </Field>,
                  )
                : null}
            </Grid>
          ) : null}
          {!free ? (
            <span className="eu-field__hint">Arrow keys move only free-positioned elements.</span>
          ) : null}
          {show('width')
            ? capability(
                'width',
                <AxisSizeEditor
                  label="Width"
                  name="width"
                  axis={value.width}
                  dimensionTokens={dimensionTokens}
                  onCommit={(width) => onCommit({ width })}
                />,
              )
            : null}
          {show('height')
            ? capability(
                'height',
                <AxisSizeEditor
                  label="Height"
                  name="height"
                  axis={value.height}
                  dimensionTokens={dimensionTokens}
                  onCommit={(height) => onCommit({ height })}
                />,
              )
            : null}
          {sectionContent?.size}
        </Section>
      ) : null}

      {!section || section === 'spacing' ? (
        <Section title="Spacing">
          {(value.isFrame || has('padding')) && show('padding')
            ? capability(
                'padding',
                <SpacingControl
                  legend="Padding"
                  namePrefix="layout-padding"
                  spacing={value.padding}
                  dimensionTokens={dimensionTokens}
                  onCommit={(padding) => onCommit({ padding })}
                />,
              )
            : null}
          {show('margin')
            ? capability(
                'margin',
                <SpacingControl
                  legend="Margin"
                  namePrefix="layout-margin"
                  spacing={margin}
                  dimensionTokens={dimensionTokens}
                  onCommit={(next) => onCommit({ margin: next })}
                />,
              )
            : null}
          {sectionContent?.spacing}
        </Section>
      ) : null}
    </Stack>
  );
}

function CapabilityField({
  disabled,
  reason,
  reset,
  children,
}: {
  disabled: boolean;
  reason?: string;
  reset?: ReactNode;
  children: ReactNode;
}) {
  if (!disabled)
    return (
      <>
        {children}
        {reset}
      </>
    );
  return (
    <>
      <fieldset disabled className="layout-capability-disabled">
        {children}
      </fieldset>
      <p className="meta layout-capability-note">
        {reason ?? 'This value is inactive in the current layout context.'} {reset}
      </p>
    </>
  );
}
