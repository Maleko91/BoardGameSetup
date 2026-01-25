import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { supabase, supabaseReady } from "../lib/supabase";

type RequestType = "Game" | "Expansion" | "Module";

type RequestItem = {
  id: string;
  title: string;
  type: RequestType;
  votes: number;
};

type CatalogEntry = {
  id: string;
  title: string;
};

const REQUEST_TYPES: RequestType[] = ["Game", "Expansion", "Module"];

const BACKLOG_SEED: RequestItem[] = [
  {
    id: "root-request-1",
    title: "Spirit Island: Nature Incarnate",
    type: "Expansion",
    votes: 42
  },
  {
    id: "root-request-2",
    title: "Everdell: Complete Collection",
    type: "Expansion",
    votes: 37
  },
  {
    id: "root-request-3",
    title: "Apiary",
    type: "Game",
    votes: 31
  },
  {
    id: "root-request-4",
    title: "Root: Marauder Hirelings",
    type: "Module",
    votes: 24
  },
  {
    id: "root-request-5",
    title: "Heat: Heavy Rain",
    type: "Expansion",
    votes: 19
  }
];

const FALLBACK_CATALOG: CatalogEntry[] = [
  { id: "cascadia", title: "Cascadia" },
  { id: "wingspan", title: "Wingspan" },
  { id: "terraforming-mars", title: "Terraforming Mars" },
  { id: "azul", title: "Azul" },
  { id: "ticket-to-ride", title: "Ticket to Ride" }
];

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compareByVotes = (a: RequestItem, b: RequestItem) => {
  if (a.votes !== b.votes) {
    return b.votes - a.votes;
  }
  return a.title.localeCompare(b.title);
};

