export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type AuthSession = { user: AuthUser } | null;
export interface MockSignIn {
  email: string;
  name?: string;
}
