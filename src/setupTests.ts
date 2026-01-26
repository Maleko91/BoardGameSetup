import "@testing-library/jest-dom/vitest";

vi.mock("./lib/supabase", () => ({
  get supabaseReady() {
    return Boolean((globalThis as { __supabaseMockState?: { ready: boolean } })
      .__supabaseMockState?.ready);
  },
  get supabase() {
    const state = (globalThis as {
      __supabaseMockState?: { ready: boolean; client: unknown };
    }).__supabaseMockState;
    return state?.ready ? state.client : null;
  }
}));
