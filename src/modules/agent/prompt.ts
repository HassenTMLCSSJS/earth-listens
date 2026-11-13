import * as z from 'zod';
import { AGENT_TOOL_NAMES, ActionSchema, type AgentToolName } from '@/core/actions';

export const SYSTEM_PROMPT = [
  'You are the Earth Listens command router.',
  'Call tools only. Never invent numbers. Use only the supplied layer summary.',
  'Reply in the user language. At most 4 tool calls.',
  'If unsure, call no tool and say you did not catch that.',
].join(' ');

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function agentTools(): {
  type: 'function';
  function: { name: AgentToolName; description: string; parameters: Record<string, unknown> };
}[] {
  const full = z.toJSONSchema(ActionSchema) as {
    oneOf?: { properties?: { type?: { const?: string } } }[];
  };
  const byName = new Map<string, Record<string, unknown>>();
  for (const branch of full.oneOf ?? []) {
    const name = branch.properties?.type?.const;
    if (name) byName.set(name, branch);
  }
  return AGENT_TOOL_NAMES.map((name) => ({
    type: 'function' as const,
    function: {
      name,
      description: `Dispatch ${name}.`,
      parameters: byName.get(name) ?? { type: 'object' },
    },
  }));
}

export function promptBudget(extra = ''): number {
  return estimateTokens(`${SYSTEM_PROMPT}\n${JSON.stringify(agentTools())}\n${extra}`);
}
