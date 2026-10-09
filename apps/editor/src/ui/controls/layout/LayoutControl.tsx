import type { AxisSize, LayoutOverride } from '@facadeur/core';
import type { ReactNode } from 'react';
import type { LayoutPatch } from '../../../domain/editing';
import type { LayoutCapabilities, LayoutField } from '../../../domain/layout-capabilities';
import { Field, Grid, NumberInput, Section, Stack, Toggle } from '../../form/index';
import '../../form/form.css';
import { TokenValueControl } from '../fields/TokenValueControl';
import { AxisSizeEditor } from './axis-size-editor';
import { LayoutChoiceIcon, LayoutIconChoice } from './icon-choice';
import { SpacingControl } from '../spacing/index';
import type { LayoutControlValue } from './value';
import {
  alignLayoutPatch,
  directionPatch,
  freePositionPatch,
  justifyLayoutPatch,
  wrapLayoutPatch,
} from './value';

const JUSTIFY_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'space-between', label: 'Space between' },
] as const;

const ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
] as const;

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
  renderValueLabelScope,
  section,
  sectionContent,
  displayMode,
  onDisplayModeCommit,
  displayModeReset,
  gridEnabled = false,
  axisModes,
  customSizes,
}: {
  value: LayoutControlValue;
  dimensionTokens: readonly string[];
  writingBreakpointId: string | null;
  capabilities?: LayoutCapabilities;
  onCommit: (patch: LayoutPatch) => void;
  afterField?: (key: keyof LayoutOverride) => ReactNode;
  /** Reset cue used only when a retained value is inactive in this context. */
  resetField?: (key: keyof LayoutOverride) => ReactNode;
  /** Scope displayed token labels for values inherited from a master document. */
  renderValueLabelScope?: (field: LayoutField, content: ReactNode) => ReactNode;
  section?: LayoutControlSection;
  sectionContent?: LayoutControlSectionContent;
  displayMode?: 'flex' | 'grid' | 'flow';
  onDisplayModeCommit?: (mode: 'flex' | 'grid' | 'flow' | null) => void;
  displayModeReset?: ReactNode;
  gridEnabled?: boolean;
  axisModes?: Partial<Record<'width' | 'height', AxisSize['mode'] | '' | 'custom'>>;
  customSizes?: Partial<Record<'width' | 'height', string>>;
}) {
  const free = value.position === 'absolute';
  const horizontal = value.direction === 'row';
  const mainAxisLabel = `Main axis (${horizontal ? 'Horizontal' : 'Vertical'})`;
  const crossAxisLabel = `Cross axis (${horizontal ? 'Vertical' : 'Horizontal'})`;
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
  const show = (field: LayoutField): boolean =>
    !(
      (displayMode ?? capabilities?.selectedDisplay) === 'grid' &&
      ['direction', 'gap', 'justify', 'align', 'wrap'].includes(field)
    ) &&
    (available(field) || has(field));
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
      {renderValueLabelScope ? renderValueLabelScope(field, children) : children}
    </CapabilityField>
  );
  const showLayoutSection =
    (!section || section === 'layout') &&
    (value.isFrame || containerFields.length > 0 || Boolean(sectionContent?.layout));

  return (
    <Stack gap={12}>
      {showLayoutSection ? (
        <Section title="Layout">
          {value.isFrame ? (
            <>
              <Field label="Layout mode">
                <LayoutIconChoice
                  label="Layout mode"
                  value={displayMode ?? capabilities?.selectedDisplay ?? 'flex'}
                  disabled={!onDisplayModeCommit}
                  options={[
                    {
                      value: 'flow',
                      label: 'None',
                      title: 'No layout (normal flow)',
                      icon: <LayoutChoiceIcon kind="flow" />,
                      showLabel: true,
                    },
                    {
                      value: 'flex',
                      label: 'Flex',
                      icon: <LayoutChoiceIcon kind="flex" />,
                      showLabel: true,
                    },
                    {
                      value: 'grid',
                      label: 'Grid',
                      icon: <LayoutChoiceIcon kind="grid" />,
                      showLabel: true,
                      disabled: !gridEnabled,
                      title: gridEnabled ? 'Grid layout' : 'Grid (editing is not yet available)',
                    },
                  ]}
                  onCommit={(mode) => {
                    if (mode === 'flex' || mode === 'flow' || (gridEnabled && mode === 'grid'))
                      onDisplayModeCommit?.(mode);
                  }}
                />
              </Field>
              {displayModeReset}
            </>
          ) : null}
          {show('direction')
            ? capability(
                'direction',
                <Field label="Direction">
                  <LayoutIconChoice
                    label="Direction"
                    value={value.direction ?? ''}
                    options={[
                      {
                        value: '',
                        label: 'Inherit direction',
                        title: 'Use inherited direction (vertical by default)',
                        icon: <LayoutChoiceIcon kind="default" />,
                      },
                      { value: 'row', label: 'Horizontal', icon: <LayoutChoiceIcon kind="row" /> },
                      {
                        value: 'column',
                        label: 'Vertical',
                        icon: <LayoutChoiceIcon kind="column" />,
                      },
                    ]}
                    onCommit={(next) => onCommit(directionPatch(next))}
                  />
                </Field>,
              )
            : null}
          {show('gap')
            ? capability(
                'gap',
                <TokenValueControl
                  name="layout-gap"
                  label="Gap"
                  value={value.gap ?? ''}
                  tokens={dimensionTokens}
                  onCommit={(gap) => onCommit({ gap })}
                />,
              )
            : null}
          {show('justify')
            ? capability(
                'justify',
                <Field label={mainAxisLabel}>
                  <LayoutIconChoice
                    label={mainAxisLabel}
                    value={value.justify ?? ''}
                    options={JUSTIFY_OPTIONS.map((option) => ({
                      ...option,
                      label: `${mainAxisLabel}: ${option.label}`,
                      title: option.value === '' ? 'Use inherited main-axis alignment' : undefined,
                      icon: (
                        <LayoutChoiceIcon kind={option.value || 'default'} vertical={!horizontal} />
                      ),
                    }))}
                    onCommit={(next) => onCommit(justifyLayoutPatch(next))}
                  />
                </Field>,
              )
            : null}
          {show('align')
            ? capability(
                'align',
                <Field label={crossAxisLabel}>
                  <LayoutIconChoice
                    label={crossAxisLabel}
                    value={value.align ?? ''}
                    options={ALIGN_OPTIONS.map((option) => ({
                      ...option,
                      label: `${crossAxisLabel}: ${option.label}`,
                      title: option.value === '' ? 'Use inherited cross-axis alignment' : undefined,
                      icon: (
                        <LayoutChoiceIcon
                          kind={option.value || 'default'}
                          vertical={horizontal}
                          cross
                        />
                      ),
                    }))}
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
                  modeValue={axisModes?.width}
                  customValue={customSizes?.width}
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
                  modeValue={axisModes?.height}
                  customValue={customSizes?.height}
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
                  allowRaw
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
                  allowRaw
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
