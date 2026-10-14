export function HelpHint({ text }: { text: string }) {
  return (
    <span className="eu-help-hint" title={text} aria-label={text}>
      ?
    </span>
  );
}
