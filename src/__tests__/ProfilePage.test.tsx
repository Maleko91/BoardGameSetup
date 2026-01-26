import { render, screen, waitFor, within } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "../pages/ProfilePage";
import { SessionProvider } from "../context/SessionContext";
import { supabaseMock } from "../test/supabaseMock";

const renderProfilePage = () =>
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    </SessionProvider>
  );

describe("ProfilePage", () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it("allows a user to sign in", async () => {
    supabaseMock.setReady(true);
    supabaseMock.setSession(null);
    supabaseMock.enqueueAuthResponse("signInWithPassword", {
      data: { session: null },
      error: null
    });

    const user = userEvent.setup();
    renderProfilePage();

    const emailInput = await screen.findByLabelText("Email");
    await user.type(emailInput, "player@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = emailInput.closest("form");
    if (!form) {
      throw new Error("Auth form not found.");
    }
    await user.click(within(form).getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Signed in.")).toBeInTheDocument();
  });

  it("loads and saves profile settings", async () => {
    supabaseMock.setReady(true);
    supabaseMock.setSession({
      user: {
        id: "user-1",
        email: "player@example.com",
        user_metadata: { display_name: "Riley" }
      }
    } as Session);

    supabaseMock.enqueueResponse("users", "maybeSingle", {
      data: {
        id: "user-1",
        email: "player@example.com",
        display_name: "Riley",
        is_admin: false,
        created_at: null,
        updated_at: null
      },
      error: null
    });
    supabaseMock.enqueueResponse("users", "single", {
      data: {
        id: "user-1",
        email: "player@example.com",
        display_name: "New Name",
        is_admin: false,
        created_at: null,
        updated_at: null
      },
      error: null
    });

    const user = userEvent.setup();
    renderProfilePage();

    const nameInput = await screen.findByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();

    await waitFor(() => {
      const payload = supabaseMock.getLastPayload("users", "upsert") as {
        display_name?: string | null;
      };
      expect(payload?.display_name).toBe("New Name");
    });
  });
});
