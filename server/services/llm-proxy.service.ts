/**
 * LLM Provider Proxy Service
 *
 * Unified interface for calling multiple LLM providers (OpenAI, Anthropic,
 * Google Gemini, OpenRouter, Ollama). Handles API key resolution with a
 * 3-tier priority: user key → agent system key → environment variable.
 *
 * All provider communication uses raw fetch() — no external HTTP libraries.
 */

import { storage } from "../storage";
import { decrypt } from "./encryption.service";
import type { UserLlmConfig, AgentConfig } from "@shared/schema";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type LlmProvider = "openai" | "anthropic" | "google" | "openrouter" | "ollama";

export interface LlmRequest {
  userId: number;
  agentType: string;
  sessionId: number;
  messages: Array<{ role: string; content: string }>;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
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

// ============================================================================
// ERRORS
// ============================================================================

export class LlmProxyError extends Error {
  constructor(
    message: string,
    public readonly code: LlmErrorCode,
    public readonly provider?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "LlmProxyError";
  }
}

export type LlmErrorCode =
  | "NO_API_KEY"
  | "INVALID_PROVIDER"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "AUTHENTICATION_FAILED"
  | "MODEL_NOT_FOUND"
  | "CONTEXT_LENGTH_EXCEEDED"
  | "NETWORK_ERROR"
  | "VALIDATION_FAILED";

// ============================================================================
// PROVIDER ENDPOINTS
// ============================================================================

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OLLAMA_DEFAULT_URL = "http://localhost:11434/api/chat";

const ENV_KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

// ============================================================================
// AVAILABLE MODELS
// ============================================================================

const PROVIDER_MODELS: Record<LlmProvider, string[]> = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1",
    "o1-mini",
    "o3-mini",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
  google: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  openrouter: [
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4-20250514",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mixtral-8x7b-instruct",
    "deepseek/deepseek-chat",
  ],
  ollama: [
    "llama3.1",
    "llama3",
    "mistral",
    "codellama",
    "gemma2",
    "phi3",
    "qwen2",
  ],
};

// ============================================================================
// CORE PUBLIC API
// ============================================================================

/**
 * Call an LLM provider with automatic key resolution and response normalization.
 *
 * Key resolution priority:
 *   1. User's own API key (from userLlmConfigs, decrypted at runtime)
 *   2. Agent-level system key (from agentConfigs, decrypted at runtime)
 *   3. Environment variable fallback (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 */
export async function callLlm(request: LlmRequest): Promise<LlmResponse> {
  const { userId, agentType } = request;

  // 1. Resolve provider, model, and API key
  const resolved = await resolveProviderConfig(userId, agentType);

  // 2. Merge temperature and maxTokens from agent config defaults
  const temperature = request.temperature ?? resolved.temperatureDefault;
  const maxTokens = request.maxTokens ?? resolved.maxTokensPerRequest;

  // 3. Route to correct provider adapter
  const adapter = getProviderAdapter(resolved.provider);

  const startMs = Date.now();
  try {
    const raw = await adapter({
      messages: request.messages,
      tools: request.tools,
      temperature,
      maxTokens,
      model: resolved.model,
      apiKey: resolved.apiKey,
      baseUrl: resolved.baseUrl,
    });

    return {
      ...raw,
      latencyMs: Date.now() - startMs,
      provider: resolved.provider,
      model: resolved.model,
    };
  } catch (err) {
    if (err instanceof LlmProxyError) throw err;
    throw new LlmProxyError(
      `Provider call failed: ${err instanceof Error ? err.message : String(err)}`,
      "NETWORK_ERROR",
      resolved.provider,
    );
  }
}

/**
 * Validate an API key by issuing a minimal request to the provider.
 * Returns true if the key is accepted, false otherwise.
 */
