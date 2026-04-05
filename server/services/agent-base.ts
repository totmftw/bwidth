/**
 * Base Agent — abstract class implementing the template method pattern.
 *
 * All AI agents extend this class.  The `run()` method orchestrates:
 *   1. Role / enable / rate-limit checks
 *   2. Session creation
 *   3. Prompt version loading
 *   4. Delegation to `execute()` (implemented by each agent)
 *   5. Session finalisation + usage tracking
 */

import { storage } from "../storage";
import type { AgentSession, AgentConfig, PromptVersion } from "@shared/schema";

// Re-export types the proxy service defines (imported lazily to avoid circular)
export interface LlmMessage {
  role: string;
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmResponse {
  content: string;
  toolCalls?: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  provider: string;
  model: string;
  finishReason: string;
}

export interface AgentRunParams {
  userId: number;
  userRole: string;
  input: any;
  contextEntityType?: string;
  contextEntityId?: number;
}

export interface AgentRunResult {
  sessionId: number;
  result: any;
  error?: string;
}

export interface AgentContext {
  session: AgentSession;
  config: AgentConfig;
  promptVersion: PromptVersion | undefined;
  params: AgentRunParams;
}

export abstract class BaseAgent {
  abstract readonly agentType: string;
  abstract readonly allowedRoles: string[];

  // ── Public entry point ──────────────────────────────────────────────────

  async run(params: AgentRunParams): Promise<AgentRunResult> {
    // 1. Load config — fall back to defaults if no DB row exists yet
    const dbConfig = await storage.getAgentConfig(this.agentType);
    const config = dbConfig ?? {
      enabled: true,
      allowedRoles: this.allowedRoles,
      maxRequestsPerHour: null,
      maxRequestsPerDay: null,
      maxTokensPerRequest: null,
      defaultProvider: null,
      defaultModel: null,
    } as any;

    if (!config.enabled) {
      throw new AgentError("This agent is currently disabled", 403);
    }

    // 2. Check user role
    const allowedRoles = (config.allowedRoles as string[]) ?? this.allowedRoles;
    if (!allowedRoles.includes(params.userRole) && params.userRole !== "admin" && params.userRole !== "platform_admin") {
      throw new AgentError("You do not have access to this agent", 403);
    }

    // 3. Check rate limits
    await this.checkRateLimits(params.userId, config);

    // 4. Resolve provider + model
    const { provider, model } = await this.resolveProviderModel(params.userId, config);

    // 5. Load active prompt version
    const promptVersion = await storage.getActivePromptVersion(this.agentType);

    // 6. Create session
    const session = await storage.createAgentSession({
      userId: params.userId,
      agentType: this.agentType as any,
      status: "active",
      contextEntityType: params.contextEntityType,
      contextEntityId: params.contextEntityId,
      provider: provider as any,
      model,
      promptVersion: promptVersion?.version,
    });

    const context: AgentContext = { session, config, promptVersion, params };

    try {
      // 7. Execute agent logic (subclass)
      const result = await this.execute(context);

      // 8. Mark session completed
      await storage.updateAgentSession(session.id, {
        status: "completed",
        result,
        completedAt: new Date(),
      });

      // 9. Update usage stats
      const today = new Date().toISOString().slice(0, 10);
      await storage.upsertAgentUsageStats(params.userId, this.agentType, today, {
        sessions: 1,
        requests: session.requestCount ?? 0,
        inputTokens: session.inputTokensUsed ?? 0,
        outputTokens: session.outputTokensUsed ?? 0,
      });

      // 10. Update prompt version run count
      if (promptVersion) {
        await storage.updatePromptVersionStats(promptVersion.id, { runs: 1 });
      }

      return { sessionId: session.id, result };
    } catch (err: any) {
      // Mark session as failed
      await storage.updateAgentSession(session.id, {
        status: "failed",
        error: err.message ?? "Unknown error",
        completedAt: new Date(),
      });
      throw err;
    }
  }

  // ── Abstract methods for subclasses ─────────────────────────────────────

  protected abstract execute(context: AgentContext): Promise<any>;
  protected abstract buildSystemPrompt(context: AgentContext): string;
  protected abstract getTools(): ToolDefinition[];

  // ── Shared utilities ────────────────────────────────────────────────────

