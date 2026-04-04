/**
 * Agent Routes — user-facing endpoints for the AI agent system.
 *
 * Mounted at /api/agents in server/routes.ts.
 */

import { Router } from "express";
import { storage } from "../storage";
import { orchestrator } from "../services/agent-orchestrator";
import { AgentError } from "../services/agent-base";
import { encrypt, isEncryptionConfigured } from "../services/encryption.service";
import { validateApiKey, getAvailableModels } from "../services/llm-proxy.service";
import { api } from "@shared/routes";
import { db } from "../db";
import { artists, events, promoters } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

/** Check if a user is a participant in a booking. */
async function isBookingParticipant(booking: any, userId: number, userRole: string): Promise<boolean> {
  if (userRole === "admin" || userRole === "platform_admin") return true;

  // Check artist side
  if (booking.artistId) {
    const [artist] = await db.select().from(artists).where(eq(artists.id, booking.artistId));
    if (artist?.userId === userId) return true;
  }

  // Check organizer side via event → promoter
  if (booking.eventId) {
    const [event] = await db.select().from(events).where(eq(events.id, booking.eventId));
    if (event?.organizerId) {
      const [promoter] = await db.select().from(promoters).where(eq(promoters.id, event.organizerId));
      if (promoter?.userId === userId) return true;
    }
  }

  return false;
}

// All agent routes require authentication
router.use((req, res, next) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
});

// ============================================================================
// OPENROUTER MODELS (proxy to avoid CORS)
// ============================================================================

let openRouterModelsCache: { data: any[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.get("/openrouter-models", async (_req, res) => {
  try {
    // Serve from cache if fresh
    if (openRouterModelsCache && Date.now() - openRouterModelsCache.fetchedAt < CACHE_TTL_MS) {
      return res.json(openRouterModelsCache.data);
    }

    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
    const json = await response.json();
    const models = (json.data ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      promptPrice: m.pricing?.prompt ?? "0",
      completionPrice: m.pricing?.completion ?? "0",
      isFree: m.pricing?.prompt === "0" && m.pricing?.completion === "0",
    }));

    openRouterModelsCache = { data: models, fetchedAt: Date.now() };
    res.json(models);
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    // Return hardcoded fallback if API fails
    res.json([
      { id: "openai/gpt-4o", name: "OpenAI GPT-4o", isFree: false },
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", isFree: false },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", isFree: false },
      { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", isFree: false },
    ]);
  }
});

// ============================================================================
// LLM CONFIG
// ============================================================================

// GET /config — available agents + all provider configs for the user
router.get("/config", async (req, res) => {
  try {
    const user = req.user as any;
    const [configs, userConfigs] = await Promise.all([
      storage.listAgentConfigs(),
      storage.getUserLlmConfigs(user.id),
    ]);

    const agents = configs.map((c) => ({
      agentType: c.agentType,
      displayName: c.displayName ?? c.agentType,
      description: c.description ?? null,
      enabled: c.enabled ?? false,
      allowedRoles: (c.allowedRoles as string[]) ?? [],
    }));

    const providerConfigs = userConfigs.map((c) => ({
      provider: c.provider,
      model: c.model,
      hasKey: !!(c.apiKeyEncrypted),
      isActive: c.isActive ?? false,
      ollamaBaseUrl: c.ollamaBaseUrl ?? null,
      isValid: c.isValid ?? null,
    }));

    const activeConfig = userConfigs.find((c) => c.isActive) ?? userConfigs[0] ?? null;
    const activeProvider = activeConfig?.provider ?? null;

    res.json({ agents, providerConfigs, activeProvider });
  } catch (error) {
    console.error("Error fetching agent config:", error);
    res.status(500).json({ message: "Failed to fetch agent config" });
  }
});

