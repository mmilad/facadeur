import { Card, Input, SignIn } from '@facadeur/ui';
import { VariantDemo } from './variant-demo';

export default function Page() {
  return (
    <main>
      <header>
        <p className="kicker">facadeur</p>
        <h1>Generated for Next.js</h1>
        <p className="lede">
          These components are compiled from the design documents. Props are the fields and variant
          axes; color, type, and layout come from the generated stylesheet.
        </p>
      </header>

      <VariantDemo />

      <section className="panel">
        <h2>Input</h2>
        <Input label="Work email" name="work-email" value="ada@atelier.test" />
      </section>

      <section>
        <div className="split">
          <SignIn
            eyebrow="Account"
            title="Welcome back"
            body="The nested input still inherits this card's border token."
          />
          <Card
            eyebrow="Layout"
            title="Field notes"
            body="Props fill the template. The same card component is what the specimen places on the page."
          />
        </div>
      </section>
    </main>
  );
}
