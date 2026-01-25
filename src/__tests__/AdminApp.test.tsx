import { render, screen, within } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminApp from "../AdminApp";
import { supabaseMock } from "../test/supabaseMock";

const seedAdminData = () => {
  supabaseMock.setReady(true);
  supabaseMock.setSession({
    user: { id: "user-1", email: "admin@example.com" }
  } as Session);

  supabaseMock.enqueueResponse("users", "maybeSingle", {
    data: { is_admin: true },
    error: null
  });
  supabaseMock.enqueueResponse("users", "select", {
    data: [],
    error: null
  });
  supabaseMock.enqueueResponse("games", "select", {
    data: [
      {
        id: "game-1",
        title: "Game One",
        players_min: 2,
        players_max: 4,
        popularity: 10,
        tagline: null,
        cover_image: null,
        rules_url: null
      }
    ],
    error: null
  });
  supabaseMock.enqueueResponse("expansions", "select", {
    data: [
      {
        id: "exp-1",
        game_id: "game-1",
        name: "Expansion One"
      }
    ],
    error: null
  });
  supabaseMock.enqueueResponse("steps", "select", {
    data: [],
    error: null
  });
};

describe("AdminApp", () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it("toggles expansion and module selection on repeat clicks", async () => {
    seedAdminData();
    supabaseMock.enqueueResponse("expansion_modules", "select", {
      data: [],
      error: null
    });
    supabaseMock.enqueueResponse("expansion_modules", "select", {
      data: [
        {
          id: "mod-1",
          expansion_id: "exp-1",
          name: "Module One",
          description: null
        }
      ],
      error: null
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminApp />
      </MemoryRouter>
    );

    const gameRow = await screen.findByText("Game One");
    await user.click(gameRow);

    const expansionRowText = await screen.findByText("Expansion One");
    const expansionRow = expansionRowText.closest(".admin-table-row");
    if (!expansionRow) {
      throw new Error("Expansion row not found.");
    }
    expect(expansionRow).not.toHaveClass("selected");

    await user.click(expansionRowText);
    expect(expansionRow).toHaveClass("selected");

    const moduleRowText = await screen.findByText("Module One");
    const moduleRow = moduleRowText.closest(".admin-table-row");
    if (!moduleRow) {
      throw new Error("Module row not found.");
    }
    expect(moduleRow).not.toHaveClass("selected");

    await user.click(moduleRowText);
    expect(moduleRow).toHaveClass("selected");

    await user.click(moduleRowText);
    expect(moduleRow).not.toHaveClass("selected");

    await user.click(expansionRowText);
    expect(expansionRow).not.toHaveClass("selected");
  });

  it("validates module form and selects new module after create", async () => {
    seedAdminData();
    supabaseMock.enqueueResponse("expansion_modules", "select", {
      data: [],
      error: null
    });
    supabaseMock.enqueueResponse("expansion_modules", "insert", {
      data: null,
      error: null
    });
    supabaseMock.enqueueResponse("expansion_modules", "select", {
      data: [
        {
          id: "mod-new",
          expansion_id: null,
          name: "New Module",
          description: null
        }
      ],
      error: null
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminApp />
      </MemoryRouter>
    );

    const gameRow = await screen.findByText("Game One");
    await user.click(gameRow);

    const modulesPanel = screen
      .getByRole("heading", { name: "Modules" })
      .closest(".modules-panel");
    if (!modulesPanel) {
      throw new Error("Modules panel not found.");
    }

    await user.click(within(modulesPanel).getByRole("button", { name: "New module" }));
    await user.click(
      within(modulesPanel).getByRole("button", { name: "Create module" })
    );
    expect(
      within(modulesPanel).getByText("Module id is required.")
    ).toBeInTheDocument();

    const moduleIdInput = within(modulesPanel).getByLabelText("Module id");
    await user.type(moduleIdInput, "mod-new");
    await user.click(
      within(modulesPanel).getByRole("button", { name: "Create module" })
    );
    expect(
      within(modulesPanel).getByText("Module name is required.")
    ).toBeInTheDocument();

    const moduleNameInput = within(modulesPanel).getByLabelText("Name");
    await user.type(moduleNameInput, "New Module");
    await user.click(
      within(modulesPanel).getByRole("button", { name: "Create module" })
    );

    const moduleRowText = await screen.findByText("New Module");
    const moduleRow = moduleRowText.closest(".admin-table-row");
    if (!moduleRow) {
      throw new Error("Module row not found.");
    }
    expect(moduleRow).toHaveClass("selected");
  });
});
