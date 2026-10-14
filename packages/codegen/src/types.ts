import type { ProjectCatalog } from '@facadeur/domain';

export interface GenerateOptions {
  readonly catalog: ProjectCatalog;
  /** Definition UUIDs to generate; referenced definitions are included automatically. */
  readonly entries?: readonly string[];
}

export interface GeneratedFile {
  readonly path: string;
  readonly contents: string;
}

export interface GenerateOutput {
  readonly ui: readonly GeneratedFile[];
  readonly stories: readonly GeneratedFile[];
  readonly components: readonly GeneratedComponent[];
}

export interface GeneratedComponent {
  readonly exportName: string;
  readonly title: string;
  readonly props: Readonly<Record<string, unknown>>;
}
