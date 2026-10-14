export function InlineError({ children, id }: { children: string; id?: string }) {
  return (
    <span className="eu-field__error" id={id} role="alert">
      {children}
    </span>
  );
}
