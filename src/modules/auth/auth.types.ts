export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

export interface RequestWithUser {
  user?: AuthenticatedUser;
  headers?: Record<string, string | string[] | undefined>;
}
