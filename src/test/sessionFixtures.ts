import type { Session, User } from "@supabase/supabase-js";

type UserOverrides = Partial<User> & { id: string };

const createUser = (overrides: UserOverrides): User => ({
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
  ...overrides
});

export const createSession = (overrides: UserOverrides): Session => ({
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: createUser(overrides)
});
