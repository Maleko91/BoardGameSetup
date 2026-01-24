import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseReady } from "../lib/supabase";
import type { CatalogGame } from "../types/game";

type CatalogContextValue = {
  catalog: CatalogGame[];
  catalogLoading: boolean;
  catalogError: string;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider = ({ children }: { children: React.ReactNode }) => {
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");

    const client = supabase;
    if (!supabaseReady || !client) {
      setCatalogError("Missing Supabase configuration.");
      setCatalogLoading(false);
      return () => {
        active = false;
      };
    }

    const loadCatalog = async () => {
      try {
        const { data, error } = await client
          .from("games")
          .select(
            "id, title, players_min, players_max, popularity, tagline, cover_image"
          );

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

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      catalog,
      catalogLoading,
      catalogError
    }),
    [catalog, catalogError, catalogLoading]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return context;
};
