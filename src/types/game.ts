export type CatalogGame = {
  id: string;
  title: string;
  popularity: number;
  playersMin: number;
  playersMax: number;
  tagline?: string;
  coverImage?: string;
};

export type Visual = {
  asset: string;
  animation: string;
};

export type Step = {
  order: number;
  text: string;
  visual: Visual;
};

export type StepCondition = {
  playerCounts?: number[];
  includeExpansions?: string[];
  excludeExpansions?: string[];
  includeModules?: string[];
  excludeModules?: string[];
  requireNoExpansions?: boolean;
};

export type ConditionalStep = Step & {
  when?: StepCondition;
};

export type Expansion = {
  id: string;
  name: string;
};

export type ExpansionModule = {
  id: string;
  name: string;
  description?: string;
};

export type ModuleRow = {
  id: string;
  expansion_id: string | null;
  name: string;
  description: string | null;
};

export type GameData = {
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

export type GameSetupStepRow = {
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
