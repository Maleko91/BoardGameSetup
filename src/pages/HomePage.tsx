import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPublicAssetUrl } from "../lib/assets";
import { supabase, supabaseReady } from "../lib/supabase";
import type { CatalogGame } from "../types/game";

const PAGE_SIZE = 12;
const SORT_OPTIONS = ["popularity", "alpha", "max-players"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const SORT_LABELS: Record<SortOption, string> = {
  popularity: "Popularity",
  alpha: "Alphabetical",
  "max-players": "Max players"
};
const DEFAULT_SORT: SortOption = "popularity";
const SEARCH_PARAM_QUERY = "q";
const SEARCH_PARAM_SORT = "sort";
const SEARCH_PARAM_PAGE = "p";
const SEARCH_DEBOUNCE_MS = 300;

const parseSortOption = (value: string | null): SortOption => {
  if (value && SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }
  return DEFAULT_SORT;
};

const parsePageParam = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

const normalizeSortParam = (value: SortOption) =>
  value === DEFAULT_SORT ? null : value;

const normalizePageParam = (value: number) => (value <= 1 ? null : String(value));

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const appliedSearch = (searchParams.get(SEARCH_PARAM_QUERY) ?? "").trim();
  const sortOption = parseSortOption(searchParams.get(SEARCH_PARAM_SORT));
  const currentPage = parsePageParam(searchParams.get(SEARCH_PARAM_PAGE));
  const [searchInput, setSearchInput] = useState(appliedSearch);
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search by name");
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const mobileSortRef = useRef<HTMLDivElement | null>(null);
  const sortToggleRef = useRef<HTMLButtonElement | null>(null);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null | undefined>, replace = false) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (next.toString() === searchParams.toString()) {
        return;
      }
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearchInput(appliedSearch);
  }, [appliedSearch]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) {
      if (searchInput !== trimmed) {
        setSearchInput(trimmed);
      }
      return;
    }
    const timerId = window.setTimeout(() => {
      updateSearchParams(
        {
          [SEARCH_PARAM_QUERY]: trimmed || null,
          [SEARCH_PARAM_PAGE]: null
        },
        true
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [appliedSearch, searchInput, updateSearchParams]);

  useEffect(() => {
    const normalizedSort = parseSortOption(searchParams.get(SEARCH_PARAM_SORT));
    const normalizedPage = parsePageParam(searchParams.get(SEARCH_PARAM_PAGE));
    const expectedSort = normalizeSortParam(normalizedSort);
    const expectedPage = normalizePageParam(normalizedPage);
    const rawSort = searchParams.get(SEARCH_PARAM_SORT);
    const rawPage = searchParams.get(SEARCH_PARAM_PAGE);
    if ((rawSort ?? null) === expectedSort && (rawPage ?? null) === expectedPage) {
      return;
    }
    updateSearchParams(
      {
        [SEARCH_PARAM_SORT]: expectedSort,
        [SEARCH_PARAM_PAGE]: expectedPage
      },
      true
    );
  }, [searchParams, updateSearchParams]);

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

    const stopAnimation = () => {
      window.clearTimeout(timerId);
    };

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

    const startAnimation = () => {
      stopAnimation();
      exampleIndex = 0;
      charIndex = 0;
      deleting = false;
      cursorOn = true;
      tick();
    };

    if (typeof window.matchMedia !== "function") {
      startAnimation();
      return () => {
        stopAnimation();
      };
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      setSearchPlaceholder("Search by name");
    } else {
      startAnimation();
    }

    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        stopAnimation();
        setSearchPlaceholder("Search by name");
      } else {
        startAnimation();
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);
    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (!mobileSortOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSortOpen(false);
        sortToggleRef.current?.focus();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileSortRef.current && !mobileSortRef.current.contains(target)) {
        setMobileSortOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [mobileSortOpen]);

  useEffect(() => {
    let active = true;
    const normalized = appliedSearch;
    setCatalogLoading(true);
    setCatalogError("");
    setGames([]);

    const client = supabase;
    if (!supabaseReady || !client) {
      setCatalogError("Missing Supabase configuration.");
      setCatalogLoading(false);
      return () => {
        active = false;
      };
    }

    const loadGames = async () => {
      try {
        let query = client
          .from("games")
          .select(
            "id, title, players_min, players_max, popularity, tagline, cover_image",
            { count: "exact" }
          );

        if (normalized) {
          const safe = normalized.replace(/[%_]/g, "\\$&");
          query = query.or(`title.ilike.%${safe}%,tagline.ilike.%${safe}%`);
        }

        switch (sortOption) {
          case "alpha":
            query = query.order("title", { ascending: true });
            break;
          case "max-players":
            query = query
              .order("players_max", { ascending: false })
              .order("title", { ascending: true });
            break;
          case "popularity":
          default:
            query = query
              .order("popularity", { ascending: false })
              .order("title", { ascending: true });
            break;
        }

        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error, count } = await query.range(from, to);

        if (!active) {
          return;
        }
        if (error) {
          throw error;
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

        setGames(mapped);
        setTotalCount(typeof count === "number" ? count : mapped.length);
      } catch (err) {
        if (!active) {
          return;
        }
        setCatalogError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!active) {
          return;
        }
        setCatalogLoading(false);
      }
    };

    loadGames();

    return () => {
      active = false;
    };
  }, [appliedSearch, currentPage, sortOption]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      updateSearchParams(
        { [SEARCH_PARAM_PAGE]: normalizePageParam(totalPages) },
        true
      );
    }
  }, [currentPage, totalPages, updateSearchParams]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  const showPagination = totalCount > PAGE_SIZE;

  const resolveCoverImage = (path?: string) => {
    if (!path) {
      return "";
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return getPublicAssetUrl(path);
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    updateSearchParams({ [SEARCH_PARAM_PAGE]: normalizePageParam(nextPage) });
  };

  const renderPagination = () => {
    if (!showPagination) {
      return null;
    }
    return (
      <div className="pagination">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => goToPage(currentPage - 1)}
          disabled={catalogLoading || currentPage === 1}
        >
          Back
        </button>
        <div className="pagination-pages">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              className={page === currentPage ? "pagination-btn active" : "pagination-btn"}
              onClick={() => goToPage(page)}
              disabled={catalogLoading}
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
          disabled={catalogLoading || currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  const handleSelectGame = (id: string) => {
    navigate(`/game/${id}`);
  };

  const handleSortChange = (nextSort: SortOption) => {
    updateSearchParams(
      {
        [SEARCH_PARAM_SORT]: normalizeSortParam(nextSort),
        [SEARCH_PARAM_PAGE]: null
      },
      true
    );
    setMobileSortOpen(false);
  };

  const sortIcon = getPublicAssetUrl("svgs/adjustments-vertical.svg");

  return (
    <section className="stage">
      <div className="panel home-toolbar">
        <div className="search-panel">
          <label className="search-label" htmlFor="game-search">
            Search Games
          </label>
          <div className="search-row">
            <input
              id="game-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="search-input"
            />
            <div className="mobile-sort" ref={mobileSortRef}>
              <button
                type="button"
                className="sort-toggle"
                onClick={() => setMobileSortOpen((open) => !open)}
                aria-label="Sort games"
                aria-expanded={mobileSortOpen}
                aria-controls="mobile-sort-menu"
                ref={sortToggleRef}
              >
                <img src={sortIcon} alt="" aria-hidden="true" />
              </button>
              {mobileSortOpen && (
                <div className="sort-menu" id="mobile-sort-menu" role="menu">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        option === sortOption
                          ? "sort-menu-item active"
                          : "sort-menu-item"
                      }
                      role="menuitemradio"
                      aria-checked={option === sortOption}
                      onClick={() => handleSortChange(option)}
                    >
                      {SORT_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="sort-row">
          <span className="sort-label">Sort by</span>
          <select
            className="sort-select"
            value={sortOption}
            onChange={(event) =>
              handleSortChange(event.target.value as SortOption)
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalogError && (
        <div className="status error" role="alert">
          {catalogError}
        </div>
      )}

      {catalogLoading ? (
        <div className="game-grid" aria-busy="true">
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <div key={`skeleton-${index}`} className="game-card skeleton" aria-hidden>
              <div className="game-cover skeleton-block" />
              <div className="game-card-body">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="game-grid">
          {games.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="game-card"
              onClick={() => handleSelectGame(entry.id)}
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
                    {entry.title || entry.id}
                  </span>
                )}
              </div>
              <div className="game-card-body">
                <div className="game-card-title">{entry.title}</div>
                {entry.tagline && (
                  <div className="game-card-tagline">{entry.tagline}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {renderPagination()}

      {!catalogLoading && !catalogError && games.length === 0 && (
        <div className="empty-state">No games match that search yet.</div>
      )}
    </section>
  );
}
