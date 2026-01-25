import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider } from "../context/SessionContext";
import RequestPage from "../pages/RequestPage";
import { supabaseMock } from "../test/supabaseMock";

const renderRequestPage = () =>
  render(
    <SessionProvider>
      <MemoryRouter>
        <RequestPage />
      </MemoryRouter>
    </SessionProvider>
  );

describe("RequestPage", () => {
  beforeEach(() => {
    supabaseMock.reset();
    supabaseMock.setReady(true);
  });

  it("prompts signed-out users and disables voting actions", async () => {
    supabaseMock.setSession(null);
    renderRequestPage();

    expect(
      await screen.findByText(
        "Create an account or sign in to add requests and upvote."
      )
    ).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit request" });
    expect(submitButton).toBeDisabled();

    const upvoteButtons = await screen.findAllByRole("button", {
      name: "Upvote"
    });
    upvoteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("lets signed-in users submit requests and upvote entries", async () => {
    supabaseMock.setSession({
      user: { id: "user-1", email: "player@example.com" }
    } as Session);

    const user = userEvent.setup();
    renderRequestPage();

    const requestInput = await screen.findByLabelText("Game or expansion name");
    await user.type(requestInput, "Ark Nova: Marine Worlds");
    await user.selectOptions(screen.getByLabelText("Request type"), "Expansion");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(
      await screen.findByRole("heading", { name: "Ark Nova: Marine Worlds" })
    ).toBeInTheDocument();

    const targetCard = screen
      .getAllByRole("listitem")
      .find((item) =>
        within(item).queryByRole("heading", { name: "Apiary" })
      );
    expect(targetCard).toBeTruthy();
    if (!targetCard) {
      return;
    }

    const voteCount = within(targetCard).getByText("31");
    await user.click(within(targetCard).getByRole("button", { name: "Upvote" }));
    expect(within(targetCard).getByText("32")).toBeInTheDocument();
    expect(voteCount).not.toBeInTheDocument();
  });
});
