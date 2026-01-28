import { render, screen, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "../context/SessionContext";
import { supabaseMock } from "../test/supabaseMock";
import { createSession } from "../test/sessionFixtures";

const SessionConsumer = () => {
  const { authLoading, session } = useSession();
  return (
    <div>
      <span>{authLoading ? "loading" : "ready"}</span>
      <span>{session ? "signed-in" : "signed-out"}</span>
    </div>
  );
};

describe("SessionContext", () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it("throws when used outside provider", () => {
    const Broken = () => {
      useSession();
      return <div />;
    };

    expect(() => render(<Broken />)).toThrow(
      "useSession must be used within SessionProvider"
    );
  });

  it("provides session state", async () => {
    render(
      <SessionProvider>
        <SessionConsumer />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument();
    });
    expect(screen.getByText("signed-out")).toBeInTheDocument();
  });

  it("updates session on auth state change", async () => {
    supabaseMock.setReady(true);
    supabaseMock.setSession(null);

    render(
      <SessionProvider>
        <SessionConsumer />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument();
    });
    expect(screen.getByText("signed-out")).toBeInTheDocument();

    supabaseMock.emitAuthChange(
      "SIGNED_IN",
      createSession({ id: "user-1", email: "admin@example.com" })
    );

    await waitFor(() => {
      expect(screen.getByText("signed-in")).toBeInTheDocument();
    });
  });
});
