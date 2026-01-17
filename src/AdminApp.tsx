import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "./lib/supabase";

const IMAGE_BUCKET = "Card images";
const GAME_PAGE_SIZE = 8;
const EXPANSION_PAGE_SIZE = 8;
const MODULE_PAGE_SIZE = 8;

type GameRow = {
  id: string;
  title: string;
  players_min: number;
  players_max: number;
  popularity: number | null;
  tagline: string | null;
  cover_image: string | null;
  rules_url: string | null;
};

type ExpansionRow = {
  id: string;
  game_id: string;
  name: string;
};

type ModuleRow = {
  id: string;
  expansion_id: string;
  name: string;
  description: string | null;
};

type StepRow = {
  id: string;
  game_id: string;
  step_order: number;
  text: string;
  visual_asset: string | null;
  visual_animation: string | null;
  player_counts: number[] | null;
  include_expansions: string[] | null;
  exclude_expansions: string[] | null;
  include_modules: string[] | null;
  exclude_modules: string[] | null;
  require_no_expansions: boolean | null;
};

type GameForm = {
  id: string;
  title: string;
  players_min: string;
  players_max: string;
  popularity: string;
  tagline: string;
  cover_image: string;
  rules_url: string;
};

type ExpansionForm = {
  id: string;
  name: string;
};

type ModuleForm = {
  id: string;
  name: string;
  description: string;
};

type StepForm = {
  id: string;
  step_order: string;
  text: string;
  visual_asset: string;
  visual_animation: string;
  player_counts: string;
  include_expansions: string;
  exclude_expansions: string;
  include_modules: string;
  exclude_modules: string;
  require_no_expansions: boolean;
};

const emptyGameForm = (): GameForm => ({
  id: "",
  title: "",
  players_min: "",
  players_max: "",
  popularity: "0",
  tagline: "",
  cover_image: "",
  rules_url: ""
});

const emptyExpansionForm = (): ExpansionForm => ({
  id: "",
  name: ""
});

const emptyModuleForm = (): ModuleForm => ({
  id: "",
  name: "",
  description: ""
});

const emptyStepForm = (): StepForm => ({
  id: "",
  step_order: "",
  text: "",
  visual_asset: "",
  visual_animation: "",
  player_counts: "",
  include_expansions: "",
  exclude_expansions: "",
  include_modules: "",
  exclude_modules: "",
  require_no_expansions: false
});

const normalizeText = (value: string) => value.trim();

const parseOptionalNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRequiredNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const splitNumberCsv = (value: string) =>
  splitCsv(value)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));

const joinCsv = (values?: Array<string | number> | null) =>
  values && values.length ? values.join(", ") : "";

