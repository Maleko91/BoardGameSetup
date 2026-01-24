import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const getPublicAssetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${encodeURI(path)}`;

export default function HomePage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search by name");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>("popularity");
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const mobileSortRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setMobileSortOpen(false);
  }, [searchTerm, sortOption]);

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

  useEffect(() => {
    if (!mobileSortOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileSortRef.current && !mobileSortRef.current.contains(target)) {
        setMobileSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [mobileSortOpen]);

  useEffect(() => {
    let active = true;
    const normalized = searchTerm.trim();
    setCatalogLoading(true);
    setCatalogError("");
    setGames([]);

    if (!supabaseReady || !supabase) {
      setCatalogError("Missing Supabase configuration.");
      setCatalogLoading(false);
      return () => {
        active = false;
      };
    }

    const loadGames = async () => {
      try {
        let query = supabase
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
  }, [currentPage, searchTerm, sortOption]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
                      onClick={() => {
                        setSortOption(option);
                        setMobileSortOpen(false);
                      }}
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
            onChange={(event) => setSortOption(event.target.value as SortOption)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalogError && <div className="status error">{catalogError}</div>}

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
                    {entry.coverAsset ?? entry.id}
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

      {renderPagination("bottom")}

      {!catalogLoading && !catalogError && games.length === 0 && (
        <div className="empty-state">No games match that search yet.</div>
      )}
    </section>
  );
}
