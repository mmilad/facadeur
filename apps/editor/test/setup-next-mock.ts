import { vi } from 'vitest';

vi.mock('next/navigation', () => {
  const params = new URLSearchParams();
  return {
    useRouter: () => ({
      replace: vi.fn(),
      push: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => params,
  };
});
