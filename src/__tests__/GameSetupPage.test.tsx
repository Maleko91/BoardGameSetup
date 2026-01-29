import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GameSetupPage from "../pages/GameSetupPage";
import { supabaseMock } from "../test/supabaseMock";
import type { Expansion, GameSetupStepRow, ModuleRow } from "../types/game";

const seedGameSetupData = (steps: GameSetupStepRow[]) => {
  supabaseMock.setReady(true);
  supabaseMock.enqueueResponse("games", "single", {
    data: {
      id: "test-game",
      title: "Test Game",
      players_min: 2,
      players_max: 2,
      rules_url: null
    },
    error: null
  });
  const expansions: Expansion[] = [{ id: "exp-1", name: "Expansion One" }];
  supabaseMock.enqueueResponse("expansions", "select", {
    data: expansions,
    error: null
  });
  const expansionModules: ModuleRow[] = [
    {
      id: "mod-exp-1",
      expansion_id: "exp-1",
      name: "Expansion Module",
      description: null
    }
  ];
  supabaseMock.enqueueResponse("expansion_modules", "select", {
    data: expansionModules,
    error: null
  });
  const baseModules: ModuleRow[] = [
    {
      id: "mod-base-1",
      expansion_id: null,
      name: "Base Module",
      description: null
    }
  ];
  supabaseMock.enqueueResponse("expansion_modules", "select", {
    data: baseModules,
    error: null
  });
  supabaseMock.enqueueResponse("steps", "select", {
    data: steps,
    error: null
  });
};

const renderGameSetup = () =>
  render(
    <MemoryRouter initialEntries={["/game/test-game"]}>
      <Routes>
        <Route path="/game/:gameId" element={<GameSetupPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("GameSetupPage", () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it("shows base modules by default and expansion modules after selection", async () => {
    seedGameSetupData([]);
    const user = userEvent.setup();
    renderGameSetup();

    expect(await screen.findByText("Base Module")).toBeInTheDocument();
    expect(screen.queryByText("Expansion Module")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Expansion One/ }));

    expect(await screen.findByText("Expansion Module")).toBeInTheDocument();
  });

  it("filters steps by expansion and module selections", async () => {
    seedGameSetupData([
      {
        step_order: 1,
        text: "Always",
        visual_asset: null,
        visual_animation: null,
        player_counts: null,
        include_expansions: null,
        exclude_expansions: null,
        include_modules: null,
        exclude_modules: null,
        require_no_expansions: null
      },
      {
        step_order: 2,
        text: "Base only",
        visual_asset: null,
        visual_animation: null,
        player_counts: null,
        include_expansions: null,
        exclude_expansions: null,
        include_modules: null,
        exclude_modules: null,
        require_no_expansions: true
      },
      {
        step_order: 3,
        text: "With expansion",
        visual_asset: null,
        visual_animation: null,
        player_counts: null,
        include_expansions: ["exp-1"],
        exclude_expansions: null,
        include_modules: null,
        exclude_modules: null,
        require_no_expansions: null
      },
      {
        step_order: 4,
        text: "With base module",
        visual_asset: null,
        visual_animation: null,
        player_counts: null,
        include_expansions: null,
        exclude_expansions: null,
        include_modules: ["mod-base-1"],
        exclude_modules: null,
        require_no_expansions: null
      },
      {
        step_order: 5,
        text: "Exclude expansion module",
        visual_asset: null,
        visual_animation: null,
        player_counts: null,
        include_expansions: null,
        exclude_expansions: null,
        include_modules: null,
        exclude_modules: ["mod-exp-1"],
        require_no_expansions: null
      }
    ]);

    const user = userEvent.setup();
    renderGameSetup();

    expect(await screen.findByText("Always")).toBeInTheDocument();
    expect(screen.getByText("Base only")).toBeInTheDocument();
    expect(screen.getByText("Exclude expansion module")).toBeInTheDocument();
    expect(screen.queryByText("With expansion")).not.toBeInTheDocument();
    expect(screen.queryByText("With base module")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Base Module/ }));
    expect(await screen.findByText("With base module")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Expansion One/ }));

    await waitFor(() => {
      expect(screen.queryByText("Base only")).not.toBeInTheDocument();
    });
    expect(screen.getByText("With expansion")).toBeInTheDocument();
    expect(screen.getByText("With base module")).toBeInTheDocument();
    expect(screen.getByText("Exclude expansion module")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Expansion Module/ }));
    await waitFor(() => {
      expect(
        screen.queryByText("Exclude expansion module")
      ).not.toBeInTheDocument();
    });
  });
});
