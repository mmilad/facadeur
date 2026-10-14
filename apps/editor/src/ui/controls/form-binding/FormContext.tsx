import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DesignPropOption } from '@facadeur/core';
import type { FormContextValue, FormDensity } from './types/form';
import { DEFAULT_DENSITY } from './const/index';

const FormContext = createContext<FormContextValue | null>(null);
const PathPrefixContext = createContext('');

export function FormProvider<T extends object>({
  value,
  disabled = false,
  density = DEFAULT_DENSITY,
  designPropOptions = [],
  emitChange,
  children,
}: {
  value: T;
  disabled?: boolean;
  density?: FormDensity;
  designPropOptions?: readonly DesignPropOption[];
  emitChange: FormContextValue['emitChange'];
  children: ReactNode;
}) {
  const pathPrefix = useContext(PathPrefixContext);
  const ctx = useMemo<FormContextValue<T>>(
    () => ({
      value,
      disabled,
      density,
      pathPrefix,
      designPropOptions,
      emitChange,
    }),
    [value, disabled, density, pathPrefix, designPropOptions, emitChange],
  );
  return <FormContext.Provider value={ctx as FormContextValue}>{children}</FormContext.Provider>;
}

export function PathPrefixProvider({ prefix, children }: { prefix: string; children: ReactNode }) {
  const parent = useContext(PathPrefixContext);
  const combined = parent ? `${parent}.${prefix}` : prefix;
  return <PathPrefixContext.Provider value={combined}>{children}</PathPrefixContext.Provider>;
}

export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within a Form');
  }
  return ctx;
}

export function useOptionalFormContext(): FormContextValue | null {
  return useContext(FormContext);
}

export function usePathPrefix(): string {
  return useContext(PathPrefixContext);
}

export function useDesignPropOptions(): readonly DesignPropOption[] {
  return useOptionalFormContext()?.designPropOptions ?? [];
}
