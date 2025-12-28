import { useEffect, useMemo, useState } from "react";

type Visual = {
  asset: string;
  animation: string;
};

type Step = {
  order: number;
  text: string;
  visual: Visual;
};

type Expansion = {
  id: string;
  name: string;
};

type GameData = {
  id: string;
  title: string;
  playerCounts: number[];
  expansions?: Expansion[];
  common: Step[];
  byPlayerCount: Record<string, Step[]>;
};

type CatalogGame = {
  id: string;
  title: string;
  popularity: number;
  players: string;
  playtime: string;
  tagline?: string;
  coverAsset?: string;
};

type CatalogResponse = {
  games: CatalogGame[];
};

const DEFAULT_GAME = "cascadia";

type Stage = "search" | "expansions" | "players" | "steps";

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

const updateGameParam = (id: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set("game", id);
  window.history.replaceState({}, "", url.toString());
};

const resolveGameId = (candidate: string, games: CatalogGame[]) => {
  if (games.some((game) => game.id === candidate)) {
    return candidate;
  }
  const fallback = games.find((game) => game.id === DEFAULT_GAME) ?? games[0];
  return fallback ? fallback.id : candidate;
};

const stageLabels: Record<Stage, string> = {
  search: "Search",
  expansions: "Expansions",
  players: "Players",
  steps: "Setup",
};

