import type { Action, Lang } from '@/core/actions';

export interface LayerSummary {
  id: string;
  range: { min: number; max: number };
  unit: string;
  currentValue: number | null;
  first: number | string | null;
  last: number | string | null;
}

export interface AgentRequest {
  text: string;
  lang: Lang;
  state: Record<string, unknown>;
  layerSummary: LayerSummary[];
}

export interface AgentResponse {
  actions: Action[];
  say?: { en?: string; ar?: string };
  provider: string;
}

export interface LlmProvider {
  id: string;
  complete(req: AgentRequest, signal: AbortSignal): Promise<AgentResponse>;
}