// PUT /llm-config — save/update user's LLM provider + encrypted API key
router.put("/llm-config", async (req, res) => {
  try {
    const user = req.user as any;
    const parsed = api.agents.llmConfig.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const { provider, model, apiKey, ollamaBaseUrl, openrouterModel, setActive } = parsed.data;

    const data: any = {
      userId: user.id,
      provider,
      model,
      ollamaBaseUrl: ollamaBaseUrl ?? null,
      openrouterModel: openrouterModel ?? null,
    };

    // Encrypt API key if provided
    if (apiKey) {
      if (!isEncryptionConfigured()) {
        return res.status(500).json({ message: "Encryption is not configured. Contact the administrator." });
      }
      const encrypted = encrypt(apiKey);
      data.apiKeyEncrypted = encrypted.encrypted;
      data.apiKeyIv = encrypted.iv;
      data.apiKeyTag = encrypted.tag;
    }

    await storage.upsertUserLlmConfig(data);

    // If this is the first provider saved, or caller requested it, set as active
    if (setActive) {
      await storage.setActiveLlmConfig(user.id, provider);
    } else {
      // Auto-set active if user has no active config yet
      const allConfigs = await storage.getUserLlmConfigs(user.id);
      const hasActive = allConfigs.some((c) => c.isActive);
      if (!hasActive) {
        await storage.setActiveLlmConfig(user.id, provider);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving LLM config:", error);
    res.status(500).json({ message: "Failed to save LLM config" });
  }
});

// DELETE /llm-config — remove a specific provider's config
router.delete("/llm-config", async (req, res) => {
  try {
    const user = req.user as any;
    const parsed = api.agents.llmConfig.delete.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const { provider } = parsed.data;
    await storage.deleteUserLlmConfig(user.id, provider);

    // If the deleted provider was active, auto-promote another
    const remaining = await storage.getUserLlmConfigs(user.id);
    const stillHasActive = remaining.some((c) => c.isActive);
    if (!stillHasActive && remaining.length > 0) {
      await storage.setActiveLlmConfig(user.id, remaining[0].provider);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting LLM config:", error);
    res.status(500).json({ message: "Failed to delete LLM config" });
  }
});

// POST /llm-config/set-active — switch the active provider
router.post("/llm-config/set-active", async (req, res) => {
  try {
    const user = req.user as any;
    const parsed = api.agents.llmConfig.setActive.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const { provider } = parsed.data;
    // Verify this provider is configured for the user
    const allConfigs = await storage.getUserLlmConfigs(user.id);
    const exists = allConfigs.find((c) => c.provider === provider);
    if (!exists) {
      return res.status(404).json({ message: "Provider not configured. Save an API key first." });
    }
    await storage.setActiveLlmConfig(user.id, provider);
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting active provider:", error);
    res.status(500).json({ message: "Failed to set active provider" });
  }
});

// POST /llm-config/validate — test API key connectivity for a specific provider
router.post("/llm-config/validate", async (req, res) => {
  try {
    const user = req.user as any;
    const requestedProvider = req.body?.provider as string | undefined;

    let config;
    if (requestedProvider) {
      const allConfigs = await storage.getUserLlmConfigs(user.id);
      config = allConfigs.find((c) => c.provider === requestedProvider);
    } else {
      config = await storage.getUserLlmConfig(user.id);
    }

    if (!config || !config.apiKeyEncrypted) {
      return res.json({ valid: false, error: "No API key configured" });
    }

    const { decrypt } = await import("../services/encryption.service");
    const apiKey = decrypt({
      encrypted: config.apiKeyEncrypted,
      iv: config.apiKeyIv!,
      tag: config.apiKeyTag!,
    });

    const valid = await validateApiKey(
      config.provider,
      config.model,
      apiKey,
      config.ollamaBaseUrl ?? undefined,
    );

    // Update validation status
    await storage.upsertUserLlmConfig({
      userId: user.id,
      provider: config.provider,
      model: config.model,
      isValid: valid,
      lastValidatedAt: new Date(),
    });

    res.json({ valid, error: valid ? undefined : "API key validation failed" });
  } catch (error) {
    console.error("Error validating LLM config:", error);
    res.json({ valid: false, error: "Validation error" });
  }
});

// ============================================================================
// EVENT WIZARD
// ============================================================================

// POST /event-wizard/run — start event wizard session
router.post("/event-wizard/run", async (req, res) => {
  try {
    const user = req.user as any;
    const result = await orchestrator.startSession({
      agentType: "event_wizard",
      userId: user.id,
      userRole: user.role,
      input: req.body ?? {},
    });
    res.json(result);
  } catch (error) {
    if (error instanceof AgentError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error running event wizard:", error);
    res.status(500).json({ message: "Event wizard failed" });
  }
});

// POST /event-wizard/:sessionId/refine — refine an existing wizard result
router.post("/event-wizard/:sessionId/refine", async (req, res) => {
  try {
    const user = req.user as any;
    const sessionId = Number(req.params.sessionId);
    const parsed = api.agents.eventWizard.refine.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const session = await storage.getAgentSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== user.id) return res.status(403).json({ message: "Not your session" });

    // Load previous messages and append refinement
    const messages = await storage.getAgentMessages(sessionId);
    const agent = orchestrator.getAgent("event_wizard");

    // Build conversation history from stored messages
    const llmMessages = messages.map((m) => ({
      role: m.role,
      content: m.content ?? "",
    }));

    // Add the refinement instruction
    llmMessages.push({ role: "user", content: parsed.data.instruction });

    // Save user message
    await storage.createAgentMessage({
      sessionId,
      role: "user",
      content: parsed.data.instruction,
    });

    // Call LLM with full conversation
    const { callLlm } = await import("../services/llm-proxy.service");
    const config = await storage.getAgentConfig("event_wizard");
    const response = await callLlm({
      userId: user.id,
      agentType: "event_wizard",
      sessionId,
      messages: llmMessages,
      temperature: config?.temperatureDefault ? Number(config.temperatureDefault) : undefined,
      maxTokens: config?.maxTokensPerRequest ?? 4096,
    });

    // Save assistant response
    await storage.createAgentMessage({
      sessionId,
      role: "assistant",
      content: response.content,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: response.latencyMs,
      provider: response.provider as any,
      model: response.model,
    });

    // Parse the response as event data
    let result: any;
    try {
      let cleaned = response.content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      result = JSON.parse(cleaned);
    } catch {
      result = { description: response.content, confidence: 0, suggestions: ["Could not parse response"] };
    }

    // Update session result
    await storage.updateAgentSession(sessionId, { result });

    res.json({ sessionId, result });
  } catch (error) {
    if (error instanceof AgentError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error refining event wizard:", error);
    res.status(500).json({ message: "Refinement failed" });
  }
});

// ============================================================================
// NEGOTIATION AGENT
// ============================================================================

// POST /negotiation/:bookingId/start — activate negotiation agent
router.post("/negotiation/:bookingId/start", async (req, res) => {
  try {
    const user = req.user as any;
    const bookingId = Number(req.params.bookingId);
    const parsed = api.agents.negotiation.start.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    // Verify booking exists and user is a participant
    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!(await isBookingParticipant(booking, user.id, user.role))) {
      return res.status(403).json({ message: "You are not a participant in this booking" });
    }

    // Check no active session exists
    const existing = await orchestrator.getActiveSession(user.id, "negotiation", bookingId);
    if (existing) {
      return res.status(409).json({ message: "An active negotiation agent session already exists for this booking" });
    }

    const result = await orchestrator.startSession({
      agentType: "negotiation",
      userId: user.id,
      userRole: user.role,
      input: { bookingId, targets: parsed.data },
      contextEntityType: "booking",
      contextEntityId: bookingId,
    });

    res.json({ sessionId: result.sessionId, status: "active" });
  } catch (error) {
    if (error instanceof AgentError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error starting negotiation agent:", error);
    res.status(500).json({ message: "Failed to start negotiation agent" });
  }
});

// POST /negotiation/:bookingId/set-targets — update negotiation targets
router.post("/negotiation/:bookingId/set-targets", async (req, res) => {
  try {
    const user = req.user as any;
    const bookingId = Number(req.params.bookingId);
    const parsed = api.agents.negotiation.setTargets.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const session = await orchestrator.getActiveSession(user.id, "negotiation", bookingId);
    if (!session) return res.status(404).json({ message: "No active negotiation session found" });

    // Update memory with new targets
    const currentMemory = (session.memory as any) ?? {};
    await storage.updateAgentSession(session.id, {
      memory: { ...currentMemory, targets: parsed.data },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error setting targets:", error);
    res.status(500).json({ message: "Failed to update targets" });
  }
});

// POST /negotiation/:bookingId/approve — approve a draft proposal
router.post("/negotiation/:bookingId/approve", async (req, res) => {
  try {
    const user = req.user as any;
    const bookingId = Number(req.params.bookingId);
    const parsed = api.agents.negotiation.approve.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const session = await orchestrator.getActiveSession(user.id, "negotiation", bookingId);
    if (!session) return res.status(404).json({ message: "No active negotiation session found" });

    // Find the draft in session memory
    const memory = (session.memory as any) ?? {};
    const drafts: any[] = memory.pendingDrafts ?? [];
    const draftIndex = drafts.findIndex((d: any) => d.id === parsed.data.draftId);
    if (draftIndex === -1) return res.status(404).json({ message: "Draft not found" });

    const draft = drafts[draftIndex];

    // Remove draft from pending
    drafts.splice(draftIndex, 1);
    await storage.updateAgentSession(session.id, {
      memory: { ...memory, pendingDrafts: drafts, lastApprovedDraft: draft },
    });

    // TODO: Submit proposal via negotiationService when negotiation agent is fully wired
    res.json({ success: true, proposalRound: draft.proposalRound ?? 1 });
  } catch (error) {
    console.error("Error approving draft:", error);
    res.status(500).json({ message: "Failed to approve draft" });
  }
});

// POST /negotiation/:bookingId/stop — deactivate negotiation agent
router.post("/negotiation/:bookingId/stop", async (req, res) => {
  try {
    const user = req.user as any;
    const bookingId = Number(req.params.bookingId);

    const session = await orchestrator.getActiveSession(user.id, "negotiation", bookingId);
    if (!session) return res.status(404).json({ message: "No active negotiation session found" });

    await orchestrator.cancelSession(session.id, user.id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AgentError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error stopping negotiation agent:", error);
    res.status(500).json({ message: "Failed to stop negotiation agent" });
  }
});

// GET /negotiation/:bookingId/status — agent status + pending drafts
router.get("/negotiation/:bookingId/status", async (req, res) => {
  try {
    const user = req.user as any;
    const bookingId = Number(req.params.bookingId);

    // Check user is a booking participant
    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!(await isBookingParticipant(booking, user.id, user.role))) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const session = await orchestrator.getActiveSession(user.id, "negotiation", bookingId);
    if (!session) {
      return res.json({
        active: false,
        sessionId: null,
        status: "inactive",
        pendingDrafts: [],
        lastActivityAt: null,
      });
    }

    const memory = (session.memory as any) ?? {};
    const pendingDrafts = (memory.pendingDrafts ?? []).map((d: any) => ({
      id: d.id,
      proposal: d.proposal,
      reasoning: d.reasoning,
      createdAt: d.createdAt ?? new Date().toISOString(),
    }));

    res.json({
      active: session.status === "active" || session.status === "paused",
      sessionId: session.id,
      status: session.status,
      pendingDrafts,
      lastActivityAt: session.lastActivityAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error fetching negotiation status:", error);
    res.status(500).json({ message: "Failed to fetch status" });
  }
});

// ============================================================================
// SESSIONS
// ============================================================================

// GET /sessions — user's agent sessions
router.get("/sessions", async (req, res) => {
  try {
    const user = req.user as any;
    const sessions = await storage.listAgentSessions({ userId: user.id });
    res.json(
      sessions.map((s) => ({
        id: s.id,
        agentType: s.agentType,
        status: s.status,
        contextEntityType: s.contextEntityType ?? null,
        contextEntityId: s.contextEntityId ?? null,
        requestCount: s.requestCount ?? null,
        startedAt: s.startedAt?.toISOString() ?? null,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
    );
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ message: "Failed to list sessions" });
  }
});

// GET /sessions/:id — session detail with messages
router.get("/sessions/:id", async (req, res) => {
  try {
    const user = req.user as any;
    const sessionId = Number(req.params.id);

    const session = await storage.getAgentSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== user.id && user.role !== "admin" && user.role !== "platform_admin") {
      return res.status(403).json({ message: "Not your session" });
    }

    const [messages, feedback] = await Promise.all([
      storage.getAgentMessages(sessionId),
      storage.getAgentFeedback(sessionId),
    ]);

    res.json({ session, messages, feedback: feedback ?? null });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ message: "Failed to fetch session" });
  }
});

// POST /sessions/:id/feedback — thumbs up/down
router.post("/sessions/:id/feedback", async (req, res) => {
  try {
    const user = req.user as any;
    const sessionId = Number(req.params.id);
    const parsed = api.agents.sessions.feedback.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const session = await storage.getAgentSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== user.id) return res.status(403).json({ message: "Not your session" });

    // Check for duplicate feedback
    const existing = await storage.getAgentFeedback(sessionId);
    if (existing) return res.status(409).json({ message: "Feedback already submitted" });

    await storage.createAgentFeedback({
      sessionId,
      userId: user.id,
      rating: parsed.data.rating as any,
      comment: parsed.data.comment ?? null,
      agentType: session.agentType,
      promptVersion: session.promptVersion ?? null,
    });

    // Update prompt version stats if applicable
    if (session.promptVersion) {
      const promptVersion = await storage.getActivePromptVersion(session.agentType);
      if (promptVersion && promptVersion.version === session.promptVersion) {
        const delta =
          parsed.data.rating === "positive"
            ? { positive: 1 }
            : { negative: 1 };
        await storage.updatePromptVersionStats(promptVersion.id, delta);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

export default router;
