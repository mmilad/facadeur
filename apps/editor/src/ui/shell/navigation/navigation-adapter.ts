export interface EditorNavigationAdapter {
  readonly pathname: string;
  readonly search: string;
  push: (href: string) => void;
  replace: (href: string) => void;
}
