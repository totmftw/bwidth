/**
 * Event Wizard Agent — extracts structured event data from free text or
 * document content.  Organizers paste or upload a description and the LLM
 * returns a JSON payload that pre-fills the CreateEvent form.
 *
 * No tool-calling loop — a single LLM call with a JSON-output instruction.
 */

import {
  BaseAgent,
  AgentContext,
  ToolDefinition,
  type LlmMessage,
} from "../agent-base";
import { storage } from "../../storage";

// ── Genres available on the platform ────────────────────────────────────────

const PLATFORM_GENRES = [
  "Bollywood",
  "Classical",
  "Indie",
  "Electronic",
  "Rock",
  "Jazz",
  "Hip-Hop",
  "Folk",
  "Fusion",
  "Metal",
  "Pop",
  "R&B",
  "Techno",
  "House",
  "Drum & Bass",
] as const;

// ── Expected output shape ───────────────────────────────────────────────────

interface EventWizardOutput {
  title: string;
  description: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  capacity: number | null;
  visibility: "public" | "private";
  stages: { name: string; startTime: string; endTime: string }[];
  confidence: number; // 0-1
  suggestions: string[];
}

// ── Agent ───────────────────────────────────────────────────────────────────

export class EventWizardAgent extends BaseAgent {
  readonly agentType = "event_wizard";
  readonly allowedRoles = [
    "organizer",
    "promoter",
    "artist",
    "venue_manager",
    "admin",
    "platform_admin",
  ];

  // ── Main execution ──────────────────────────────────────────────────────



  // ── System prompt ───────────────────────────────────────────────────────

  protected buildSystemPrompt(context: AgentContext): string {
    const { venueNames, genres } = this.getDbContextSync(context);

    // If a managed prompt version exists, prefer it.
    if (context.promptVersion?.systemPrompt) {
      let prompt = context.promptVersion.systemPrompt;
      const tpl = context.promptVersion.contextTemplate as string | null;
      if (tpl) {
        prompt +=
          "\n\n" +
          tpl
            .replace("{{venues}}", venueNames.join(", ") || "none loaded")
            .replace("{{genres}}", genres.join(", "));
      }
      return prompt;
    }

    return [
      "You are an event creation assistant for BANDWIDTH, a music booking platform in India.",
      "Extract event details from the user's text and return ONLY valid JSON — no markdown fencing, no commentary.",
      "",
      "Output schema (every field required):",
      JSON.stringify(
        {
          title: "string",
          description: "string — engaging, professional tone for a music event listing",
          date: "YYYY-MM-DD",
          startTime: "HH:MM (24h)",
          endTime: "HH:MM (24h)",
          capacity: "number | null",
          visibility: "\"public\" | \"private\"",
          stages: "[{ name, startTime (HH:MM), endTime (HH:MM) }]",
          confidence: "number 0-1 — how complete the input is",
          suggestions: "string[] — things the organizer should still specify",
        },
        null,
        2,
      ),
      "",
      "Platform context:",
      `Known venues: ${venueNames.length > 0 ? venueNames.join(", ") : "none loaded yet"}`,
      `Available genres: ${genres.join(", ")}`,
      "",
      "Rules:",
      "- If information is missing, make reasonable suggestions and lower the confidence score.",
      "- Always write the description in an engaging, professional tone suitable for a music event listing.",
      "- Default visibility to \"public\" unless the text implies otherwise.",
      "- If no stages are mentioned, return an empty stages array.",
      "- Dates in Indian formats (DD/MM/YYYY) should be converted to YYYY-MM-DD.",
      "- Times should be 24-hour format.",
    ].join("\n");
  }

  // ── Tools (none for this agent) ─────────────────────────────────────────

  protected getTools(): ToolDefinition[] {
    return [];
  }

  // ── DB context ──────────────────────────────────────────────────────────
  //
  // We need venue names and genres.  Because `buildSystemPrompt` is
  // synchronous in the base class signature, we pre-fetch in `execute` and
  // stash the values on the context.  A private cache keeps things tidy.

  private dbContextCache: { venueNames: string[]; genres: string[] } | null = null;

  /** Call from `execute` before `buildSystemPrompt`. */
  private async fetchDbContext(): Promise<void> {
    try {
      const allVenues = await storage.getVenues();
      const venueNames = allVenues
        .slice(0, 50)
        .map((v) => v.name)
        .filter(Boolean);
      this.dbContextCache = { venueNames, genres: [...PLATFORM_GENRES] };
    } catch {
      this.dbContextCache = { venueNames: [], genres: [...PLATFORM_GENRES] };
    }
  }

  private getDbContextSync(_context: AgentContext): {
    venueNames: string[];
    genres: string[];
  } {
    return this.dbContextCache ?? { venueNames: [], genres: [...PLATFORM_GENRES] };
  }

  /** Override execute to pre-fetch DB context before the sync prompt builder runs. */
  protected override async execute(context: AgentContext): Promise<EventWizardOutput> {
    await this.fetchDbContext();

    const input: string =
      context.params.input?.documentText ?? context.params.input?.text ?? "";

    if (!input.trim()) {
      throw new Error("No input text provided for the event wizard.");
    }

    await this.saveUserMessage(context, input);

    const systemPrompt = this.buildSystemPrompt(context);
    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input },
    ];

    const response = await this.callLlm(context, messages);
    return this.parseResponse(response.content);
  }

  // ── Response parsing ────────────────────────────────────────────────────

  private parseResponse(raw: string): EventWizardOutput {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);

      return {
        title: String(parsed.title ?? "Untitled Event"),
        description: String(parsed.description ?? ""),
        date: String(parsed.date ?? ""),
        startTime: String(parsed.startTime ?? ""),
        endTime: String(parsed.endTime ?? ""),
        capacity: parsed.capacity != null ? Number(parsed.capacity) : null,
        visibility: parsed.visibility === "private" ? "private" : "public",
        stages: Array.isArray(parsed.stages)
          ? parsed.stages.map((s: any) => ({
              name: String(s.name ?? "Main Stage"),
              startTime: String(s.startTime ?? ""),
              endTime: String(s.endTime ?? ""),
            }))
          : [],
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map(String)
          : [],
      };
    } catch {
      return {
        title: "Untitled Event",
        description: raw,
        date: "",
        startTime: "",
        endTime: "",
        capacity: null,
        visibility: "public",
        stages: [],
        confidence: 0,
        suggestions: [
          "Could not parse AI response. Please review the description and fill in the form manually.",
        ],
      };
    }
  }
}
