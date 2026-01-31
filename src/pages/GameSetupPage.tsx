import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, supabaseReady } from "../lib/supabase";
import { getSafeErrorMessage } from "../lib/errors";
import type {
  ConditionalStep,
  ExpansionModule,
  GameData,
  ModuleRow,
  Step,
  StepCondition
} from "../types/game";

const DEFAULT_GAME = "cascadia";
const BASE_MODULE_KEY = "__base__";
const MODULES_COLLAPSE_DURATION = 700;

export default function GameSetupPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const resolvedGameId = gameId ?? DEFAULT_GAME;

  const [game, setGame] = useState<GameData | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isModulesCollapsing, setIsModulesCollapsing] = useState(false);
  const [collapsingModules, setCollapsingModules] = useState<ExpansionModule[]>([]);
  const modulesRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

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
          throw gameRowError ?? new Error("Game not found.");
        }

        const [
          { data: expansions, error: expansionsError },
          { data: steps, error: stepsError }
        ] = await Promise.all([
          client
            .from("expansions")
            .select("id, name")
            .eq("game_id", resolvedGameId),
          client
            .from("steps")
            .select(
              "step_order, text, visual_asset, visual_animation, conditions, step_type, parent_step_id, phase, parallel_group"
            )
            .eq("game_id", resolvedGameId)
            .order("step_order", { ascending: true })
        ]);

        if (expansionsError) {
          throw expansionsError;
        }
        if (stepsError) {
          throw stepsError;
        }

        const expansionIds = (expansions ?? []).map((expansion) => expansion.id);
        const [expansionModulesResult, baseModulesResult] = await Promise.all([
          expansionIds.length
            ? client
                .from("expansion_modules")
                .select("id, expansion_id, name, description")
                .in("expansion_id", expansionIds)
            : Promise.resolve({ data: [], error: null }),
          client
            .from("expansion_modules")
            .select("id, expansion_id, name, description")
            .is("expansion_id", null)
        ]);

        if (expansionModulesResult.error) {
          throw expansionModulesResult.error;
        }
        if (baseModulesResult.error) {
          throw baseModulesResult.error;
        }

        const modules: ModuleRow[] = [
          ...((expansionModulesResult.data ?? []) as ModuleRow[]),
          ...((baseModulesResult.data ?? []) as ModuleRow[])
        ];

        const playerCounts = Array.from(
          { length: gameRow.players_max - gameRow.players_min + 1 },
          (_, index) => gameRow.players_min + index
        );

        const expansionModules = modules.reduce<Record<string, ExpansionModule[]>>(
          (acc, module) => {
            const key = module.expansion_id ?? BASE_MODULE_KEY;
            const list = acc[key] ?? [];
            list.push({
              id: module.id,
              name: module.name,
              description: module.description ?? undefined
            });
            acc[key] = list;
            return acc;
          },
          {}
        );

        const common: Step[] = [];
        const conditionalSteps: ConditionalStep[] = [];

        (steps ?? []).forEach((step) => {
          const when: StepCondition = step.conditions ?? {};

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
        setGameError(getSafeErrorMessage(err));
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
    setCompletedSteps(new Set());
  }, [resolvedGameId]);

  useEffect(() => {
    if (!game?.expansionModules) {
      setSelectedModules([]);
      return;
    }
    const baseModules = game.expansionModules?.[BASE_MODULE_KEY] ?? [];
    const expansionModules = selectedExpansions.flatMap(
      (expansionId) => game.expansionModules?.[expansionId] ?? []
    );
    const allowed = new Set(
      [...baseModules, ...expansionModules].map((module) => module.id)
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

  // Clear completed steps that no longer exist
  useEffect(() => {
    setCompletedSteps((prev) => {
      const max = steps.length;
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < max) next.add(i);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [steps]);

  const activeModules = useMemo(() => {
    if (!game?.expansionModules) {
      return [];
    }
    const baseModules = game.expansionModules?.[BASE_MODULE_KEY] ?? [];
    const expansionModules = selectedExpansions.flatMap(
      (expansionId) => game.expansionModules?.[expansionId] ?? []
    );
    const seen = new Set<string>();
    return [...baseModules, ...expansionModules].filter((module) => {
      if (seen.has(module.id)) {
        return false;
      }
      seen.add(module.id);
      return true;
    });
  }, [game, selectedExpansions]);

  // Snapshot modules before they go empty, so we can show them during collapse
  const prevModulesRef = useRef<ExpansionModule[]>(activeModules);
  if (activeModules.length > 0) {
    prevModulesRef.current = activeModules;
  }

  // Track when modules section should collapse
  const prevModulesLength = useRef(activeModules.length);
  useLayoutEffect(() => {
    const previousLength = prevModulesLength.current;
    prevModulesLength.current = activeModules.length;

    if (activeModules.length > 0) {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      setIsModulesCollapsing(false);
      setCollapsingModules((current) => (current.length > 0 ? [] : current));
      const el = modulesRef.current;
      if (el) el.style.maxHeight = "";
      return;
    }

    if (activeModules.length === 0 && previousLength > 0) {
      const el = modulesRef.current;
      if (el) {
        el.style.maxHeight = `${el.scrollHeight}px`;
        el.getBoundingClientRect();
      }
      setCollapsingModules(prevModulesRef.current);
      setIsModulesCollapsing(true);
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
      }
      collapseTimerRef.current = window.setTimeout(() => {
        setIsModulesCollapsing(false);
        setCollapsingModules([]);
        if (el) el.style.maxHeight = "";
        collapseTimerRef.current = null;
      }, MODULES_COLLAPSE_DURATION);
    }
  }, [activeModules.length]);

  const completionPercent = steps.length > 0
    ? Math.round((completedSteps.size / steps.length) * 100)
    : 0;
  const isPendingModulesCollapse =
    activeModules.length === 0 && prevModulesLength.current > 0;
  const shouldRenderModules =
    activeModules.length > 0 ||
    isModulesCollapsing ||
    collapsingModules.length > 0 ||
    isPendingModulesCollapse;
  const modulesToRender = shouldRenderModules
    ? activeModules.length > 0
      ? activeModules
      : collapsingModules.length > 0
        ? collapsingModules
        : prevModulesRef.current
    : [];

  const toggleStepComplete = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

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
      {/* Setup header panel */}
      <div className="panel setup-header">
        <div className="setup-title-row">
          <div className="setup-title-group">
            <span className="setup-eyebrow">Now setting up</span>
            <h2 className="setup-game-name">{game?.title ?? "Loading..."}</h2>
          </div>
          {game?.rulesUrl && (
            <a
              className="btn ghost small"
              href={game.rulesUrl}
              target="_blank"
              rel="noreferrer"
            >
              View rules
            </a>
          )}
        </div>

        {/* Player count chips */}
        {sortedPlayerCounts.length > 0 && (
          <div className="setup-section">
            <span className="setup-label">Players</span>
            <div className="player-chips">
              {sortedPlayerCounts.map((count, idx) => (
                <button
                  key={count}
                  type="button"
                  className={
                    idx === playerIndex ? "player-chip active" : "player-chip"
                  }
                  onClick={(e) => {
                    setPlayerIndex(idx);
                    e.currentTarget.blur();
                  }}
                  aria-label={`${count} player${count !== 1 ? "s" : ""}`}
                  aria-pressed={idx === playerIndex}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expansion chips */}
        {(game?.expansions?.length ?? 0) > 0 && (
          <div className="setup-section">
            <div className="setup-label-row">
              <span className="setup-label">Expansions</span>
              {selectedExpansions.length > 0 && (
                <span className="setup-badge">
                  {selectedExpansions.length} selected
                </span>
              )}
            </div>
            <div className="expansion-chips">
              {(game?.expansions ?? []).map((expansion) => {
                const checked = selectedExpansions.includes(expansion.id);
                return (
                  <button
                    key={expansion.id}
                    type="button"
                    className={
                      checked ? "expansion-chip active" : "expansion-chip"
                    }
                    onClick={(e) => {
                      toggleExpansion(expansion.id);
                      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
                        window.setTimeout(() => e.currentTarget.blur(), 0);
                      } else {
                        e.currentTarget.blur();
                      }
                    }}
                    aria-pressed={checked}
                  >
                    <span className="chip-indicator" aria-hidden="true">
                      {checked ? "\u2713" : "+"}
                    </span>
                    <span className="chip-text">{expansion.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Module chips */}
        {shouldRenderModules && (
          <div ref={modulesRef} className={`modules-section ${isModulesCollapsing ? 'collapsing' : ''}`}>
            <div className="modules-inner">
              <span className="setup-label">Modules</span>
              <div className="module-chips">
                {modulesToRender.map((module) => {
                  const checked = selectedModules.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      className={
                        checked ? "module-chip active" : "module-chip"
                      }
                      onClick={(e) => {
                        toggleModule(module.id);
                        e.currentTarget.blur();
                      }}
                      aria-pressed={checked}
                    >
                      <span className="chip-indicator" aria-hidden="true">
                        {checked ? "\u2713" : "+"}
                      </span>
                      <span className="module-chip-content">
                        <span className="chip-text">{module.name}</span>
                        {module.description && (
                          <span className="chip-desc">{module.description}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading / error */}
      {gameLoading && (
        <div className="status" role="status" aria-live="polite">
          Loading setup steps...
        </div>
      )}
      {gameError && (
        <div className="status error" role="alert">
          {gameError}
        </div>
      )}

      {/* Progress bar */}
      {!gameLoading && !gameError && steps.length > 0 && (
        <div className="progress-sticky" ref={progressRef}>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${completionPercent}%` }}
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="progress-info">
            <span className="progress-label">
              {completedSteps.size} of {steps.length} completed
            </span>
            <span className="progress-percent">{completionPercent}%</span>
          </div>
        </div>
      )}

      {/* Steps grid */}
      {!gameLoading && !gameError && (
        <div className="steps-grid">
          {steps.length ? (
            steps.map((step, index) => (
              <article
                className={
                  completedSteps.has(index)
                    ? "step-card completed"
                    : "step-card"
                }
                key={`${step.order}-${index}`}
                onClick={() => toggleStepComplete(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleStepComplete(index);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={completedSteps.has(index)}
              >
                <div className="step-body">
                  <div className="step-header-row">
                    <span className="step-index">Step {index + 1}</span>
                    <span
                      className={
                        completedSteps.has(index)
                          ? "step-check checked"
                          : "step-check"
                      }
                      aria-hidden="true"
                    />
                  </div>
                  <p>{step.text}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No setup steps found.</div>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div className="stage-actions single">
        <button type="button" className="btn primary" onClick={handleGoHome}>
          Choose another game
        </button>
      </div>
    </section>
  );
}
