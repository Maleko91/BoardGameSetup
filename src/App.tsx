import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseReady } from "./lib/supabase";

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

type CatalogGame = {
  id: string;
  title: string;
  popularity: number;
  playersMin: number;
  playersMax: number;
  tagline?: string;
  coverAsset?: string;
  coverImage?: string;
};

const DEFAULT_GAME = "cascadia";
const PAGE_SIZE = 12;
const SORT_OPTIONS = ["popularity", "alpha", "max-players"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

type Stage = "search" | "steps";

type InitialSelection = {
  id: string;
  explicit: boolean;
};

const getInitialSelection = (): InitialSelection => {
  const param = new URLSearchParams(window.location.search).get("game");
  if (!param) {
    return { id: DEFAULT_GAME, explicit: false };
  }
  const trimmed = param.trim();
  if (!trimmed) {
    return { id: DEFAULT_GAME, explicit: false };
  }
  return { id: trimmed, explicit: true };
};

const buildUrl = (gameId?: string | null) => {
  const url = new URL(window.location.href);
  if (gameId) {
    url.searchParams.set("game", gameId);
  } else {
    url.searchParams.delete("game");
  }
  return url;
};

const replaceSearchState = () => {
  const url = buildUrl(null);
  window.history.replaceState({ stage: "search" }, "", url.toString());
};

const replaceGameState = (gameId: string) => {
  const url = buildUrl(gameId);
  window.history.replaceState({ stage: "steps", game: gameId }, "", url.toString());
};

const pushGameState = (gameId: string) => {
  const url = buildUrl(gameId);
  window.history.pushState({ stage: "steps", game: gameId }, "", url.toString());
};

const getPublicAssetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${encodeURI(path)}`;

const resolveGameId = (candidate: string, games: CatalogGame[]) => {
  if (games.some((game) => game.id === candidate)) {
    return candidate;
  }
  const fallback = games.find((game) => game.id === DEFAULT_GAME) ?? games[0];
  return fallback ? fallback.id : candidate;
};

export default function App() {
  const initialSelection = useMemo(() => getInitialSelection(), []);
  const [stage, setStage] = useState<Stage>("search");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = window.localStorage.getItem("theme");
    return stored === "dark" ? "dark" : "light";
  });
  const [selectedGameId, setSelectedGameId] = useState(initialSelection.id);
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [game, setGame] = useState<GameData | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search by name");
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [expansionMenuOpen, setExpansionMenuOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>("popularity");
  const gameGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");

    if (!supabaseReady || !supabase) {
      setCatalogError("Missing Supabase configuration.");
      setCatalogLoading(false);
      return () => {
        active = false;
      };
    }

    supabase
      .from("games")
      .select("id, title, players_min, players_max, popularity, tagline, cover_image")
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          throw new Error(error.message);
        }
        const mapped =
          data?.map((entry) => ({
            id: entry.id,
            title: entry.title,
            popularity: entry.popularity ?? 0,
            playersMin: entry.players_min,
            playersMax: entry.players_max,
            tagline: entry.tagline ?? undefined,
            coverImage: entry.cover_image ?? undefined
          })) ?? [];
        setCatalog(mapped);
      })
      .catch((err: Error) => {
        if (!active) {
          return;
        }
        setCatalogError(err.message);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    replaceSearchState();
  }, []);

  useEffect(() => {
    if (!catalog.length) {
      return;
    }
    const resolved = resolveGameId(selectedGameId, catalog);
    if (resolved !== selectedGameId) {
      setSelectedGameId(resolved);
      if (stage === "steps") {
        replaceGameState(resolved);
      }
    }
  }, [catalog, selectedGameId, stage]);

  useEffect(() => {
    if (!selectedGameId) {
      return;
    }
    let active = true;
    setGameLoading(true);
    setGameError("");

    if (!supabaseReady || !supabase) {
      setGameError("Missing Supabase configuration.");
      setGameLoading(false);
      return () => {
        active = false;
      };
    }

    const loadGame = async () => {
      try {
        const { data: gameRow, error: gameRowError } = await supabase
          .from("games")
          .select("id, title, players_min, players_max, rules_url")
          .eq("id", selectedGameId)
          .single();

        if (gameRowError || !gameRow) {
          throw new Error(
            gameRowError?.message ??
              `Could not load game data for "${selectedGameId}".`
          );
        }

        const { data: expansions, error: expansionsError } = await supabase
          .from("expansions")
          .select("id, name")
          .eq("game_id", selectedGameId);

        if (expansionsError) {
          throw new Error(expansionsError.message);
        }

        const expansionIds = (expansions ?? []).map((expansion) => expansion.id);
        const { data: modules, error: modulesError } = expansionIds.length
          ? await supabase
              .from("expansion_modules")
              .select("id, expansion_id, name, description")
              .in("expansion_id", expansionIds)
          : { data: [], error: null };

        if (modulesError) {
          throw new Error(modulesError.message);
        }

        const { data: steps, error: stepsError } = await supabase
          .from("steps")
          .select(
            "step_order, text, visual_asset, visual_animation, player_counts, include_expansions, exclude_expansions, include_modules, exclude_modules, require_no_expansions"
          )
          .eq("game_id", selectedGameId)
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
        if (active) {
          setGameLoading(false);
        }
      }
    };

    loadGame();

    return () => {
      active = false;
    };
  }, [selectedGameId]);

  useEffect(() => {
    setSelectedExpansions([]);
    setSelectedModules([]);
    setPlayerIndex(0);
    setExpansionMenuOpen(false);
  }, [selectedGameId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption]);

  useEffect(() => {
    setExpansionMenuOpen(false);
  }, [stage]);

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

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { stage?: Stage; game?: string | null } | null;
      if (state?.stage === "steps" && state.game) {
        setSelectedGameId(state.game);
        setStage("steps");
        return;
      }
      setStage("search");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const examples = [
      "Cascadia",
      "Forest Shuffle",
      "Wingspan",
      "Everdell",
      "Terraforming Mars",
      "Ticket to Ride",
      "Azul"
    ];
    let exampleIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let cursorOn = true;
    let timerId = 0;

    const tick = () => {
      const current = examples[exampleIndex] ?? "";
      const visible = current.slice(0, charIndex);
      const cursor = cursorOn ? "|" : "";
      setSearchPlaceholder(`${visible}${cursor}`);
      cursorOn = !cursorOn;

      if (!deleting) {
        if (charIndex < current.length) {
          charIndex += 1;
          timerId = window.setTimeout(tick, 120);
          return;
        }
        deleting = true;
        timerId = window.setTimeout(tick, 900);
        return;
      }

      if (charIndex > 0) {
        charIndex -= 1;
        timerId = window.setTimeout(tick, 70);
        return;
      }

      deleting = false;
      exampleIndex = (exampleIndex + 1) % examples.length;
      timerId = window.setTimeout(tick, 300);
    };

    tick();
    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const selectedCatalogGame = useMemo(
    () => catalog.find((entry) => entry.id === selectedGameId) ?? null,
    [catalog, selectedGameId]
  );

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

  const visibleGames = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const filtered = normalized
      ? catalog.filter((entry) => {
          const titleMatch = entry.title.toLowerCase().includes(normalized);
          const taglineMatch = entry.tagline
            ? entry.tagline.toLowerCase().includes(normalized)
            : false;
          return titleMatch || taglineMatch;
        })
      : catalog;

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "alpha":
          return a.title.localeCompare(b.title);
        case "max-players":
          return (
            b.playersMax - a.playersMax ||
            a.title.localeCompare(b.title)
          );
        case "popularity":
        default:
          return (
            (b.popularity ?? 0) - (a.popularity ?? 0) ||
            a.title.localeCompare(b.title)
          );
      }
    });

    return sorted;
  }, [catalog, searchTerm, sortOption]);

  const totalPages = Math.max(1, Math.ceil(visibleGames.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleGames.slice(start, start + PAGE_SIZE);
  }, [currentPage, visibleGames]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  const showPagination = visibleGames.length > PAGE_SIZE;

  const formatPlayers = (min: number, max: number) =>
    min === max ? `${min}` : `${min}-${max}`;

  const resolveCoverImage = (path?: string) => {
    if (!path) {
      return "";
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return getPublicAssetUrl(path);
  };

  useEffect(() => {
    if (stage !== "search") {
      return;
    }
    const grid = gameGridRef.current;
    if (!grid) {
      return;
    }
    let frame = 0;
    const updateCardHeight = () => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(".game-card"));
      if (!cards.length) {
        grid.style.removeProperty("--game-card-height");
        return;
      }
      grid.style.removeProperty("--game-card-height");
      const maxHeight = Math.max(
        ...cards.map((card) => card.getBoundingClientRect().height)
      );
      const paddedHeight = Math.ceil(maxHeight + 16);
      grid.style.setProperty("--game-card-height", `${paddedHeight}px`);
    };
    frame = window.requestAnimationFrame(updateCardHeight);
    window.addEventListener("resize", updateCardHeight);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateCardHeight);
    };
  }, [paginatedGames, stage]);

  const stageTitle = useMemo(() => {
    switch (stage) {
      case "search":
        return "Setup and Play";
      case "steps":
        return "Setup checklist";
      default:
        return "Board Game Setups";
    }
  }, [stage]);

  const stageSubtitle = useMemo(() => {
    switch (stage) {
      case "search":
        return "Search the library and tap a game to begin.";
      case "steps":
        return "";
      default:
        return "";
    }
  }, [stage, selectedCatalogGame, playerCount]);

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
    setStage("steps");
    pushGameState(id);
  };

  const handleGoHome = () => {
    setStage("search");
    replaceSearchState();
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const renderPagination = (position: "top" | "bottom") => {
    if (!showPagination) {
      return null;
    }
    return (
      <div className={`pagination pagination-${position}`}>
        <button
          type="button"
          className="pagination-btn"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Back
        </button>
        <div className="pagination-pages">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              className={
                page === currentPage
                  ? "pagination-btn active"
                  : "pagination-btn"
              }
              onClick={() => goToPage(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pagination-btn"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
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

const summarizeStep = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Step";
  }
  const sentence = trimmed.split(".")[0] ?? trimmed;
  const cleaned = sentence.replace(/[^a-zA-Z0-9\s-]/g, "");
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "for",
    "in",
    "on",
    "with",
    "as",
    "at",
    "by",
    "from",
    "into",
    "your",
    "each"
  ]);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const keywords = words.filter(
    (word) => word.length > 2 && !stopwords.has(word.toLowerCase())
  );
  if (!keywords.length) {
    return "Key step";
  }
  const summary = keywords.slice(0, 6).join(" ");
  return summary.charAt(0).toUpperCase() + summary.slice(1);
};

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand-row">
          <button type="button" className="eyebrow brand-button" onClick={handleGoHome}>
            Board Game Setups
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={handleToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            data-next={theme === "dark" ? "light" : "dark"}
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <h1>{stageTitle}</h1>
        {stageSubtitle ? <p className="subtitle">{stageSubtitle}</p> : null}
      </header>

      {stage === "search" && (
        <section className="stage">
          <div className="panel search-panel">
            <label className="search-label" htmlFor="game-search">
              Search Games
            </label>
            <input
              id="game-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="search-input"
            />
          </div>
          <div className="sort-row">
            <span className="sort-label">Sort by</span>
            <select
              className="sort-select"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
            >
              <option value="popularity">Popularity</option>
              <option value="alpha">Alphabetical</option>
              <option value="max-players">Max players</option>
            </select>
          </div>

          {catalogLoading && <div className="status">Loading games...</div>}
          {catalogError && <div className="status error">{catalogError}</div>}

          <div className="game-grid" ref={gameGridRef}>
            {paginatedGames.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={
                  entry.id === selectedGameId
                    ? "game-card selected"
                    : "game-card"
                }
                onClick={() => handleSelectGame(entry.id)}
                aria-pressed={entry.id === selectedGameId}
              >
                <div className="game-cover">
                  {entry.coverImage ? (
                    <img
                      src={resolveCoverImage(entry.coverImage)}
                      alt={`${entry.title} cover`}
                      loading="lazy"
                    />
                  ) : (
                    <span className="game-cover-fallback">
                      {entry.coverAsset ?? entry.id}
                    </span>
                  )}
                </div>
                <div className="game-card-body">
                  <div className="game-card-title">{entry.title}</div>
                  <div className="game-card-meta">
                    {formatPlayers(entry.playersMin, entry.playersMax)} players
                  </div>
                  {entry.tagline && (
                    <div className="game-card-tagline">{entry.tagline}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {renderPagination("bottom")}

          {!catalogLoading && !catalogError && visibleGames.length === 0 && (
            <div className="empty-state">No games match that search yet.</div>
          )}
        </section>
      )}

      {stage === "steps" && (
        <section className="stage">
          <div className="panel summary-panel">
            <div className="summary-row">
              <span>Game</span>
              <strong>{selectedCatalogGame?.title ?? game?.title ?? "-"}</strong>
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
                  className={
                    expansionMenuOpen ? "dropdown-toggle open" : "dropdown-toggle"
                  }
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
                        className={
                          checked ? "dropdown-item selected" : "dropdown-item"
                        }
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
                        className={
                          checked ? "module-toggle selected" : "module-toggle"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModule(module.id)}
                        />
                        <span>
                          {module.name}
                          {module.description ? (
                            <em>{module.description}</em>
                          ) : null}
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
                    <div className="step-image">
                      <span>{summarizeStep(step.text)}</span>
                    </div>
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
              <a
                className="btn ghost"
                href={game.rulesUrl}
                target="_blank"
                rel="noreferrer"
              >
                Rules
              </a>
            ) : (
              <button type="button" className="btn ghost" disabled>
                Rules
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => setStage("search")}
            >
              Choose another game
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