export async function validateApiKey(
  provider: string,
  model: string,
  apiKey: string,
  ollamaBaseUrl?: string,
): Promise<boolean> {
  if (!isValidProvider(provider)) {
    throw new LlmProxyError(
      `Unknown provider: ${provider}`,
      "INVALID_PROVIDER",
      provider,
    );
  }

  const adapter = getProviderAdapter(provider as LlmProvider);

  try {
    await adapter({
      messages: [{ role: "user", content: "Hi" }],
      temperature: 0,
      maxTokens: 5,
      model,
      apiKey,
      baseUrl: provider === "ollama" ? (ollamaBaseUrl ?? OLLAMA_DEFAULT_URL) : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the hardcoded list of known models for a provider.
 */
export function getAvailableModels(provider: string): string[] {
  if (!isValidProvider(provider)) return [];
  return [...PROVIDER_MODELS[provider as LlmProvider]];
}

// ============================================================================
// PROVIDER CONFIG RESOLUTION
// ============================================================================

interface ResolvedConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperatureDefault: number;
  maxTokensPerRequest: number;
}

async function resolveProviderConfig(
  userId: number,
  agentType: string,
): Promise<ResolvedConfig> {
  const [userConfig, agentConfig] = await Promise.all([
    storage.getUserLlmConfig(userId),
    storage.getAgentConfig(agentType),
  ]);

  // Determine provider and model
  const provider = resolveProvider(userConfig, agentConfig);
  const model = resolveModel(userConfig, agentConfig, provider);

  // Determine API key using 3-tier priority
  const apiKey = resolveApiKey(provider, userConfig, agentConfig);

  // Ollama does not require an API key but needs a base URL
  if (provider === "ollama" && !apiKey) {
    return {
      provider,
      model,
      apiKey: "", // Ollama runs locally, key is optional
      baseUrl: userConfig?.ollamaBaseUrl ?? OLLAMA_DEFAULT_URL,
      temperatureDefault: resolveTemperature(agentConfig),
      maxTokensPerRequest: resolveMaxTokens(agentConfig),
    };
  }

  if (!apiKey) {
    throw new LlmProxyError(
      `No API key available for provider "${provider}". Configure a key in your LLM settings, ` +
      `or ask an admin to set a system key for the "${agentType}" agent.`,
      "NO_API_KEY",
      provider,
    );
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl: provider === "ollama" ? (userConfig?.ollamaBaseUrl ?? OLLAMA_DEFAULT_URL) : undefined,
    temperatureDefault: resolveTemperature(agentConfig),
    maxTokensPerRequest: resolveMaxTokens(agentConfig),
  };
}

function resolveProvider(
  userConfig: UserLlmConfig | undefined,
  agentConfig: AgentConfig | undefined,
): LlmProvider {
  const raw = userConfig?.provider ?? agentConfig?.defaultProvider ?? "openai";
  if (!isValidProvider(raw)) {
    throw new LlmProxyError(
      `Unsupported LLM provider: ${raw}`,
      "INVALID_PROVIDER",
      raw,
    );
  }
  return raw as LlmProvider;
}

function resolveModel(
  userConfig: UserLlmConfig | undefined,
  agentConfig: AgentConfig | undefined,
  provider: LlmProvider,
): string {
  // For OpenRouter, prefer the dedicated openrouterModel field
  if (provider === "openrouter" && userConfig?.openrouterModel) {
    return userConfig.openrouterModel;
  }
  return (
    userConfig?.model ??
    agentConfig?.defaultModel ??
    getDefaultModel(provider)
  );
}

function resolveApiKey(
  provider: LlmProvider,
  userConfig: UserLlmConfig | undefined,
  agentConfig: AgentConfig | undefined,
): string {
  // Tier 1: User's own encrypted key
  const userKey = decryptUserKey(userConfig);
  if (userKey) return userKey;

  // Tier 2: Agent-level system key
  const systemKey = decryptAgentSystemKey(agentConfig);
  if (systemKey) return systemKey;

  // Tier 3: Environment variable
  const envName = ENV_KEY_MAP[provider];
  if (envName) {
    const envVal = process.env[envName];
    if (envVal) return envVal;
  }

  return "";
}

function resolveTemperature(agentConfig: AgentConfig | undefined): number {
  if (agentConfig?.temperatureDefault != null) {
    return Number(agentConfig.temperatureDefault);
  }
  return 0.7;
}

function resolveMaxTokens(agentConfig: AgentConfig | undefined): number {
  return agentConfig?.maxTokensPerRequest ?? 4096;
}

function getDefaultModel(provider: LlmProvider): string {
  const defaults: Record<LlmProvider, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-20241022",
    google: "gemini-2.0-flash",
    openrouter: "openai/gpt-4o",
    ollama: "llama3.1",
  };
  return defaults[provider];
}

// ============================================================================
// KEY DECRYPTION HELPERS
// ============================================================================

function decryptUserKey(config: UserLlmConfig | undefined): string {
  if (
    !config ||
    !config.apiKeyEncrypted ||
    !config.apiKeyIv ||
    !config.apiKeyTag
  ) {
    return "";
  }
  try {
    return decrypt({
      encrypted: config.apiKeyEncrypted,
      iv: config.apiKeyIv,
      tag: config.apiKeyTag,
    });
  } catch {
    return "";
  }
}

function decryptAgentSystemKey(config: AgentConfig | undefined): string {
  if (
    !config ||
    !config.systemApiKeyEncrypted ||
    !config.systemApiKeyIv ||
    !config.systemApiKeyTag
  ) {
    return "";
  }
  try {
    return decrypt({
      encrypted: config.systemApiKeyEncrypted,
      iv: config.systemApiKeyIv,
      tag: config.systemApiKeyTag,
    });
  } catch {
    return "";
  }
}

// ============================================================================
// PROVIDER ADAPTERS
// ============================================================================

interface AdapterInput {
  messages: Array<{ role: string; content: string }>;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

/** Partial response before latency/provider/model are stamped by callLlm. */
interface AdapterOutput {
  content: string;
  toolCalls?: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
}

type ProviderAdapter = (input: AdapterInput) => Promise<AdapterOutput>;

function getProviderAdapter(provider: LlmProvider): ProviderAdapter {
  const adapters: Record<LlmProvider, ProviderAdapter> = {
    openai: callOpenAi,
    anthropic: callAnthropic,
    google: callGemini,
    openrouter: callOpenRouter,
    ollama: callOllama,
  };
  return adapters[provider];
}

// ── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAi(input: AdapterInput): Promise<AdapterOutput> {
  const body: Record<string, any> = {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 4096,
  };

  if (input.tools?.length) {
    body.tools = input.tools.map(toOpenAiTool);
  }

  const res = await fetchWithErrorHandling(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
  }, "openai");

  const json = await res.json();
  const choice = json.choices?.[0];

  return {
    content: choice?.message?.content ?? "",
    toolCalls: parseOpenAiToolCalls(choice?.message?.tool_calls),
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}

// ── Anthropic ───────────────────────────────────────────────────────────────

async function callAnthropic(input: AdapterInput): Promise<AdapterOutput> {
  // Anthropic separates the system message from the conversation.
  const systemMessages: string[] = [];
  const conversationMessages: Array<{ role: string; content: string }> = [];

  for (const msg of input.messages) {
    if (msg.role === "system") {
      systemMessages.push(msg.content);
    } else {
      conversationMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  // Anthropic requires the first message to be from the user
  if (conversationMessages.length === 0 || conversationMessages[0].role !== "user") {
    conversationMessages.unshift({ role: "user", content: "Hello" });
  }

  const body: Record<string, any> = {
    model: input.model,
    messages: conversationMessages,
    max_tokens: input.maxTokens ?? 4096,
    temperature: input.temperature ?? 0.7,
  };

  if (systemMessages.length > 0) {
    body.system = systemMessages.join("\n\n");
  }

  if (input.tools?.length) {
    body.tools = input.tools.map(toAnthropicTool);
  }

  const res = await fetchWithErrorHandling(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  }, "anthropic");

  const json = await res.json();

  // Anthropic returns content as an array of blocks
  let textContent = "";
  const toolCalls: ToolCall[] = [];

  if (Array.isArray(json.content)) {
    for (const block of json.content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    finishReason: mapAnthropicStopReason(json.stop_reason),
  };
}

// ── Google Gemini ───────────────────────────────────────────────────────────

async function callGemini(input: AdapterInput): Promise<AdapterOutput> {
  const url = `${GEMINI_BASE_URL}/${input.model}:generateContent?key=${input.apiKey}`;

  // Convert messages to Gemini format.
  // Gemini uses "user" and "model" roles; system instructions are separate.
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of input.messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  // Gemini requires at least one user message
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      maxOutputTokens: input.maxTokens ?? 4096,
    },
  };

  if (systemParts.length > 0) {
    body.systemInstruction = {
      parts: systemParts.map((text) => ({ text })),
    };
  }

  if (input.tools?.length) {
    body.tools = [
      {
        functionDeclarations: input.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];
  }

  const res = await fetchWithErrorHandling(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, "google");

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  let textContent = "";
  const toolCalls: ToolCall[] = [];

  for (const part of parts) {
    if (part.text) {
      textContent += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({
        id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: part.functionCall.name,
        arguments: JSON.stringify(part.functionCall.args ?? {}),
      });
    }
  }

  const usage = json.usageMetadata ?? {};

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    finishReason: mapGeminiFinishReason(candidate?.finishReason),
  };
}

// ── OpenRouter ──────────────────────────────────────────────────────────────

async function callOpenRouter(input: AdapterInput): Promise<AdapterOutput> {
  // OpenRouter uses the OpenAI-compatible format
  const body: Record<string, any> = {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 4096,
  };

  if (input.tools?.length) {
    body.tools = input.tools.map(toOpenAiTool);
  }

  const res = await fetchWithErrorHandling(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
      "HTTP-Referer": "https://bandwidth.live",
      "X-Title": "BANDWIDTH Music Booking",
    },
    body: JSON.stringify(body),
  }, "openrouter");

  const json = await res.json();
  const choice = json.choices?.[0];

  return {
    content: choice?.message?.content ?? "",
    toolCalls: parseOpenAiToolCalls(choice?.message?.tool_calls),
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}

// ── Ollama ──────────────────────────────────────────────────────────────────

async function callOllama(input: AdapterInput): Promise<AdapterOutput> {
  const baseUrl = input.baseUrl ?? OLLAMA_DEFAULT_URL;

  // Ollama uses its own chat format, similar to OpenAI
  const body: Record<string, any> = {
    model: input.model,
    messages: input.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
    options: {
      temperature: input.temperature ?? 0.7,
      num_predict: input.maxTokens ?? 4096,
    },
  };

  if (input.tools?.length) {
    body.tools = input.tools.map(toOpenAiTool);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Ollama may optionally accept an API key if configured behind a proxy
  if (input.apiKey) {
    headers.Authorization = `Bearer ${input.apiKey}`;
  }

  const res = await fetchWithErrorHandling(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, "ollama");

  const json = await res.json();

  const toolCalls: ToolCall[] = [];
  if (Array.isArray(json.message?.tool_calls)) {
    for (const tc of json.message.tool_calls) {
      toolCalls.push({
        id: `ollama_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: tc.function?.name ?? "",
        arguments: JSON.stringify(tc.function?.arguments ?? {}),
      });
    }
  }

  return {
    content: json.message?.content ?? "",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    inputTokens: json.prompt_eval_count ?? 0,
    outputTokens: json.eval_count ?? 0,
    finishReason: json.done ? "stop" : "unknown",
  };
}

// ============================================================================
// TOOL FORMAT CONVERTERS
// ============================================================================

function toOpenAiTool(tool: ToolDefinition): Record<string, any> {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function toAnthropicTool(tool: ToolDefinition): Record<string, any> {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

function parseOpenAiToolCalls(
  raw: Array<{ id: string; function: { name: string; arguments: string } }> | undefined,
): ToolCall[] | undefined {
  if (!raw || raw.length === 0) return undefined;
  return raw.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
}

// ============================================================================
// FINISH REASON MAPPERS
// ============================================================================

function mapAnthropicStopReason(reason: string | undefined): string {
  const map: Record<string, string> = {
    end_turn: "stop",
    max_tokens: "length",
    stop_sequence: "stop",
    tool_use: "tool_calls",
  };
  return reason ? (map[reason] ?? reason) : "unknown";
}

function mapGeminiFinishReason(reason: string | undefined): string {
  const map: Record<string, string> = {
    STOP: "stop",
    MAX_TOKENS: "length",
    SAFETY: "content_filter",
    RECITATION: "content_filter",
    OTHER: "unknown",
  };
  return reason ? (map[reason] ?? reason) : "unknown";
}

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function fetchWithErrorHandling(
  url: string,
  init: RequestInit,
  provider: string,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new LlmProxyError(
      `Network error calling ${provider}: ${err instanceof Error ? err.message : String(err)}`,
      "NETWORK_ERROR",
      provider,
    );
  }

  if (res.ok) return res;

  // Attempt to extract error details from the response body
  let errorBody: string;
  try {
    const json = await res.json();
    errorBody = json.error?.message ?? json.message ?? JSON.stringify(json);
  } catch {
    try {
      errorBody = await res.text();
    } catch {
      errorBody = `HTTP ${res.status}`;
    }
  }

  const code = mapHttpStatusToErrorCode(res.status);

  throw new LlmProxyError(
    `${provider} API error (${res.status}): ${errorBody}`,
    code,
    provider,
    res.status,
  );
}

function mapHttpStatusToErrorCode(status: number): LlmErrorCode {
  if (status === 401 || status === 403) return "AUTHENTICATION_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 404) return "MODEL_NOT_FOUND";
  if (status === 400) return "VALIDATION_FAILED";
  return "PROVIDER_ERROR";
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function isValidProvider(provider: string): boolean {
  return provider in PROVIDER_MODELS;
}
