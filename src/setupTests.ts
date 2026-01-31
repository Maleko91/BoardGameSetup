import "@testing-library/jest-dom/vitest";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

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