const optionalString = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildUploadPath = (folder: string, file: File) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${folder}/${stamp}-${safeName}`;
};

const extractStoragePath = (url: string, bucket: string) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = url.startsWith("http")
      ? new URL(url)
      : new URL(url, window.location.origin);
    const marker = "/storage/v1/object/public/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }
    const remainder = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    if (!remainder.startsWith(`${bucket}/`)) {
      return null;
    }
    return remainder.slice(bucket.length + 1);
  } catch {
    return null;
  }
};

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [adminState, setAdminState] = useState<
    "idle" | "checking" | "authorized" | "unauthorized"
  >("idle");
  const [adminError, setAdminError] = useState("");

  const [games, setGames] = useState<GameRow[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState("");
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [gameVisibleCount, setGameVisibleCount] = useState(GAME_PAGE_SIZE);
  const [gameFormOpen, setGameFormOpen] = useState(false);

  const [expansions, setExpansions] = useState<ExpansionRow[]>([]);
  const [expansionsLoading, setExpansionsLoading] = useState(false);
  const [expansionsError, setExpansionsError] = useState("");
  const [expansionSearchTerm, setExpansionSearchTerm] = useState("");
  const [expansionVisibleCount, setExpansionVisibleCount] =
    useState(EXPANSION_PAGE_SIZE);
  const [expansionFormOpen, setExpansionFormOpen] = useState(false);

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState("");
  const [moduleSearchTerm, setModuleSearchTerm] = useState("");
  const [moduleVisibleCount, setModuleVisibleCount] = useState(MODULE_PAGE_SIZE);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);

  const [steps, setSteps] = useState<StepRow[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState("");
  const [stepFormOpen, setStepFormOpen] = useState(false);
  const [stepsReordering, setStepsReordering] = useState(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

  const [admins, setAdmins] = useState<string[]>([]);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminsMessage, setAdminsMessage] = useState("");

  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedExpansionId, setSelectedExpansionId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedStepId, setSelectedStepId] = useState("");

  const [gameMode, setGameMode] = useState<"create" | "edit">("create");
  const [gameForm, setGameForm] = useState<GameForm>(() => emptyGameForm());
  const [gameMessage, setGameMessage] = useState("");
  const [gameCoverUploading, setGameCoverUploading] = useState(false);
  const [gameCoverDeleting, setGameCoverDeleting] = useState(false);
  const coverUploadRef = useRef<HTMLInputElement | null>(null);

  const [expansionMode, setExpansionMode] = useState<"create" | "edit">(
    "create"
  );
  const [expansionForm, setExpansionForm] = useState<ExpansionForm>(() =>
    emptyExpansionForm()
  );
  const [expansionMessage, setExpansionMessage] = useState("");

  const [moduleMode, setModuleMode] = useState<"create" | "edit">("create");
  const [moduleForm, setModuleForm] = useState<ModuleForm>(() =>
    emptyModuleForm()
  );
  const [moduleMessage, setModuleMessage] = useState("");

  const [stepMode, setStepMode] = useState<"create" | "edit">("create");
  const [stepForm, setStepForm] = useState<StepForm>(() => emptyStepForm());
  const [stepMessage, setStepMessage] = useState("");
  const [stepAssetUploading, setStepAssetUploading] = useState(false);
  const [stepAssetDeleting, setStepAssetDeleting] = useState(false);
  const [stepsBodyMaxHeight, setStepsBodyMaxHeight] = useState<number | null>(
    null
  );
  const stepsHeaderRef = useRef<HTMLDivElement | null>(null);
  const stepsRowRef = useRef<HTMLDivElement | null>(null);
  const stepsFormRef = useRef<HTMLDivElement | null>(null);

  const userEmail = session?.user?.email ?? "";

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setAuthError("Missing Supabase configuration.");
      setAuthLoading(false);
      return;
    }
    const client = supabase;
    let active = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setAuthError(error.message);
        }
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      return;
    }
    if (!userEmail) {
      setAdminState("idle");
      setAdminError("");
      return;
    }
    const client = supabase;
    let active = true;
    setAdminState("checking");
    setAdminError("");

    client
      .from("admins")
      .select("email")
      .eq("email", userEmail)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setAdminError(error.message);
          setAdminState("unauthorized");
          return;
        }
        setAdminState(data ? "authorized" : "unauthorized");
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  const loadGames = async () => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    setGamesLoading(true);
    setGamesError("");
    try {
      const { data, error } = await client
        .from("games")
        .select(
          "id, title, players_min, players_max, popularity, tagline, cover_image, rules_url"
        )
        .order("title", { ascending: true });
      if (error) {
        throw error;
      }
      setGames((data ?? []) as GameRow[]);
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : String(err));
    } finally {
      setGamesLoading(false);
    }
  };

  const loadExpansions = async (gameId: string) => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    setExpansionsLoading(true);
    setExpansionsError("");
    try {
      const { data, error } = await client
        .from("expansions")
        .select("id, game_id, name")
        .eq("game_id", gameId)
        .order("name", { ascending: true });
      if (error) {
        throw error;
      }
      setExpansions((data ?? []) as ExpansionRow[]);
    } catch (err) {
      setExpansionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpansionsLoading(false);
    }
  };

  const loadModules = async (expansionId: string) => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    setModulesLoading(true);
    setModulesError("");
    try {
      const { data, error } = await client
        .from("expansion_modules")
        .select("id, expansion_id, name, description")
        .eq("expansion_id", expansionId)
        .order("name", { ascending: true });
      if (error) {
        throw error;
      }
      setModules((data ?? []) as ModuleRow[]);
    } catch (err) {
      setModulesError(err instanceof Error ? err.message : String(err));
    } finally {
      setModulesLoading(false);
    }
  };

  const loadSteps = async (gameId: string) => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    setStepsLoading(true);
    setStepsError("");
    try {
      const { data, error } = await client
        .from("steps")
        .select(
          "id, game_id, step_order, text, visual_asset, visual_animation, player_counts, include_expansions, exclude_expansions, include_modules, exclude_modules, require_no_expansions"
        )
        .eq("game_id", gameId)
        .order("step_order", { ascending: true });
      if (error) {
        throw error;
      }
      setSteps((data ?? []) as StepRow[]);
    } catch (err) {
      setStepsError(err instanceof Error ? err.message : String(err));
    } finally {
      setStepsLoading(false);
    }
  };

  const loadAdmins = async () => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    setAdminsMessage("");
    try {
      const { data, error } = await client
        .from("admins")
        .select("email")
        .order("email", { ascending: true });
      if (error) {
        throw error;
      }
      const emails = (data ?? [])
        .map((entry) => entry.email)
        .filter(Boolean) as string[];
      setAdmins(emails);
    } catch (err) {
      setAdminsMessage(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (adminState !== "authorized") {
      return;
    }
    loadGames();
    loadAdmins();
  }, [adminState]);

  useEffect(() => {
    setGameVisibleCount(GAME_PAGE_SIZE);
  }, [gameSearchTerm]);

  useEffect(() => {
    setExpansionVisibleCount(EXPANSION_PAGE_SIZE);
  }, [expansionSearchTerm]);

  useEffect(() => {
    setModuleVisibleCount(MODULE_PAGE_SIZE);
  }, [moduleSearchTerm]);

  useEffect(() => {
    if (selectedGameId && !games.some((game) => game.id === selectedGameId)) {
      setSelectedGameId("");
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    if (adminState !== "authorized" || !selectedGameId) {
      setExpansions([]);
      setSteps([]);
      return;
    }
    loadExpansions(selectedGameId);
    loadSteps(selectedGameId);
  }, [adminState, selectedGameId]);

  useEffect(() => {
    setSelectedExpansionId("");
    setExpansionSearchTerm("");
    setExpansionVisibleCount(EXPANSION_PAGE_SIZE);
    setExpansionFormOpen(false);
  }, [selectedGameId]);

  useEffect(() => {
    if (
      selectedExpansionId &&
      !expansions.some((expansion) => expansion.id === selectedExpansionId)
    ) {
      setSelectedExpansionId("");
    }
  }, [expansions, selectedExpansionId]);

  useEffect(() => {
    if (adminState !== "authorized" || !selectedExpansionId) {
      setModules([]);
      return;
    }
    loadModules(selectedExpansionId);
  }, [adminState, selectedExpansionId]);

  useEffect(() => {
    if (!selectedGameId) {
      setGameMode("create");
      setGameForm(emptyGameForm());
      return;
    }
    const selected = games.find((game) => game.id === selectedGameId);
    if (selected) {
      setGameMode("edit");
      setGameForm({
        id: selected.id,
        title: selected.title,
        players_min: String(selected.players_min ?? ""),
        players_max: String(selected.players_max ?? ""),
        popularity: String(selected.popularity ?? 0),
        tagline: selected.tagline ?? "",
        cover_image: selected.cover_image ?? "",
        rules_url: selected.rules_url ?? ""
      });
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    if (!selectedExpansionId) {
      setExpansionMode("create");
      setExpansionForm(emptyExpansionForm());
      return;
    }
    const selected = expansions.find((expansion) => expansion.id === selectedExpansionId);
    if (selected) {
      setExpansionMode("edit");
      setExpansionForm({
        id: selected.id,
        name: selected.name
      });
    }
  }, [expansions, selectedExpansionId]);

  useEffect(() => {
    setSelectedModuleId("");
    setModuleMode("create");
    setModuleForm(emptyModuleForm());
    setModuleSearchTerm("");
    setModuleVisibleCount(MODULE_PAGE_SIZE);
    setModuleFormOpen(false);
  }, [selectedExpansionId]);

  useEffect(() => {
    if (!selectedModuleId) {
      setModuleMode("create");
      setModuleForm(emptyModuleForm());
      return;
    }
    const selected = modules.find((module) => module.id === selectedModuleId);
    if (!selected) {
      setSelectedModuleId("");
      return;
    }
    setModuleMode("edit");
    setModuleForm({
      id: selected.id,
      name: selected.name,
      description: selected.description ?? ""
    });
  }, [modules, selectedModuleId]);

  useEffect(() => {
    setStepMode("create");
    setStepForm(emptyStepForm());
    setSelectedStepId("");
    setStepFormOpen(false);
    setStepsReordering(false);
    setDraggedStepId(null);
    setDragOverStepId(null);
    setStepsBodyMaxHeight(null);
  }, [selectedGameId]);

  useEffect(() => {
    if (!selectedStepId) {
      if (stepMode !== "create") {
        setStepMode("create");
        setStepForm(emptyStepForm());
      }
      return;
    }
    const selected = steps.find((step) => step.id === selectedStepId);
    if (!selected) {
      setSelectedStepId("");
      setStepFormOpen(false);
      return;
    }
    setStepMode("edit");
    setStepForm({
      id: selected.id,
      step_order: String(selected.step_order ?? ""),
      text: selected.text ?? "",
      visual_asset: selected.visual_asset ?? "",
      visual_animation: selected.visual_animation ?? "",
      player_counts: joinCsv(selected.player_counts),
      include_expansions: joinCsv(selected.include_expansions),
      exclude_expansions: joinCsv(selected.exclude_expansions),
      include_modules: joinCsv(selected.include_modules),
      exclude_modules: joinCsv(selected.exclude_modules),
      require_no_expansions: Boolean(selected.require_no_expansions)
    });
  }, [selectedStepId, stepMode, steps]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    if (!supabaseReady || !supabase) {
      setAuthError("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client.auth.signInWithPassword({
        email: normalizeText(authEmail),
        password: authPassword
      });
      if (error) {
        throw error;
      }
      setAuthNotice("Signed in.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSignOut = async () => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;
    await client.auth.signOut();
    setSession(null);
    setAdminState("idle");
  };

  const uploadImage = async (file: File, folder: string) => {
    if (!supabaseReady || !supabase) {
      throw new Error("Missing Supabase configuration.");
    }
    const client = supabase;
    const path = buildUploadPath(folder, file);
    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { upsert: true });
    if (error) {
      throw error;
    }
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const deleteStorageObjectFromUrl = async (url: string) => {
    if (!supabaseReady || !supabase) {
      throw new Error("Missing Supabase configuration.");
    }
    const path = extractStoragePath(url, IMAGE_BUCKET);
    if (!path) {
      throw new Error("URL is not a public Supabase Storage link for this bucket.");
    }
    const client = supabase;
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) {
      throw error;
    }
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setGameCoverUploading(true);
    setGameMessage("");
    try {
      const url = await uploadImage(file, "game-covers");
      setGameForm((current) => ({ ...current, cover_image: url }));
      setGameMessage("Cover image uploaded.");
    } catch (err) {
      setGameMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setGameCoverUploading(false);
      event.target.value = "";
    }
  };

  const handleStepAssetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setStepAssetUploading(true);
    setStepMessage("");
    try {
      const url = await uploadImage(file, "step-assets");
      setStepForm((current) => ({ ...current, visual_asset: url }));
      setStepMessage("Step asset uploaded.");
    } catch (err) {
      setStepMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setStepAssetUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteCoverImage = async () => {
    const url = gameForm.cover_image.trim();
    if (!url) {
      setGameMessage("No cover image to delete.");
      return;
    }
    if (!window.confirm("Remove this cover image from storage?")) {
      return;
    }
    if (!supabaseReady || !supabase) {
      setGameMessage("Missing Supabase configuration.");
      return;
    }
    setGameCoverDeleting(true);
    setGameMessage("");
    try {
      await deleteStorageObjectFromUrl(url);
      if (gameMode === "edit" && selectedGameId) {
        const { error } = await supabase
          .from("games")
          .update({ cover_image: null })
          .eq("id", selectedGameId);
        if (error) {
          throw error;
        }
        await loadGames();
      }
      setGameForm((current) => ({ ...current, cover_image: "" }));
      setGameMessage("Cover image removed.");
    } catch (err) {
      setGameMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setGameCoverDeleting(false);
    }
  };

  const handleDeleteStepAsset = async () => {
    const url = stepForm.visual_asset.trim();
    if (!url) {
      setStepMessage("No step asset to delete.");
      return;
    }
    if (!window.confirm("Remove this step asset from storage?")) {
      return;
    }
    if (!supabaseReady || !supabase) {
      setStepMessage("Missing Supabase configuration.");
      return;
    }
    setStepAssetDeleting(true);
    setStepMessage("");
    try {
      await deleteStorageObjectFromUrl(url);
      if (stepMode === "edit" && stepForm.id) {
        const { error } = await supabase
          .from("steps")
          .update({ visual_asset: null })
          .eq("id", stepForm.id);
        if (error) {
          throw error;
        }
        if (selectedGameId) {
          await loadSteps(selectedGameId);
        }
      }
      setStepForm((current) => ({ ...current, visual_asset: "" }));
      setStepMessage("Step asset removed.");
    } catch (err) {
      setStepMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setStepAssetDeleting(false);
    }
  };

  const handleCreateOrUpdateGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGameMessage("");
    if (!supabaseReady || !supabase) {
      setGameMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    const id = normalizeText(gameForm.id);
    const title = normalizeText(gameForm.title);
    const playersMin = parseRequiredNumber(gameForm.players_min);
    const playersMax = parseRequiredNumber(gameForm.players_max);
    if (!id && gameMode === "create") {
      setGameMessage("Game id is required.");
      return;
    }
    if (!title) {
      setGameMessage("Game title is required.");
      return;
    }
    if (playersMin === null || playersMax === null) {
      setGameMessage("Player counts must be numbers.");
      return;
    }
    const payload = {
      id,
      title,
      players_min: playersMin,
      players_max: playersMax,
      popularity: parseOptionalNumber(gameForm.popularity) ?? 0,
      tagline: optionalString(gameForm.tagline),
      cover_image: optionalString(gameForm.cover_image),
      rules_url: optionalString(gameForm.rules_url)
    };

    try {
      if (gameMode === "create") {
        const { error } = await client.from("games").insert(payload);
        if (error) {
          throw error;
        }
        setGameMessage("Game created.");
      } else {
        const { error } = await client
          .from("games")
          .update({
            title: payload.title,
            players_min: payload.players_min,
            players_max: payload.players_max,
            popularity: payload.popularity,
            tagline: payload.tagline,
            cover_image: payload.cover_image,
            rules_url: payload.rules_url
          })
          .eq("id", payload.id);
        if (error) {
          throw error;
        }
        setGameMessage("Game updated.");
      }
      await loadGames();
      if (gameMode === "create") {
        setSelectedGameId(payload.id);
        setGameMode("edit");
      }
    } catch (err) {
      setGameMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteGame = async () => {
    if (!selectedGameId) {
      setGameMessage("Select a game first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setGameMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client.from("games").delete().eq("id", selectedGameId);
      if (error) {
        throw error;
      }
      setGameMessage("Game deleted.");
      setGameMode("create");
      setGameForm(emptyGameForm());
      setSelectedGameId("");
      setGameFormOpen(true);
      await loadGames();
    } catch (err) {
      setGameMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateOrUpdateExpansion = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setExpansionMessage("");
    if (!selectedGameId) {
      setExpansionMessage("Select a game first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setExpansionMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    const id = normalizeText(expansionForm.id);
    const name = normalizeText(expansionForm.name);
    if (!id && expansionMode === "create") {
      setExpansionMessage("Expansion id is required.");
      return;
    }
    if (!name) {
      setExpansionMessage("Expansion name is required.");
      return;
    }

    try {
      if (expansionMode === "create") {
        const { error } = await client
          .from("expansions")
          .insert({ id, name, game_id: selectedGameId });
        if (error) {
          throw error;
        }
        setExpansionMessage("Expansion created.");
      } else {
        const { error } = await client
          .from("expansions")
          .update({ name })
          .eq("id", id);
        if (error) {
          throw error;
        }
        setExpansionMessage("Expansion updated.");
      }
      await loadExpansions(selectedGameId);
      if (expansionMode === "create") {
        setSelectedExpansionId(id);
        setExpansionMode("edit");
      }
    } catch (err) {
      setExpansionMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteExpansion = async () => {
    if (!selectedExpansionId) {
      setExpansionMessage("Select an expansion first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setExpansionMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client
        .from("expansions")
        .delete()
        .eq("id", selectedExpansionId);
      if (error) {
        throw error;
      }
      setExpansionMessage("Expansion deleted.");
      setExpansionMode("create");
      setExpansionForm(emptyExpansionForm());
      setSelectedExpansionId("");
      await loadExpansions(selectedGameId);
    } catch (err) {
      setExpansionMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateOrUpdateModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModuleMessage("");
    if (!selectedExpansionId) {
      setModuleMessage("Select an expansion first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setModuleMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    const id = normalizeText(moduleForm.id);
    const name = normalizeText(moduleForm.name);
    if (!id && moduleMode === "create") {
      setModuleMessage("Module id is required.");
      return;
    }
    if (!name) {
      setModuleMessage("Module name is required.");
      return;
    }
    const payload = {
      id,
      expansion_id: selectedExpansionId,
      name,
      description: optionalString(moduleForm.description)
    };

    try {
      if (moduleMode === "create") {
        const { error } = await client.from("expansion_modules").insert(payload);
        if (error) {
          throw error;
        }
        setModuleMessage("Module created.");
      } else {
        const { error } = await client
          .from("expansion_modules")
          .update({ name: payload.name, description: payload.description })
          .eq("id", payload.id);
        if (error) {
          throw error;
        }
        setModuleMessage("Module updated.");
      }
      await loadModules(selectedExpansionId);
      if (moduleMode === "create") {
        setSelectedModuleId(id);
        setModuleFormOpen(true);
      }
    } catch (err) {
      setModuleMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteModule = async () => {
    if (!selectedModuleId) {
      setModuleMessage("Select a module first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setModuleMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client
        .from("expansion_modules")
        .delete()
        .eq("id", selectedModuleId);
      if (error) {
        throw error;
      }
      setModuleMessage("Module deleted.");
      setModuleMode("create");
      setModuleForm(emptyModuleForm());
      setSelectedModuleId("");
      await loadModules(selectedExpansionId);
    } catch (err) {
      setModuleMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateOrUpdateStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStepMessage("");
    if (!selectedGameId) {
      setStepMessage("Select a game first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setStepMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    const orderValue = parseRequiredNumber(stepForm.step_order);
    const text = normalizeText(stepForm.text);
    if (orderValue === null) {
      setStepMessage("Step order must be a number.");
      return;
    }
    if (!text) {
      setStepMessage("Step text is required.");
      return;
    }
    const payload = {
      game_id: selectedGameId,
      step_order: orderValue,
      text,
      visual_asset: optionalString(stepForm.visual_asset),
      visual_animation: optionalString(stepForm.visual_animation),
      player_counts: splitNumberCsv(stepForm.player_counts),
      include_expansions: splitCsv(stepForm.include_expansions),
      exclude_expansions: splitCsv(stepForm.exclude_expansions),
      include_modules: splitCsv(stepForm.include_modules),
      exclude_modules: splitCsv(stepForm.exclude_modules),
      require_no_expansions: stepForm.require_no_expansions
    };

    const normalizedPayload = {
      ...payload,
      player_counts: payload.player_counts.length ? payload.player_counts : null,
      include_expansions: payload.include_expansions.length
        ? payload.include_expansions
        : null,
      exclude_expansions: payload.exclude_expansions.length
        ? payload.exclude_expansions
        : null,
      include_modules: payload.include_modules.length
        ? payload.include_modules
        : null,
      exclude_modules: payload.exclude_modules.length
        ? payload.exclude_modules
        : null
    };

    try {
      if (stepMode === "create") {
        const { data, error } = await client
          .from("steps")
          .insert(normalizedPayload)
          .select("id")
          .single();
        if (error) {
          throw error;
        }
        setStepMessage("Step created.");
        await loadSteps(selectedGameId);
        if (data?.id) {
          setSelectedStepId(data.id);
          setStepFormOpen(true);
        }
      } else {
        const { error } = await client
          .from("steps")
          .update(normalizedPayload)
          .eq("id", stepForm.id);
        if (error) {
          throw error;
        }
        setStepMessage("Step updated.");
        await loadSteps(selectedGameId);
      }
    } catch (err) {
      setStepMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteStep = async () => {
    if (!selectedStepId) {
      setStepMessage("Select a step first.");
      return;
    }
    if (!supabaseReady || !supabase) {
      setStepMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client.from("steps").delete().eq("id", selectedStepId);
      if (error) {
        throw error;
      }
      setStepMessage("Step deleted.");
      setStepMode("create");
      setStepForm(emptyStepForm());
      setSelectedStepId("");
      setStepFormOpen(false);
      await loadSteps(selectedGameId);
    } catch (err) {
      setStepMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminsMessage("");
    if (!supabaseReady || !supabase) {
      setAdminsMessage("Missing Supabase configuration.");
      return;
    }
    const email = normalizeText(adminEmailInput);
    if (!email) {
      setAdminsMessage("Enter an email address.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client.from("admins").insert({ email });
      if (error) {
        throw error;
      }
      setAdminsMessage("Admin added.");
      setAdminEmailInput("");
      await loadAdmins();
    } catch (err) {
      setAdminsMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!supabaseReady || !supabase) {
      setAdminsMessage("Missing Supabase configuration.");
      return;
    }
    const client = supabase;
    try {
      const { error } = await client.from("admins").delete().eq("email", email);
      if (error) {
        throw error;
      }
      setAdminsMessage("Admin removed.");
      await loadAdmins();
    } catch (err) {
      setAdminsMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.step_order - b.step_order),
    [steps]
  );

  useLayoutEffect(() => {
    if (sortedSteps.length <= 10) {
      setStepsBodyMaxHeight(null);
      return;
    }
    const headerHeight = stepsHeaderRef.current?.offsetHeight ?? 0;
    const rowHeight = stepsRowRef.current?.offsetHeight ?? 0;
    const formHeight =
      stepFormOpen && stepsFormRef.current ? stepsFormRef.current.offsetHeight : 0;
    if (!rowHeight) {
      setStepsBodyMaxHeight(null);
      return;
    }
    setStepsBodyMaxHeight(headerHeight + rowHeight * 10 + formHeight);
  }, [sortedSteps.length, stepFormOpen, selectedStepId, stepForm]);

  const filteredGames = useMemo(() => {
    const term = gameSearchTerm.trim().toLowerCase();
    if (!term) {
      return games;
    }
    return games.filter((game) => {
      const titleMatch = game.title.toLowerCase().includes(term);
      const idMatch = game.id.toLowerCase().includes(term);
      return titleMatch || idMatch;
    });
  }, [games, gameSearchTerm]);

  const filteredExpansions = useMemo(() => {
    const term = expansionSearchTerm.trim().toLowerCase();
    if (!term) {
      return expansions;
    }
    return expansions.filter((expansion) => {
      const nameMatch = expansion.name.toLowerCase().includes(term);
      const idMatch = expansion.id.toLowerCase().includes(term);
      return nameMatch || idMatch;
    });
  }, [expansionSearchTerm, expansions]);

  const filteredModules = useMemo(() => {
    const term = moduleSearchTerm.trim().toLowerCase();
    if (!term) {
      return modules;
    }
    return modules.filter((module) => {
      const nameMatch = module.name.toLowerCase().includes(term);
      const idMatch = module.id.toLowerCase().includes(term);
      return nameMatch || idMatch;
    });
  }, [moduleSearchTerm, modules]);

  const visibleGames = useMemo(
    () => filteredGames.slice(0, gameVisibleCount),
    [filteredGames, gameVisibleCount]
  );

  const visibleExpansions = useMemo(
    () => filteredExpansions.slice(0, expansionVisibleCount),
    [filteredExpansions, expansionVisibleCount]
  );

  const visibleModules = useMemo(
    () => filteredModules.slice(0, moduleVisibleCount),
    [filteredModules, moduleVisibleCount]
  );

  const canLoadMoreGames = filteredGames.length > visibleGames.length;
  const canLoadMoreExpansions =
    filteredExpansions.length > visibleExpansions.length;
  const canLoadMoreModules = filteredModules.length > visibleModules.length;
  const gameFormLabel =
    gameMode === "create"
      ? "New game"
      : `Editing: ${gameForm.title || gameForm.id || "Game"}`;
  const expansionFormLabel =
    expansionMode === "create"
      ? "New expansion"
      : `Editing: ${expansionForm.name || expansionForm.id || "Expansion"}`;
  const moduleFormLabel =
    moduleMode === "create"
      ? "New module"
      : `Editing: ${moduleForm.name || moduleForm.id || "Module"}`;
  const stepFormLabel =
    stepMode === "create"
      ? "New step"
      : `Editing: Step ${stepForm.step_order || "?"}`;
  const renderStepForm = () => (
    <div className="steps-inline-form" ref={stepsFormRef}>
      <div className="admin-form-header">
        <strong>{stepFormLabel}</strong>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => setStepFormOpen(false)}
        >
          Hide
        </button>
      </div>
      <form
        className="admin-form admin-form-grid"
        onSubmit={handleCreateOrUpdateStep}
      >
        <label className="form-field">
          <span>Step order</span>
          <input
            type="number"
            value={stepForm.step_order}
            onChange={(event) =>
              setStepForm({ ...stepForm, step_order: event.target.value })
            }
            min={1}
          />
        </label>
        <label className="form-field full-width">
          <span>Step text</span>
          <textarea
            value={stepForm.text}
            onChange={(event) => setStepForm({ ...stepForm, text: event.target.value })}
            rows={3}
          />
        </label>
        <label className="form-field full-width">
          <span>Visual asset URL</span>
          <input
            value={stepForm.visual_asset}
            onChange={(event) =>
              setStepForm({ ...stepForm, visual_asset: event.target.value })
            }
            placeholder="https://..."
          />
        </label>
        <label className="form-field full-width">
          <span>Upload step asset</span>
          <input type="file" accept="image/*" onChange={handleStepAssetUpload} />
        </label>
        <div className="admin-actions full-width">
          <button
            type="button"
            className="btn ghost"
            onClick={handleDeleteStepAsset}
            disabled={!stepForm.visual_asset || stepAssetUploading || stepAssetDeleting}
          >
            Remove step asset
          </button>
        </div>
        <label className="form-field">
          <span>Visual animation</span>
          <input
            value={stepForm.visual_animation}
            onChange={(event) =>
              setStepForm({ ...stepForm, visual_animation: event.target.value })
            }
            placeholder="fade-in"
          />
        </label>
        <label className="form-field">
          <span>Player counts</span>
          <input
            value={stepForm.player_counts}
            onChange={(event) =>
              setStepForm({ ...stepForm, player_counts: event.target.value })
            }
            placeholder="2,3,4"
          />
        </label>
        <label className="form-field">
          <span>Include expansions</span>
          <input
            value={stepForm.include_expansions}
            onChange={(event) =>
              setStepForm({ ...stepForm, include_expansions: event.target.value })
            }
            placeholder="expansion-id"
          />
        </label>
        <label className="form-field">
          <span>Exclude expansions</span>
          <input
            value={stepForm.exclude_expansions}
            onChange={(event) =>
              setStepForm({ ...stepForm, exclude_expansions: event.target.value })
            }
            placeholder="expansion-id"
          />
        </label>
        <label className="form-field">
          <span>Include modules</span>
          <input
            value={stepForm.include_modules}
            onChange={(event) =>
              setStepForm({ ...stepForm, include_modules: event.target.value })
            }
            placeholder="module-id"
          />
        </label>
        <label className="form-field">
          <span>Exclude modules</span>
          <input
            value={stepForm.exclude_modules}
            onChange={(event) =>
              setStepForm({ ...stepForm, exclude_modules: event.target.value })
            }
            placeholder="module-id"
          />
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={stepForm.require_no_expansions}
            onChange={(event) =>
              setStepForm({
                ...stepForm,
                require_no_expansions: event.target.checked
              })
            }
          />
          <span>Require no expansions</span>
        </label>
        <div className="admin-actions full-width">
          <button type="submit" className="btn primary" disabled={stepAssetUploading}>
            {stepMode === "create" ? "Create step" : "Save step"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={handleDeleteStep}
            disabled={!selectedStepId}
          >
            Delete step
          </button>
        </div>
      </form>
      {stepAssetUploading && <div className="status">Uploading asset...</div>}
      {stepAssetDeleting && <div className="status">Removing asset...</div>}
    </div>
  );

  const handleSelectGame = (id: string) => {
    if (selectedGameId !== id) {
      setSelectedGameId(id);
    }
  };

  const handleNewGame = () => {
    setSelectedGameId("");
    setGameMode("create");
    setGameForm(emptyGameForm());
    setGameFormOpen(true);
  };

  const handleEditGame = (id: string) => {
    if (selectedGameId !== id) {
      setSelectedGameId(id);
    }
    setGameFormOpen(true);
  };

  const handleLoadMoreGames = () => {
    setGameVisibleCount((count) => count + GAME_PAGE_SIZE);
  };

  const handleSelectExpansion = (id: string) => {
    if (selectedExpansionId !== id) {
      setSelectedExpansionId(id);
    }
  };

  const handleNewExpansion = () => {
    setSelectedExpansionId("");
    setExpansionMode("create");
    setExpansionForm(emptyExpansionForm());
    setExpansionFormOpen(true);
  };

  const handleEditExpansion = (id: string) => {
    if (selectedExpansionId !== id) {
      setSelectedExpansionId(id);
    }
    setExpansionFormOpen(true);
  };

  const handleLoadMoreExpansions = () => {
    setExpansionVisibleCount((count) => count + EXPANSION_PAGE_SIZE);
  };

  const handleSelectModule = (id: string) => {
    if (selectedModuleId !== id) {
      setSelectedModuleId(id);
    }
  };

  const handleNewModule = () => {
    setSelectedModuleId("");
    setModuleMode("create");
    setModuleForm(emptyModuleForm());
    setModuleFormOpen(true);
  };

  const handleEditModule = (id: string) => {
    if (selectedModuleId !== id) {
      setSelectedModuleId(id);
    }
    setModuleFormOpen(true);
  };

  const handleLoadMoreModules = () => {
    setModuleVisibleCount((count) => count + MODULE_PAGE_SIZE);
  };

  const handleSelectStep = (step: StepRow) => {
    if (stepFormOpen && selectedStepId !== step.id) {
      setStepFormOpen(false);
    }
    setSelectedStepId(step.id);
  };

  const handleToggleStepForm = (step: StepRow) => {
    if (selectedStepId === step.id && stepFormOpen) {
      setStepFormOpen(false);
      return;
    }
    setSelectedStepId(step.id);
    setStepFormOpen(true);
  };

  const handleNewStep = () => {
    const nextOrder = sortedSteps.length
      ? Math.max(...sortedSteps.map((step) => step.step_order)) + 1
      : 1;
    setStepMode("create");
    setStepForm({
      ...emptyStepForm(),
      step_order: String(nextOrder)
    });
    setSelectedStepId("");
    setStepFormOpen(true);
  };

  const reorderSteps = (list: StepRow[], startIndex: number, endIndex: number) => {
    const result = [...list];
    const [moved] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, moved);
    return result.map((step, index) => ({
      ...step,
      step_order: index + 1
    }));
  };

  const persistStepOrder = async (orderedSteps: StepRow[]) => {
    if (!supabaseReady || !supabase) {
      throw new Error("Missing Supabase configuration.");
    }
    const client = supabase;
    const updates = orderedSteps.map((step) =>
      client.from("steps").update({ step_order: step.step_order }).eq("id", step.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      throw firstError;
    }
  };

  const handleStepDragStart = (event: DragEvent<HTMLDivElement>, stepId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stepId);
    setDraggedStepId(stepId);
  };

  const handleStepDragOver = (event: DragEvent<HTMLDivElement>, stepId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverStepId !== stepId) {
      setDragOverStepId(stepId);
    }
  };

  const handleStepDrop = async (event: DragEvent<HTMLDivElement>, stepId: string) => {
    event.preventDefault();
    const sourceId =
      draggedStepId || event.dataTransfer.getData("text/plain") || "";
    if (!sourceId || sourceId === stepId) {
      setDragOverStepId(null);
      return;
    }
    const current = sortedSteps;
    const fromIndex = current.findIndex((step) => step.id === sourceId);
    const toIndex = current.findIndex((step) => step.id === stepId);
    if (fromIndex === -1 || toIndex === -1) {
      setDragOverStepId(null);
      return;
    }
    const reordered = reorderSteps(current, fromIndex, toIndex);
    setSteps(reordered);
    setStepsReordering(true);
    setStepMessage("");
    try {
      await persistStepOrder(reordered);
      setStepMessage("Step order updated.");
    } catch (err) {
      setStepMessage(err instanceof Error ? err.message : String(err));
      if (selectedGameId) {
        await loadSteps(selectedGameId);
      }
    } finally {
      setStepsReordering(false);
      setDraggedStepId(null);
      setDragOverStepId(null);
    }
  };

  const handleStepDragEnd = () => {
    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  if (!supabaseReady || !supabase) {
    return (
      <div className="app admin-app">
        <header className="masthead">
          <div className="brand-row">
            <a className="eyebrow brand-button" href="#/">
              Board Game Setups
            </a>
          </div>
          <h1>Admin Control Panel</h1>
        </header>
        <div className="status error">Missing Supabase configuration.</div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="app admin-app">
        <header className="masthead">
          <div className="brand-row">
            <a className="eyebrow brand-button" href="#/">
              Board Game Setups
            </a>
          </div>
          <h1>Admin Control Panel</h1>
        </header>
        <div className="status">Checking admin session...</div>
      </div>
    );
  }

  return (
    <div className="app admin-app">
      <header className="masthead">
        <div className="brand-row">
          <a className="eyebrow brand-button" href="#/">
            Board Game Setups
          </a>
          {session ? (
            <button
              type="button"
              className="btn primary small admin-signout"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          ) : null}
        </div>
        <h1>Admin Control Panel</h1>
        <p className="subtitle">
          Manage games, expansions, modules, and steps with Supabase-backed edits.
        </p>
      </header>

      {!session && (
        <section className="stage">
          <div className="panel admin-panel games-panel">
            <h2>Sign in</h2>
            <form className="admin-form" onSubmit={handleSignIn}>
              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="admin@email.com"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <button type="submit" className="btn primary">
                Sign in
              </button>
            </form>
            {authError && <div className="status error">{authError}</div>}
            {authNotice && <div className="status">{authNotice}</div>}
          </div>
        </section>
      )}

      {session && adminState === "checking" && (
        <div className="status">Checking admin access...</div>
      )}

      {session && adminState === "unauthorized" && (
        <div className="panel admin-panel">
          <h2>Access denied</h2>
          <p className="hint">
            Your account is signed in as {userEmail}, but it is not listed in the
            admins table.
          </p>
          {adminError && <div className="status error">{adminError}</div>}
          <div className="admin-actions">
            <button type="button" className="btn ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {session && adminState === "authorized" && (
        <section className="stage admin-stage">
          <div className="panel admin-panel">
            <h2>Admin access</h2>
            <form className="games-toolbar" onSubmit={handleAddAdmin}>
              <label className="form-field games-search">
                <span>Admin email</span>
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(event) => setAdminEmailInput(event.target.value)}
                  placeholder="new.admin@email.com"
                />
              </label>
              <button type="submit" className="btn ghost small">
                Add admin
              </button>
            </form>
            {adminsMessage && <div className="status">{adminsMessage}</div>}
            {admins.length > 0 && (
              <div className="admin-list">
                {admins.map((email) => (
                  <div key={email} className="admin-list-row">
                    <span>{email}</span>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => handleRemoveAdmin(email)}
                      disabled={email === userEmail}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel admin-panel">
            <h2>Games</h2>
            <div className="games-toolbar">
              <label className="form-field games-search">
                <span>Search games</span>
                <input
                  type="search"
                  value={gameSearchTerm}
                  onChange={(event) => setGameSearchTerm(event.target.value)}
                  placeholder="Search by title or id"
                />
              </label>
              <button type="button" className="btn ghost small" onClick={handleNewGame}>
                New game
              </button>
            </div>
            {gamesLoading && <div className="status">Loading games...</div>}
            {gamesError && <div className="status error">{gamesError}</div>}

            <div className="admin-table">
              <div className="admin-table-body">
                <div className="admin-table-header">
                  <span className="table-col-start">Title</span>
                  <span className="table-col-center">Players</span>
                  <span className="table-col-center">Pop</span>
                  <span className="table-col-end" aria-label="Edit" />
                </div>
                {visibleGames.map((game) => (
                  <div
                    key={game.id}
                    className={`admin-table-row ${
                      game.id === selectedGameId ? "selected" : ""
                    }`}
                    onClick={() => handleSelectGame(game.id)}
                  >
                    <span className="admin-table-title table-col-start">
                      {game.title}
                    </span>
                    <span className="admin-table-meta table-col-center">
                      {game.players_min}-{game.players_max}
                    </span>
                    <span className="admin-table-meta table-col-center">
                      {game.popularity ?? 0}
                    </span>
                    <div className="table-col-end">
                      <button
                        type="button"
                        className="btn ghost small admin-table-edit"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditGame(game.id);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                {!gamesLoading && !gamesError && visibleGames.length === 0 && (
                  <div className="empty-state compact">No games match that search.</div>
                )}
              </div>
            </div>

            <div className="games-footer">
              <div className="games-count">
                Showing {visibleGames.length} of {filteredGames.length}
              </div>
              {canLoadMoreGames && (
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={handleLoadMoreGames}
                >
                  Load more
                </button>
              )}
            </div>

            <div className={`admin-collapsible ${gameFormOpen ? "is-open" : ""}`}>
              <div
                className="admin-collapsible-inner"
                style={{ width: "100%", maxWidth: "none" }}
              >
                <div className="admin-form-header">
                  <strong>{gameFormLabel}</strong>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => setGameFormOpen(false)}
                  >
                    Hide
                  </button>
                </div>
                <form
                  className="admin-form games-form-grid"
                  style={{ width: "100%", maxWidth: "none" }}
                  onSubmit={handleCreateOrUpdateGame}
                >
                  <div
                    className="games-form-top-row"
                    style={{ width: "100%" }}
                  >
                    <label className="form-field">
                      <span>Game id</span>
                      <input
                        value={gameForm.id}
                        onChange={(event) =>
                          setGameForm({ ...gameForm, id: event.target.value })
                        }
                        disabled={gameMode === "edit"}
                        placeholder="cascadia"
                      />
                    </label>
                    <label className="form-field">
                      <span>Title</span>
                      <input
                        value={gameForm.title}
                        onChange={(event) =>
                          setGameForm({ ...gameForm, title: event.target.value })
                        }
                        placeholder="Cascadia"
                      />
                    </label>
                    <label className="form-field games-form-tagline">
                      <span>Tagline</span>
                      <input
                        value={gameForm.tagline}
                        onChange={(event) =>
                          setGameForm({ ...gameForm, tagline: event.target.value })
                        }
                        placeholder="Short description"
                      />
                    </label>
                  </div>
                  <label className="form-field">
                    <span>Players min</span>
                    <input
                      type="number"
                      value={gameForm.players_min}
                      onChange={(event) =>
                        setGameForm({ ...gameForm, players_min: event.target.value })
                      }
                      min={1}
                    />
                  </label>
                  <label className="form-field">
                    <span>Players max</span>
                    <input
                      type="number"
                      value={gameForm.players_max}
                      onChange={(event) =>
                        setGameForm({ ...gameForm, players_max: event.target.value })
                      }
                      min={1}
                    />
                  </label>
                  <label className="form-field">
                    <span>Popularity</span>
                    <input
                      type="number"
                      value={gameForm.popularity}
                      onChange={(event) =>
                        setGameForm({ ...gameForm, popularity: event.target.value })
                      }
                      min={0}
                    />
                  </label>
                  <input
                    ref={coverUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="visually-hidden"
                    aria-hidden="true"
                  />
                  <label className="form-field full-width">
                    <span>Rules URL</span>
                    <input
                      value={gameForm.rules_url}
                      onChange={(event) =>
                        setGameForm({ ...gameForm, rules_url: event.target.value })
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <div className="cover-row">
                    <label className="form-field cover-url">
                      <span>Cover image URL</span>
                      <input
                        value={gameForm.cover_image}
                        onChange={(event) =>
                          setGameForm({ ...gameForm, cover_image: event.target.value })
                        }
                        placeholder="https://..."
                      />
                    </label>
                    <div className="cover-actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => coverUploadRef.current?.click()}
                        disabled={gameCoverUploading || gameCoverDeleting}
                      >
                        Upload image
                      </button>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={handleDeleteCoverImage}
                        disabled={
                          !gameForm.cover_image ||
                          gameCoverUploading ||
                          gameCoverDeleting
                        }
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                  <div className="admin-actions full-width">
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={gameCoverUploading}
                    >
                      {gameMode === "create" ? "Create game" : "Save game"}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={handleDeleteGame}
                      disabled={!selectedGameId}
                    >
                      Delete game
                    </button>
                  </div>
                </form>
                {gameCoverUploading && <div className="status">Uploading cover...</div>}
                {gameCoverDeleting && <div className="status">Removing cover...</div>}
                {gameMessage && <div className="status">{gameMessage}</div>}
              </div>
            </div>
          </div>

          <div className="panel admin-panel expansions-panel">
            <h2>Expansions</h2>
            {!selectedGameId ? (
              <div className="empty-state compact">Please select a game first.</div>
            ) : (
              <>
                <div className="games-toolbar">
                  <label className="form-field games-search">
                    <span>Search expansions</span>
                    <input
                      type="search"
                      value={expansionSearchTerm}
                      onChange={(event) => setExpansionSearchTerm(event.target.value)}
                      placeholder="Search by name or id"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={handleNewExpansion}
                  >
                    New expansion
                  </button>
                </div>
                {expansionsLoading && <div className="status">Loading expansions...</div>}
                {expansionsError && (
                  <div className="status error">{expansionsError}</div>
                )}

                <div className="admin-table expansions-table">
                  <div className="admin-table-body">
                    <div className="admin-table-header">
                      <span className="table-col-start">Expansion</span>
                      <span className="table-col-start">ID</span>
                      <span className="table-col-end" aria-label="Edit" />
                    </div>
                    {visibleExpansions.map((expansion) => (
                      <div
                        key={expansion.id}
                        className={`admin-table-row ${
                          expansion.id === selectedExpansionId ? "selected" : ""
                        }`}
                        onClick={() => handleSelectExpansion(expansion.id)}
                      >
                        <span className="admin-table-title table-col-start">
                          {expansion.name}
                        </span>
                        <span className="admin-table-meta table-col-start">
                          {expansion.id}
                        </span>
                        <div className="table-col-end">
                          <button
                            type="button"
                            className="btn ghost small admin-table-edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditExpansion(expansion.id);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                    {!expansionsLoading &&
                      !expansionsError &&
                      visibleExpansions.length === 0 && (
                        <div className="empty-state compact">
                          No expansions match that search.
                        </div>
                      )}
                  </div>
                </div>

                <div className="games-footer">
                  <div className="games-count">
                    Showing {visibleExpansions.length} of {filteredExpansions.length}
                  </div>
                  {canLoadMoreExpansions && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={handleLoadMoreExpansions}
                    >
                      Load more
                    </button>
                  )}
                </div>

                <div
                  className={`admin-collapsible ${
                    expansionFormOpen ? "is-open" : ""
                  }`}
                >
                  <div className="admin-collapsible-inner">
                    <div className="admin-form-header">
                      <strong>{expansionFormLabel}</strong>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setExpansionFormOpen(false)}
                      >
                        Hide
                      </button>
                    </div>
                    <form
                      className="admin-form admin-form-grid"
                      onSubmit={handleCreateOrUpdateExpansion}
                    >
                      <label className="form-field">
                        <span>Expansion id</span>
                        <input
                          value={expansionForm.id}
                          onChange={(event) =>
                            setExpansionForm({
                              ...expansionForm,
                              id: event.target.value
                            })
                          }
                          disabled={expansionMode === "edit"}
                          placeholder="expansion-id"
                        />
                      </label>
                      <label className="form-field">
                        <span>Name</span>
                        <input
                          value={expansionForm.name}
                          onChange={(event) =>
                            setExpansionForm({
                              ...expansionForm,
                              name: event.target.value
                            })
                          }
                          placeholder="Expansion name"
                        />
                      </label>
                      <div className="admin-actions full-width">
                        <button type="submit" className="btn primary">
                          {expansionMode === "create"
                            ? "Create expansion"
                            : "Save expansion"}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={handleDeleteExpansion}
                          disabled={!selectedExpansionId}
                        >
                          Delete expansion
                        </button>
                      </div>
                    </form>
                    {expansionMessage && <div className="status">{expansionMessage}</div>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel admin-panel modules-panel">
            <h2>Modules</h2>
            {!selectedExpansionId ? (
              <div className="empty-state compact">Please select an expansion first.</div>
            ) : (
              <>
                <div className="games-toolbar">
                  <label className="form-field games-search">
                    <span>Search modules</span>
                    <input
                      type="search"
                      value={moduleSearchTerm}
                      onChange={(event) => setModuleSearchTerm(event.target.value)}
                      placeholder="Search by name or id"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={handleNewModule}
                  >
                    New module
                  </button>
                </div>
                {modulesLoading && <div className="status">Loading modules...</div>}
                {modulesError && <div className="status error">{modulesError}</div>}

                <div className="admin-table modules-table">
                  <div className="admin-table-body">
                    <div className="admin-table-header">
                      <span className="table-col-start">Module</span>
                      <span className="table-col-start">ID</span>
                      <span className="table-col-end" aria-label="Edit" />
                    </div>
                    {visibleModules.map((module) => (
                      <div
                        key={module.id}
                        className={`admin-table-row ${
                          module.id === selectedModuleId ? "selected" : ""
                        }`}
                        onClick={() => handleSelectModule(module.id)}
                      >
                        <span className="admin-table-title table-col-start">
                          {module.name}
                        </span>
                        <span className="admin-table-meta table-col-start">
                          {module.id}
                        </span>
                        <div className="table-col-end">
                          <button
                            type="button"
                            className="btn ghost small admin-table-edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditModule(module.id);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                    {!modulesLoading &&
                      !modulesError &&
                      visibleModules.length === 0 && (
                        <div className="empty-state compact">
                          No modules match that search.
                        </div>
                      )}
                  </div>
                </div>

                <div className="games-footer">
                  <div className="games-count">
                    Showing {visibleModules.length} of {filteredModules.length}
                  </div>
                  {canLoadMoreModules && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={handleLoadMoreModules}
                    >
                      Load more
                    </button>
                  )}
                </div>

                <div
                  className={`admin-collapsible ${moduleFormOpen ? "is-open" : ""}`}
                >
                  <div className="admin-collapsible-inner">
                    <div className="admin-form-header">
                      <strong>{moduleFormLabel}</strong>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setModuleFormOpen(false)}
                      >
                        Hide
                      </button>
                    </div>
                    <form
                      className="admin-form admin-form-grid"
                      onSubmit={handleCreateOrUpdateModule}
                    >
                      <label className="form-field">
                        <span>Module id</span>
                        <input
                          value={moduleForm.id}
                          onChange={(event) =>
                            setModuleForm({ ...moduleForm, id: event.target.value })
                          }
                          disabled={moduleMode === "edit"}
                          placeholder="module-id"
                        />
                      </label>
                      <label className="form-field">
                        <span>Name</span>
                        <input
                          value={moduleForm.name}
                          onChange={(event) =>
                            setModuleForm({ ...moduleForm, name: event.target.value })
                          }
                          placeholder="Module name"
                        />
                      </label>
                      <label className="form-field full-width">
                        <span>Description</span>
                        <input
                          value={moduleForm.description}
                          onChange={(event) =>
                            setModuleForm({
                              ...moduleForm,
                              description: event.target.value
                            })
                          }
                          placeholder="Optional description"
                        />
                      </label>
                      <div className="admin-actions full-width">
                        <button type="submit" className="btn primary">
                          {moduleMode === "create" ? "Create module" : "Save module"}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={handleDeleteModule}
                          disabled={!selectedModuleId}
                        >
                          Delete module
                        </button>
                      </div>
                    </form>
                    {moduleMessage && <div className="status">{moduleMessage}</div>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel admin-panel steps-panel">
            <h2>Steps</h2>
            {!selectedGameId ? (
              <div className="empty-state compact">Please select a game first.</div>
            ) : (
              <>
                <div className="games-toolbar">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={handleNewStep}
                    disabled={stepsReordering}
                  >
                    New step
                  </button>
                  <span className="helper">Steps are tied to {selectedGameId}.</span>
                </div>
                {stepsLoading && <div className="status">Loading steps...</div>}
                {stepsError && <div className="status error">{stepsError}</div>}

                <div className="admin-table steps-table">
                  <div
                    className="admin-table-body"
                    style={
                      stepsBodyMaxHeight
                        ? { maxHeight: `${stepsBodyMaxHeight}px`, overflowY: "auto" }
                        : undefined
                    }
                  >
                    <div className="admin-table-header" ref={stepsHeaderRef}>
                      <span className="table-col-center">Move</span>
                      <span className="table-col-center">Order</span>
                      <span className="table-col-start">Step</span>
                      <span className="table-col-end" aria-label="Edit" />
                    </div>
                    {stepFormOpen && stepMode === "create" && !selectedStepId
                      ? renderStepForm()
                      : null}
                    {sortedSteps.map((step, index) => {
                      const isExpanded =
                        stepFormOpen && selectedStepId === step.id;
                      return (
                        <Fragment key={step.id}>
                          <div
                            className={`admin-table-row ${
                              step.id === selectedStepId ? "selected" : ""
                            } ${draggedStepId === step.id ? "is-dragging" : ""} ${
                              dragOverStepId === step.id ? "is-drop-target" : ""
                            }`}
                            ref={index === 0 ? stepsRowRef : undefined}
                            draggable={!stepsReordering}
                            onDragStart={(event) => handleStepDragStart(event, step.id)}
                            onDragOver={(event) => handleStepDragOver(event, step.id)}
                            onDrop={(event) => handleStepDrop(event, step.id)}
                            onDragEnd={handleStepDragEnd}
                            onClick={() => handleSelectStep(step)}
                          >
                            <div className="table-col-center" aria-hidden="true">
                              <span className="drag-handle" />
                            </div>
                            <span className="admin-table-meta table-col-center">
                              {step.step_order}
                            </span>
                            <span className="admin-table-title table-col-start">
                              {step.text}
                            </span>
                            <div className="table-col-end">
                              <button
                                type="button"
                                className="btn ghost small admin-table-toggle"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleToggleStepForm(step);
                                }}
                                aria-expanded={
                                  isExpanded
                                }
                                aria-label={
                                  isExpanded ? "Collapse step" : "Expand step"
                                }
                                disabled={stepsReordering}
                              >
                                <svg
                                  className={`triangle-toggle ${
                                    isExpanded ? "is-open" : ""
                                  }`}
                                  viewBox="0 0 10 6"
                                  aria-hidden="true"
                                  focusable="false"
                                >
                                  <polygon points="1,1 9,1 5,5" fill="currentColor" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {isExpanded ? renderStepForm() : null}
                        </Fragment>
                      );
                    })}
                    {!stepsLoading &&
                      !stepsError &&
                      sortedSteps.length === 0 &&
                      !(stepFormOpen && stepMode === "create") && (
                        <div className="empty-state compact">No steps yet.</div>
                      )}
                  </div>
                </div>

                <div className="games-footer">
                  <div className="games-count">Showing {sortedSteps.length} steps</div>
                  {stepsReordering && <div className="status">Saving order...</div>}
                </div>
                {stepMessage && <div className="status">{stepMessage}</div>}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