  protected async callLlm(
    context: AgentContext,
    messages: LlmMessage[],
    tools?: ToolDefinition[],
  ): Promise<LlmResponse> {
    // Lazy import to avoid circular deps
    const { callLlm } = await import("./llm-proxy.service");

    const response = await callLlm({
      userId: context.params.userId,
      agentType: this.agentType,
      sessionId: context.session.id,
      messages,
      tools,
      temperature: context.config.temperatureDefault ? Number(context.config.temperatureDefault) : undefined,
      maxTokens: context.config.maxTokensPerRequest ?? 4096,
    });

    // Log the message exchange
    await storage.createAgentMessage({
      sessionId: context.session.id,
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls ?? null,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: response.latencyMs,
      provider: response.provider as any,
      model: response.model,
      promptVersion: context.promptVersion?.version,
    });

    // Update session token counts
    await storage.updateAgentSession(context.session.id, {
      inputTokensUsed: (context.session.inputTokensUsed ?? 0) + response.inputTokens,
      outputTokensUsed: (context.session.outputTokensUsed ?? 0) + response.outputTokens,
      requestCount: (context.session.requestCount ?? 0) + 1,
    });

    // Refresh session object in context
    context.session = (await storage.getAgentSession(context.session.id))!;

    return response;
  }

  protected async handleToolCalls(
    context: AgentContext,
    toolCalls: ToolCall[],
    toolHandlers: Record<string, (args: any) => Promise<string>>,
  ): Promise<LlmMessage[]> {
    const toolMessages: LlmMessage[] = [];
    for (const tc of toolCalls) {
      const handler = toolHandlers[tc.name];
      if (!handler) {
        toolMessages.push({ role: "tool", content: JSON.stringify({ error: `Unknown tool: ${tc.name}` }) });
        continue;
      }
      try {
        const args = JSON.parse(tc.arguments);
        const result = await handler(args);
        toolMessages.push({ role: "tool", content: result });
      } catch (err: any) {
        toolMessages.push({ role: "tool", content: JSON.stringify({ error: err.message }) });
      }
    }
    return toolMessages;
  }

  protected async saveUserMessage(context: AgentContext, content: string): Promise<void> {
    await storage.createAgentMessage({
      sessionId: context.session.id,
      role: "user",
      content,
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async checkRateLimits(userId: number, config: AgentConfig): Promise<void> {
    const rateLimit = await storage.getAgentRateLimit(userId, this.agentType);
    const maxPerDay = rateLimit?.maxRequestsPerDay ?? 100;
    const maxPerHour = rateLimit?.maxRequestsPerHour ?? 20;

    const today = new Date().toISOString().slice(0, 10);
    const stats = await storage.getAgentUsageStats({
      userId,
      agentType: this.agentType,
      startDate: today,
      endDate: today,
    });
    const todayStats = stats[0];

    if (todayStats && (todayStats.requestCount ?? 0) >= maxPerDay) {
      throw new AgentError("Daily rate limit exceeded. Try again tomorrow.", 429);
    }

    // Hourly check — approximate using daily sessions / 24 (simple heuristic)
    if (todayStats && (todayStats.sessionCount ?? 0) >= maxPerHour) {
      throw new AgentError("Hourly rate limit exceeded. Try again later.", 429);
    }
  }

  private async resolveProviderModel(
    userId: number,
    config: AgentConfig,
  ): Promise<{ provider: string; model: string }> {
    // 1. User's own config
    const userConfig = await storage.getUserLlmConfig(userId);
    if (userConfig?.provider && userConfig?.model) {
      return { provider: userConfig.provider, model: userConfig.model };
    }

    // 2. Agent's default
    if (config.defaultProvider && config.defaultModel) {
      return { provider: config.defaultProvider, model: config.defaultModel };
    }

    // 3. Env var fallback
    if (process.env.OPENAI_API_KEY) return { provider: "openai", model: "gpt-4o" };
    if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
    if (process.env.GOOGLE_AI_API_KEY) return { provider: "google", model: "gemini-2.0-flash" };

    throw new AgentError("No LLM provider configured. Please set up your AI settings.", 400);
  }
}

// ── Agent Error ────────────────────────────────────────────────────────────

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AgentError";
  }
}