export default function RequestPage() {
  const { session, authLoading } = useSession();
  const [backlog, setBacklog] = useState<RequestItem[]>(BACKLOG_SEED);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [catalogEntries, setCatalogEntries] =
    useState<CatalogEntry[]>(FALLBACK_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("Game");
  const [requestStatus, setRequestStatus] = useState("");
  const requestTitleId = useId();
  const requestTypeId = useId();
  const searchId = useId();

  const isSignedIn = Boolean(session);
  const upvotedSet = useMemo(() => new Set(upvotedIds), [upvotedIds]);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      return;
    }
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");

    supabase
      .from("games")
      .select("id, title")
      .order("title", { ascending: true })
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setCatalogError(error.message);
          return;
        }
        const entries = (data ?? [])
          .filter((entry): entry is CatalogEntry => Boolean(entry?.id && entry?.title))
          .map((entry) => ({ id: entry.id, title: entry.title }));
        if (entries.length) {
          setCatalogEntries(entries);
        }
      })
      .catch((error: Error) => {
        if (!active) {
          return;
        }
        setCatalogError(error.message);
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setRequestStatus("");
  }, [requestTitle, requestType]);

  const normalizedRequest = normalizeTitle(requestTitle);
  const backlogMatch = useMemo(
    () => backlog.find((item) => normalizeTitle(item.title) === normalizedRequest),
    [backlog, normalizedRequest]
  );
  const catalogMatch = useMemo(
    () =>
      catalogEntries.find(
        (entry) => normalizeTitle(entry.title) === normalizedRequest
      ),
    [catalogEntries, normalizedRequest]
  );

  const requestDisabledReason = useMemo(() => {
    if (!isSignedIn) {
      return "Sign in to request a new game or expansion.";
    }
    if (!normalizedRequest) {
      return "Enter a title to request.";
    }
    if (backlogMatch) {
      return "That title is already on the backlog.";
    }
    if (catalogMatch) {
      return "That title is already in the catalog.";
    }
    return "";
  }, [backlogMatch, catalogMatch, isSignedIn, normalizedRequest]);

  const suggestions = useMemo(() => {
    if (!normalizedRequest) {
      return [];
    }
    const results: Array<
      | { type: "backlog"; item: RequestItem }
      | { type: "catalog"; item: CatalogEntry }
    > = [];
    const seen = new Set<string>();

    backlog.forEach((item) => {
      const normalized = normalizeTitle(item.title);
      if (!normalized.includes(normalizedRequest)) {
        return;
      }
      if (seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      results.push({ type: "backlog", item });
    });

    catalogEntries.forEach((item) => {
      const normalized = normalizeTitle(item.title);
      if (!normalized.includes(normalizedRequest)) {
        return;
      }
      if (seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      results.push({ type: "catalog", item });
    });

    return results.slice(0, 6);
  }, [backlog, catalogEntries, normalizedRequest]);

  const sortedBacklog = useMemo(
    () => [...backlog].sort(compareByVotes),
    [backlog]
  );
  const normalizedSearch = normalizeTitle(searchQuery);
  const filteredBacklog = useMemo(() => {
    if (!normalizedSearch) {
      return sortedBacklog;
    }
    return sortedBacklog.filter((item) => {
      const normalizedTitle = normalizeTitle(item.title);
      return (
        normalizedTitle.includes(normalizedSearch) ||
        normalizeTitle(item.type).includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, sortedBacklog]);

  const handleUpvote = (id: string) => {
    if (!isSignedIn || upvotedSet.has(id)) {
      return;
    }
    setBacklog((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, votes: item.votes + 1 } : item
      )
    );
    setUpvotedIds((prev) => [...prev, id]);
  };

  const handleRequestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestDisabledReason) {
      return;
    }
    const trimmedTitle = requestTitle.trim();
    const newItem: RequestItem = {
      id: `${normalizeTitle(trimmedTitle).replace(/\s+/g, "-")}-${Date.now()}`,
      title: trimmedTitle,
      type: requestType,
      votes: 1
    };
    setBacklog((prev) => [...prev, newItem]);
    setUpvotedIds((prev) => [...prev, newItem.id]);
    setRequestStatus("Request submitted! Thanks for helping grow the library.");
    setRequestTitle("");
    setRequestType("Game");
  };

  return (
    <section className="stage">
      <div className="request-grid">
        <div className="panel request-panel">
          <header className="request-panel-header">
            <div>
              <p className="eyebrow">Submit a request</p>
              <h2>Request a new game, expansion, or module</h2>
            </div>
            {!authLoading && !isSignedIn ? (
              <div className="request-callout">
                <strong>Want to request a title?</strong>
                <span>Create an account or sign in to add requests and upvote.</span>
              </div>
            ) : null}
          </header>

          <form className="request-form" onSubmit={handleRequestSubmit}>
            <div className="request-field">
              <label className="search-label" htmlFor={requestTitleId}>
                Game or expansion name
              </label>
              <input
                id={requestTitleId}
                className="search-input"
                name="request-title"
                type="text"
                placeholder="Search for a title before requesting"
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="request-field">
              <label className="search-label" htmlFor={requestTypeId}>
                Request type
              </label>
              <select
                id={requestTypeId}
                className="request-select"
                name="request-type"
                value={requestType}
                onChange={(event) =>
                  setRequestType(event.target.value as RequestType)
                }
              >
                {REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {requestDisabledReason ? (
              <p className="request-hint" role="status">
                {requestDisabledReason}
              </p>
            ) : null}

            {requestStatus ? (
              <p className="request-status" role="status">
                {requestStatus}
              </p>
            ) : null}

            <button className="btn primary" type="submit" disabled={Boolean(requestDisabledReason)}>
              Submit request
            </button>
          </form>

          <div className="request-suggestions">
            <div className="request-suggestions-header">
              <h3>Suggestions</h3>
              {catalogLoading ? (
                <span className="request-muted">Loading catalog…</span>
              ) : null}
              {catalogError ? (
                <span className="request-muted">Catalog sync paused.</span>
              ) : null}
            </div>
            {suggestions.length ? (
              <ul className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <li key={`${suggestion.type}-${suggestion.item.id}`}>
                    {suggestion.type === "backlog" ? (
                      <div className="suggestion-card">
                        <div>
                          <p className="suggestion-title">{suggestion.item.title}</p>
                          <span className="suggestion-meta">
                            Already requested · {suggestion.item.votes} votes
                          </span>
                        </div>
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={!isSignedIn || upvotedSet.has(suggestion.item.id)}
                          onClick={() => handleUpvote(suggestion.item.id)}
                        >
                          {upvotedSet.has(suggestion.item.id) ? "Upvoted" : "Upvote"}
                        </button>
                      </div>
                    ) : (
                      <div className="suggestion-card">
                        <div>
                          <p className="suggestion-title">{suggestion.item.title}</p>
                          <span className="suggestion-meta">In our catalog</span>
                        </div>
                        <Link className="btn ghost" to={`/game/${suggestion.item.id}`}>
                          View setup
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="request-muted">
                Start typing to see existing requests and catalog matches.
              </p>
            )}
          </div>
        </div>

        <div className="panel request-panel">
          <header className="request-panel-header">
            <div>
              <p className="eyebrow">Community backlog</p>
              <h2>Most requested titles</h2>
            </div>
            <div className="request-metric">
              <span>{sortedBacklog.length}</span>
              <span>Active requests</span>
            </div>
          </header>

          <div className="request-field">
            <label className="search-label" htmlFor={searchId}>
              Search backlog
            </label>
            <input
              id={searchId}
              className="search-input"
              name="search-backlog"
              type="search"
              placeholder="Search games, expansions, modules"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="request-list" role="list">
            {filteredBacklog.length ? (
              filteredBacklog.map((item, index) => (
                <article className="request-card" key={item.id} role="listitem">
                  <div className="request-card-rank">#{index + 1}</div>
                  <div className="request-card-body">
                    <h3>{item.title}</h3>
                    <p>{item.type}</p>
                  </div>
                  <div className="request-card-actions">
                    <div className="request-votes">
                      <span>{item.votes}</span>
                      <span>votes</span>
                    </div>
                    <button
                      className="btn small ghost"
                      type="button"
                      disabled={!isSignedIn || upvotedSet.has(item.id)}
                      onClick={() => handleUpvote(item.id)}
                    >
                      {upvotedSet.has(item.id) ? "Upvoted" : "Upvote"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="request-muted">
                No matching requests yet. Try a different search.
              </p>
            )}
          </div>

          {!authLoading && !isSignedIn ? (
            <p className="request-muted">
              Sign in to upvote requests and move your favorites up the list.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