export default function App() {
  const initialSelection = useMemo(() => getInitialSelection(), []);
  const [stage, setStage] = useState<Stage>(
    initialSelection.explicit ? "expansions" : "search"
  );
  const [selectedGameId, setSelectedGameId] = useState(initialSelection.id);
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [game, setGame] = useState<GameData | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");

    const url = `${import.meta.env.BASE_URL}data/games/index.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the game catalog.");
        }
        return response.json();
      })
      .then((data: CatalogResponse) => {
        if (!active) {
          return;
        }
        setCatalog(Array.isArray(data.games) ? data.games : []);
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
    if (!catalog.length) {
      return;
    }
    const resolved = resolveGameId(selectedGameId, catalog);
    if (resolved !== selectedGameId) {
      setSelectedGameId(resolved);
      updateGameParam(resolved);
    }
  }, [catalog, selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) {
      return;
    }
    let active = true;
    setGameLoading(true);
    setGameError("");

    const url = `${import.meta.env.BASE_URL}data/games/${selectedGameId}.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load game data for "${selectedGameId}".`);
        }
        return response.json();
      })
      .then((data: GameData) => {
        if (!active) {
          return;
        }
        setGame(data);
      })
      .catch((err: Error) => {
        if (!active) {
          return;
        }
        setGameError(err.message);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setGameLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedGameId]);

  useEffect(() => {
    setSelectedExpansions([]);
    setPlayerIndex(0);
  }, [selectedGameId]);

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
    return [...commonSteps, ...countSteps].sort((a, b) => a.order - b.order);
  }, [game, playerCount]);

  const selectedExpansionNames = useMemo(() => {
    if (!game?.expansions?.length) {
      return [];
    }
    return game.expansions
      .filter((expansion) => selectedExpansions.includes(expansion.id))
      .map((expansion) => expansion.name);
  }, [game, selectedExpansions]);

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

    return [...filtered].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
    );
  }, [catalog, searchTerm]);

  const stageTitle = useMemo(() => {
    switch (stage) {
      case "search":
        return "Search and play";
      case "expansions":
        return "Choose expansions";
      case "players":
        return "Set player count";
      case "steps":
        return "Setup checklist";
      default:
        return "Board Setup";
    }
  }, [stage]);

  const stageSubtitle = useMemo(() => {
    switch (stage) {
      case "search":
        return "Search the library and tap a game to begin.";
      case "expansions":
        return selectedCatalogGame
          ? `Select optional expansions for ${selectedCatalogGame.title}.`
          : "Select optional expansions for this game.";
      case "players":
        return "Use the plus and minus buttons to set the table size.";
      case "steps":
        return playerCount
          ? `Merged setup steps for ${playerCount} players.`
          : "Merged setup steps for your session.";
      default:
        return "";
    }
  }, [stage, selectedCatalogGame, playerCount]);

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
    setStage("expansions");
    updateGameParam(id);
  };

  const toggleExpansion = (id: string) => {
    setSelectedExpansions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand-row">
          <span className="eyebrow">Board Game Setup</span>
          <span className="stage-pill">{stageLabels[stage]}</span>
        </div>
        <h1>{stageTitle}</h1>
        <p className="subtitle">{stageSubtitle}</p>
      </header>

      {stage === "search" && (
        <section className="stage">
          <div className="panel search-panel">
            <label className="search-label" htmlFor="game-search">
              Search games
            </label>
            <input
              id="game-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name or vibe"
              autoComplete="off"
              className="search-input"
            />
          </div>

          {catalogLoading && <div className="status">Loading games...</div>}
          {catalogError && <div className="status error">{catalogError}</div>}

          <div className="game-grid">
            {visibleGames.map((entry) => (
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
                  {entry.coverAsset ?? entry.id}
                </div>
                <div className="game-card-body">
                  <div className="game-card-title">{entry.title}</div>
                  <div className="game-card-meta">
                    {entry.players} players - {entry.playtime}
                  </div>
                  {entry.tagline && (
                    <div className="game-card-tagline">{entry.tagline}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {!catalogLoading && !catalogError && visibleGames.length === 0 && (
            <div className="empty-state">No games match that search yet.</div>
          )}
        </section>
      )}

      {stage === "expansions" && (
        <section className="stage">
          <div className="panel">
            <h2>Expansions</h2>
            <p className="hint">
              Select all expansions you want to include for this playthrough.
            </p>
            {gameLoading && <div className="status">Loading expansions...</div>}
            {gameError && <div className="status error">{gameError}</div>}
            {!gameLoading && !gameError && (
              <div className="expansion-list">
                {game?.expansions?.length ? (
                  game.expansions.map((expansion) => {
                    const checked = selectedExpansions.includes(expansion.id);
                    return (
                      <label
                        key={expansion.id}
                        className={
                          checked
                            ? "expansion-item selected"
                            : "expansion-item"
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
          </div>

          <div className="stage-actions">
            <button type="button" className="btn ghost" onClick={() => setStage("search")}
            >
              Back to games
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setStage("players")}
              disabled={gameLoading || !!gameError}
            >
              Continue to players
            </button>
          </div>
        </section>
      )}

      {stage === "players" && (
        <section className="stage">
          <div className="panel">
            <h2>Player count</h2>
            <p className="hint">Tap plus or minus to set the table size.</p>
            {gameLoading && (
              <div className="status">Loading player options...</div>
            )}
            {gameError && <div className="status error">{gameError}</div>}
            <div className="player-stepper">
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setPlayerIndex((index) => Math.max(index - 1, 0))
                }
                disabled={!sortedPlayerCounts.length || playerIndex === 0}
                aria-label="Decrease players"
              >
                -
              </button>
              <div className="player-count">
                {playerCount ?? "-"}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setPlayerIndex((index) =>
                    Math.min(index + 1, sortedPlayerCounts.length - 1)
                  )
                }
                disabled={
                  !sortedPlayerCounts.length ||
                  playerIndex >= sortedPlayerCounts.length - 1
                }
                aria-label="Increase players"
              >
                +
              </button>
            </div>
            {sortedPlayerCounts.length ? (
              <div className="helper">
                Available: {sortedPlayerCounts[0]}-{" "}
                {sortedPlayerCounts[sortedPlayerCounts.length - 1]} players
              </div>
            ) : (
              <div className="empty-state">No player counts listed yet.</div>
            )}
          </div>

          <div className="stage-actions">
            <button type="button" className="btn ghost" onClick={() => setStage("expansions")}
            >
              Back to expansions
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setStage("steps")}
              disabled={!playerCount || gameLoading || !!gameError}
            >
              View setup steps
            </button>
          </div>
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
              <strong>{playerCount ?? "-"}</strong>
            </div>
            <div className="summary-row">
              <span>Expansions</span>
              <strong>
                {selectedExpansionNames.length
                  ? selectedExpansionNames.join(", ")
                  : "Base game only"}
              </strong>
            </div>
          </div>

          {gameLoading && <div className="status">Loading setup steps...</div>}
          {gameError && <div className="status error">{gameError}</div>}

          {!gameLoading && !gameError && (
            <div className="steps-grid">
              {steps.length ? (
                steps.map((step, index) => (
                  <article className="step-card" key={`${step.order}-${index}`}>
                    <div className="step-image">
                      <span>{step.visual?.asset ?? "component"}</span>
                    </div>
                    <div className="step-body">
                      <div className="step-index">Step {index + 1}</div>
                      <p>{step.text}</p>
                      <div className="step-meta">
                        <span>Asset: {step.visual?.asset ?? "TBD"}</span>
                        <span>Animation: {step.visual?.animation ?? "TBD"}</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No setup steps found.</div>
              )}
            </div>
          )}

          <div className="stage-actions">
            <button type="button" className="btn ghost" onClick={() => setStage("players")}
            >
              Back to players
            </button>
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
