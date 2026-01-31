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
  // Existing (migrated from flat columns into JSONB in Phase 3)
  playerCounts?: number[];
  includeExpansions?: string[];
  excludeExpansions?: string[];
  includeModules?: string[];
  excludeModules?: string[];
  requireNoExpansions?: boolean;
  // Phase 4: Modes
  includeModes?: string[];
  excludeModes?: string[];
  // Phase 6: Roles
  includeRoles?: string[];
  excludeRoles?: string[];
  // Phase 10: Scenarios
  includeScenarios?: string[];
  excludeScenarios?: string[];
  // Phase 12: Maps
  includeMaps?: string[];
  excludeMaps?: string[];
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
  conditions: StepCondition | null;
  step_type: string;
  parent_step_id: string | null;
  phase: string;
  parallel_group: string | null;
};
