'use client';

import { useState } from 'react';
import { Button, type ButtonSize, type ButtonTone } from '@facadeur/ui';

const tones: ButtonTone[] = ['primary', 'secondary', 'ghost'];
const sizes: ButtonSize[] = ['sm', 'md'];

export function VariantDemo() {
  const [tone, setTone] = useState<ButtonTone>('primary');
  const [size, setSize] = useState<ButtonSize>('md');

  return (
    <section className="panel">
      <h2>Button props</h2>
      <div className="choices">
        {tones.map((value) => (
          <button
            key={value}
            type="button"
            className={tone === value ? 'choice choice-on' : 'choice'}
            onClick={() => setTone(value)}
          >
            {value}
          </button>
        ))}
        {sizes.map((value) => (
          <button
            key={value}
            type="button"
            className={size === value ? 'choice choice-on' : 'choice'}
            onClick={() => setSize(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="preview">
        <Button label="Continue" tone={tone} size={size} />
      </div>
    </section>
  );
}
