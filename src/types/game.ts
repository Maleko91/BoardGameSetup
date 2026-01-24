export type CatalogGame = {
  id: string;
  title: string;
  popularity: number;
  playersMin: number;
  playersMax: number;
  tagline?: string;
  coverAsset?: string;
  coverImage?: string;
};
