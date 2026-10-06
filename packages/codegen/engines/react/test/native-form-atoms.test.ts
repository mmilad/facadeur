import { describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { JSDOM } from 'jsdom';
import { generateReact } from '../src/index';
import { generatedRuntime } from './generated-runtime';
import select from '../../../../../examples/atoms/form-native-select.json';
import textarea from '../../../../../examples/atoms/form-textarea.json';
import checkbox from '../../../../../examples/atoms/form-checkbox.json';
import radio from '../../../../../examples/atoms/form-radio.json';
import radioOption from '../../../../../examples/components/form-radio-option.json';
import radioGroup from '../../../../../examples/components/form-radio-group.json';
import checkboxOption from '../../../../../examples/components/form-checkbox-option.json';
import checkboxGroup from '../../../../../examples/components/form-checkbox-group.json';

describe('native form atom output', () => {
  it('renders labeled native choice groups from structured option arrays', () => {
    const files = generateReact({
      documents: validateCatalog([
        radio,
        checkbox,
        radioOption,
        radioGroup,
        checkboxOption,
        checkboxGroup,
      ]),
    }).ui;
    const runtime = generatedRuntime(files);
    for (const kind of ['Radio', 'Checkbox']) {
      const component = runtime.load(`components/Form${kind}Group`)[`Form${kind}Group`];
      const html = runtime.server.renderToStaticMarkup(
        runtime.react.createElement(component, {
          name: 'choices',
          options: [
            { label: 'First', value: 'first', checked: true, disabled: false },
            { label: 'Second', value: 'second', checked: false, disabled: true },
          ],
        }),
      );
      const dom = new JSDOM(html);
      const controls = [...dom.window.document.querySelectorAll('input')];
      expect(controls).toHaveLength(2);
      expect(controls.map((control) => control.type)).toEqual([
        kind.toLowerCase(),
        kind.toLowerCase(),
      ]);
      expect(controls.map((control) => control.name)).toEqual(['choices', 'choices']);
      expect(controls[0]?.checked).toBe(true);
      expect(controls[1]?.disabled).toBe(true);
      expect(dom.window.document.querySelectorAll('label')).toHaveLength(2);
      expect(dom.window.document.body.textContent).toContain('First');
      dom.window.close();
    }
  });
  it('generates uncontrolled form controls, typed callbacks and native options without runtime dependencies', () => {
    const generated = generateReact({
      documents: validateCatalog([select, textarea, checkbox, radio]),
    });
    const runtime = generatedRuntime(generated.ui);
    const html = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(runtime.load('components/FormNativeSelect').FormNativeSelect, {
        value: 'second',
        options: [
          { label: 'First', value: 'first' },
          { label: 'Second', value: 'second', disabled: true },
        ],
      }),
    );
    const dom = new JSDOM(html);
    const control = dom.window.document.querySelector('select')!;
    expect(control.value).toBe('second');
    expect(control.options).toHaveLength(2);
    expect(control.options[1]?.disabled).toBe(true);
    const components = generated.ui
      .filter((file) => file.path.endsWith('component.tsx'))
      .map((file) => file.contents)
      .join('\n');
    expect(components).toContain('defaultValue={value}');
    expect(components).toContain('defaultChecked={checked}');
    expect(components).toContain('reactEvent.currentTarget.checked');
    const calls: string[] = [];
    const rendered = runtime.load('components/FormNativeSelect').FormNativeSelect as (
      props: Record<string, unknown>,
    ) => { props: { onChange: (event: unknown) => void } };
    const element = rendered({
      options: [],
      onChange: () => calls.push('change'),
      onCommit: () => calls.push('commit'),
    });
    element.props.onChange({ nativeEvent: { type: 'change' }, currentTarget: { value: 'second' } });
    expect(calls).toEqual(['change', 'commit']);
    expect(components).toContain('onChange');
    expect(components).not.toContain("from '@facadeur/");
    const types = generated.ui
      .filter((file) => file.path.endsWith('types.ts'))
      .map((file) => file.contents)
      .join('\n');
    expect(types).toContain('onCommit');
    expect(types).toContain('onChange');
    dom.window.close();
  });
});
