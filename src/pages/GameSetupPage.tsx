import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, supabaseReady } from "../lib/supabase";

type Visual = {
  asset: string;
  animation: string;
};

type Step = {
  order: number;
  text: string;
  visual: Visual;
};

type StepCondition = {
  playerCounts?: number[];
  includeExpansions?: string[];
  excludeExpansions?: string[];
  includeModules?: string[];
  excludeModules?: string[];
  requireNoExpansions?: boolean;
};

type ConditionalStep = Step & {
  when?: StepCondition;
};

type Expansion = {
  id: string;
  name: string;
};

type ExpansionModule = {
  id: string;
  name: string;
  description?: string;
};

type GameData = {
  id: string;
  title: string;
  playerCounts: number[];
  expansions?: Expansion[];
  common: Step[];
  byPlayerCount: Record<string, Step[]>;
  conditionalSteps?: ConditionalStep[];
  expansionModules?: Record<string, ExpansionModule[]>;
  rulesUrl?: string;
};

const DEFAULT_GAME = "cascadia";

export default function GameSetupPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const resolvedGameId = gameId ?? DEFAULT_GAME;

  const [game, setGame] = useState<GameData | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [expansionMenuOpen, setExpansionMenuOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);

  useEffect(() => {
    if (!resolvedGameId) {
      return;
    }
    let active = true;
    setGameLoading(true);
    setGameError("");

    const client = supabase;
    if (!supabaseReady || !client) {
      setGameError("Missing Supabase configuration.");
      setGameLoading(false);
      return () => {
        active = false;
      };
    }

    const loadGame = async () => {
      try {
        const { data: gameRow, error: gameRowError } = await client
          .from("games")
          .select("id, title, players_min, players_max, rules_url")
          .eq("id", resolvedGameId)
          .single();

        if (gameRowError || !gameRow) {
          throw new Error(
            gameRowError?.message ??
              `Could not load game data for "${resolvedGameId}".`
          );
        }

        const { data: expansions, error: expansionsError } = await client
          .from("expansions")
          .select("id, name")
          .eq("game_id", resolvedGameId);

        if (expansionsError) {
          throw new Error(expansionsError.message);
        }

        const expansionIds = (expansions ?? []).map((expansion) => expansion.id);
        const { data: modules, error: modulesError } = expansionIds.length
          ? await client
              .from("expansion_modules")
              .select("id, expansion_id, name, description")
              .in("expansion_id", expansionIds)
          : { data: [], error: null };

        if (modulesError) {
          throw new Error(modulesError.message);
        }

        const { data: steps, error: stepsError } = await client
          .from("steps")
          .select(
            "step_order, text, visual_asset, visual_animation, player_counts, include_expansions, exclude_expansions, include_modules, exclude_modules, require_no_expansions"
          )
          .eq("game_id", resolvedGameId)
          .order("step_order", { ascending: true });

        if (stepsError) {
          throw new Error(stepsError.message);
        }

        const playerCounts = Array.from(
          { length: gameRow.players_max - gameRow.players_min + 1 },
          (_, index) => gameRow.players_min + index
        );

        const expansionModules = (modules ?? []).reduce<
          Record<string, ExpansionModule[]>
        >((acc, module) => {
          const list = acc[module.expansion_id] ?? [];
          list.push({
            id: module.id,
            name: module.name,
            description: module.description ?? undefined
          });
          acc[module.expansion_id] = list;
          return acc;
        }, {});

        const common: Step[] = [];
        const conditionalSteps: ConditionalStep[] = [];

        (steps ?? []).forEach((step) => {
          const when: StepCondition = {};
          if (step.player_counts?.length) {
            when.playerCounts = step.player_counts;
          }
          if (step.include_expansions?.length) {
            when.includeExpansions = step.include_expansions;
          }
          if (step.exclude_expansions?.length) {
            when.excludeExpansions = step.exclude_expansions;
          }
          if (step.include_modules?.length) {
            when.includeModules = step.include_modules;
          }
          if (step.exclude_modules?.length) {
            when.excludeModules = step.exclude_modules;
          }
          if (step.require_no_expansions) {
            when.requireNoExpansions = true;
          }

          const mappedStep: Step = {
            order: Number(step.step_order),
            text: step.text,
            visual: {
              asset: step.visual_asset ?? "",
              animation: step.visual_animation ?? ""
            }
          };

          if (Object.keys(when).length) {
            conditionalSteps.push({ ...mappedStep, when });
          } else {
            common.push(mappedStep);
          }
        });

        const mappedGame: GameData = {
          id: gameRow.id,
          title: gameRow.title,
          playerCounts,
          expansions: expansions ?? [],
          common,
          byPlayerCount: {},
          conditionalSteps,
          expansionModules,
          rulesUrl: gameRow.rules_url ?? undefined
        };

        if (active) {
          setGame(mappedGame);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setGameError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!active) {
          return;
        }
        setGameLoading(false);
      }
    };

    loadGame();

    return () => {
      active = false;
    };
  }, [resolvedGameId]);

  useEffect(() => {
    setSelectedExpansions([]);
    setSelectedModules([]);
    setPlayerIndex(0);
    setExpansionMenuOpen(false);
  }, [resolvedGameId]);

  useEffect(() => {
    if (!game?.expansionModules) {
      setSelectedModules([]);
      return;
    }
    const allowed = new Set(
      selectedExpansions.flatMap(
        (expansionId) => game.expansionModules?.[expansionId] ?? []
      ).map((module) => module.id)
    );
    setSelectedModules((current) => current.filter((id) => allowed.has(id)));
  }, [game, selectedExpansions]);

  const sortedPlayerCounts = useMemo(() => {
    if (!game?.playerCounts) {
      return [];
    }
    return [...game.playerCounts].sort((a, b) => a - b);
  }, [game]);

  useEffect(() => {
    if (!sortedPlayerCounts.length) {
      return;
    }
    if (playerIndex >= sortedPlayerCounts.length) {
      setPlayerIndex(0);
    }
  }, [playerIndex, sortedPlayerCounts]);

  const playerCount = sortedPlayerCounts[playerIndex] ?? null;

  const steps = useMemo(() => {
    if (!game || !playerCount) {
      return [];
    }
    const commonSteps = Array.isArray(game.common) ? game.common : [];
    const countSteps = game.byPlayerCount?.[String(playerCount)] ?? [];
    const conditionalSteps = (game.conditionalSteps ?? []).filter((step) => {
      const condition = step.when;
      if (!condition) {
        return true;
      }
      if (condition.playerCounts && !condition.playerCounts.includes(playerCount)) {
        return false;
      }
      if (condition.requireNoExpansions && selectedExpansions.length > 0) {
        return false;
      }
      if (
        condition.includeExpansions &&
        !condition.includeExpansions.every((id) =>
          selectedExpansions.includes(id)
        )
      ) {
        return false;
      }
      if (
        condition.excludeExpansions &&
        condition.excludeExpansions.some((id) =>
          selectedExpansions.includes(id)
        )
      ) {
        return false;
      }
      if (
        condition.includeModules &&
        !condition.includeModules.every((id) => selectedModules.includes(id))
      ) {
        return false;
      }
      if (
        condition.excludeModules &&
        condition.excludeModules.some((id) => selectedModules.includes(id))
      ) {
        return false;
      }
      return true;
    });
    return [...commonSteps, ...countSteps, ...conditionalSteps].sort(
      (a, b) => a.order - b.order
    );
  }, [game, playerCount, selectedExpansions, selectedModules]);

  const selectedExpansionNames = useMemo(() => {
    if (!game?.expansions?.length) {
      return [];
    }
    return game.expansions
      .filter((expansion) => selectedExpansions.includes(expansion.id))
      .map((expansion) => expansion.name);
  }, [game, selectedExpansions]);

  const activeModules = useMemo(() => {
    if (!game?.expansionModules) {
      return [];
    }
    return selectedExpansions.flatMap(
      (expansionId) => game.expansionModules?.[expansionId] ?? []
    );
  }, [game, selectedExpansions]);

  const expansionSummaryLabel = useMemo(() => {
    if (!selectedExpansionNames.length) {
      return "Base game only";
    }
    if (selectedExpansionNames.length === 1) {
      return selectedExpansionNames[0];
    }
    return "Multiple";
  }, [selectedExpansionNames]);

  const decrementPlayer = () => {
    setPlayerIndex((index) => Math.max(index - 1, 0));
  };

  const incrementPlayer = () => {
    setPlayerIndex((index) =>
      Math.min(index + 1, sortedPlayerCounts.length - 1)
    );
  };

  const toggleExpansion = (id: string) => {
    setSelectedExpansions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleModule = (id: string) => {
    setSelectedModules((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <section className="stage">
      <div className="panel summary-panel">
        <div className="summary-row">
          <span>Game</span>
          <strong>{game?.title ?? "-"}</strong>
        </div>
        <div className="summary-row">
          <span>Players</span>
          <div className="summary-player">
            <button
              type="button"
              className="icon-btn small"
              onClick={decrementPlayer}
              disabled={!sortedPlayerCounts.length || playerIndex === 0}
              aria-label="Decrease players"
            >
              -
            </button>
            <span className="player-count small">{playerCount ?? "-"}</span>
            <button
              type="button"
              className="icon-btn small"
              onClick={incrementPlayer}
              disabled={
                !sortedPlayerCounts.length ||
                playerIndex >= sortedPlayerCounts.length - 1
              }
              aria-label="Increase players"
            >
              +
            </button>
          </div>
        </div>
        <div className="summary-row">
          <span>Expansions</span>
          <div className="dropdown">
            <button
              type="button"
              className={expansionMenuOpen ? "dropdown-toggle open" : "dropdown-toggle"}
              onClick={() => setExpansionMenuOpen((open) => !open)}
              disabled={!game?.expansions?.length}
              aria-expanded={expansionMenuOpen}
            >
              {expansionSummaryLabel}
            </button>
          </div>
        </div>
        {expansionMenuOpen && (
          <div className="dropdown-panel">
            {game?.expansions?.length ? (
              game.expansions.map((expansion) => {
                const checked = selectedExpansions.includes(expansion.id);
                return (
                  <label
                    key={expansion.id}
                    className={checked ? "dropdown-item selected" : "dropdown-item"}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExpansion(expansion.id)}
                    />
                    <span>{expansion.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="empty-state">No expansions listed yet.</div>
            )}
          </div>
        )}
        {activeModules.length > 0 && (
          <div className="summary-row modules">
            <span>Exploration modules</span>
            <div className="module-grid">
              {activeModules.map((module) => {
                const checked = selectedModules.includes(module.id);
                return (
                  <label
                    key={module.id}
                    className={checked ? "module-toggle selected" : "module-toggle"}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(module.id)}
                    />
                    <span>
                      {module.name}
                      {module.description ? <em>{module.description}</em> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {gameLoading && <div className="status">Loading setup steps...</div>}
      {gameError && <div className="status error">{gameError}</div>}

      {!gameLoading && !gameError && (
        <div className="steps-grid">
          {steps.length ? (
            steps.map((step, index) => (
              <article className="step-card" key={`${step.order}-${index}`}>
                <div className="step-body">
                  <div className="step-index">Step {index + 1}</div>
                  <p>{step.text}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No setup steps found.</div>
          )}
        </div>
      )}

      <div className="stage-actions">
        {game?.rulesUrl ? (
          <a className="btn ghost" href={game.rulesUrl} target="_blank" rel="noreferrer">
            Rules
          </a>
        ) : (
          <button type="button" className="btn ghost" disabled>
            Rules
          </button>
        )}
        <button type="button" className="btn primary" onClick={handleGoHome}>
          Choose another game
        </button>
      </div>
    </section>
  );
}
