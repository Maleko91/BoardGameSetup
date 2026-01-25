import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { supabaseMock } from "../test/supabaseMock";

const makeGameRow = (index: number) => ({
  id: `game-${index}`,
  title: `Game ${index}`,
  players_min: 2,
  players_max: 4,
  popularity: index,
  tagline: null,
  cover_image: null
});

describe("HomePage", () => {
  beforeEach(() => {
    supabaseMock.reset();
    supabaseMock.setReady(true);
  });

  it("resets pagination on search and updates sort selection", async () => {
    supabaseMock.enqueueResponse("games", "range", {
      data: Array.from({ length: 12 }, (_, index) => makeGameRow(index + 1)),
      error: null,
      count: 24
    });
    supabaseMock.enqueueResponse("games", "range", {
      data: Array.from({ length: 12 }, (_, index) => makeGameRow(index + 13)),
      error: null,
      count: 24
    });
    supabaseMock.enqueueResponse("games", "range", {
      data: Array.from({ length: 12 }, (_, index) => makeGameRow(index + 101)),
      error: null,
      count: 12
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: "2" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    await user.type(screen.getByLabelText("Search Games"), "cascadia");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    await user.selectOptions(screen.getByRole("combobox"), "max-players");
    expect(screen.getByRole("combobox")).toHaveValue("max-players");
  });
});
