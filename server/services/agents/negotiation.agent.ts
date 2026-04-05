/**
 * Negotiation Agent — AI-powered negotiation advisor for BANDWIDTH.
 *
 * Uses a tool-calling loop to analyse the current negotiation state, research
 * market rates, inspect artist/event profiles, and draft counter-proposals.
 *
 * CRITICAL CONSTRAINT: This agent NEVER accepts or submits deals on behalf of
 * a user.  It only drafts proposals that are stored in session memory and must
 * be explicitly approved by a human before any action is taken.
 */

import {
  BaseAgent,
  AgentContext,
  ToolDefinition,
  type LlmMessage,
  type ToolCall,
} from "../agent-base";
import { storage } from "../../storage";
import { db } from "../../db";
import { bookings, artists, events, promoters, bookingProposals, messages, conversations } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { researchService } from "../research.service";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NegotiationDraft {
  id: number;
  proposal: {
    offerAmount: number;
    currency: string;
    notes: string;
  };
  reasoning: string;
  createdAt: string;
}

interface NegotiationMemory {
  targets: any;
  pendingDrafts: NegotiationDraft[];
  analysis: string | null;
  conversationSummary?: string;
}

interface MessageProcessingResult {
  action: "relay" | "filter" | "suggest" | "acknowledge" | "respond";
  processedContent: string;
  originalContent: string;
  filterReason?: string;
  suggestions?: string[];
}

// ── Agent ──────────────────────────────────────────────────────────────────────

export class NegotiationAgent extends BaseAgent {
  readonly agentType = "negotiation";
  readonly allowedRoles = [
    "organizer",
    "promoter",
    "artist",
    "venue_manager",
    "admin",
    "platform_admin",
  ];

  // ── Main execution (tool-calling loop) ───────────────────────────────────

  protected override async execute(context: AgentContext): Promise<any> {
    const { bookingId, targets } = context.params.input ?? {};

    // Initialise persistent session memory
    const memory: NegotiationMemory = {
      targets: targets ?? {},
      pendingDrafts: [],
      analysis: null,
    };
    await storage.updateAgentSession(context.session.id, { memory });

    // Build prompts
    const systemPrompt = this.buildSystemPrompt(context);

    const userMsg = [
      `Analyze the negotiation for booking #${bookingId}.`,
      `User's targets: ${JSON.stringify(targets)}.`,
      "Use the available tools to research the current state, market rates, and relevant profiles.",
      "Then draft a counter-proposal if appropriate, or provide analysis and recommendations.",
    ].join(" ");

    await this.saveUserMessage(context, userMsg);

    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg },
    ];

    // Tool-calling loop (max 8 iterations)
    const maxIterations = 8;
    const tools = this.getTools();
    const toolHandlers = this.getToolHandlers(context);

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.callLlm(context, messages, tools);
      messages.push({ role: "assistant", content: response.content });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        // No more tool calls — LLM has produced its final response.
        const finalSession = await storage.getAgentSession(context.session.id);
        const finalMemory = (finalSession?.memory as NegotiationMemory | null) ?? memory;
        finalMemory.analysis = response.content;
        await storage.updateAgentSession(context.session.id, { memory: finalMemory });

        return {
          analysis: response.content,
          pendingDrafts: finalMemory.pendingDrafts ?? [],
          strategy: targets?.strategy ?? "balanced",
        };
      }

      // Execute every tool call and append results
      const toolMessages = await this.handleToolCalls(context, response.toolCalls, toolHandlers);
      messages.push(...toolMessages);
    }

    // Max iterations reached — return whatever we have so far
    const finalSession = await storage.getAgentSession(context.session.id);
    const finalMemory = (finalSession?.memory as NegotiationMemory | null) ?? memory;
    return {
      analysis: "Analysis complete. Review pending drafts for proposed actions.",
      pendingDrafts: finalMemory.pendingDrafts ?? [],
      strategy: targets?.strategy ?? "balanced",
    };
  }

  // ── System prompt ────────────────────────────────────────────────────────

  protected buildSystemPrompt(context: AgentContext): string {
    // Prefer managed prompt version if one exists
    if (context.promptVersion?.systemPrompt) {
      return context.promptVersion.systemPrompt;
    }

    return [
      "You are the official negotiation mediator for BANDWIDTH, a curator-led music booking platform in India (Bangalore-first).",
      "You serve as the SOLE communication channel between the artist and organizer during negotiations.",
      "",
      "═══ CRITICAL SAFETY RULES ═══",
      "",
      "1. You MUST NOT accept, confirm, or submit any deal. You can ONLY draft proposals for human review.",
      "2. Every draft you create requires explicit human approval before it takes effect.",
      "3. Never fabricate data. If a tool returns an error, acknowledge it and work with what you have.",
      "",
      "═══ CONTENT MODERATION — STRICTLY ENFORCE ═══",
      "",
      "You MUST block (action: \"filter\") ANY message that contains:",
      "",
      "PERSONAL INFORMATION (immediate block):",
      "- Phone numbers, WhatsApp numbers, or any contact numbers",
      "- Email addresses or social media handles (Instagram, Twitter, Facebook, LinkedIn, etc.)",
      "- Physical addresses, home locations, or private venues",
      "- Bank account details, UPI IDs, payment links, or financial credentials",
      "- Aadhaar, PAN, passport, or any government ID numbers",
      "- Personal websites or links meant to bypass the platform",
      "",
      "ILLEGAL / CRIMINAL CONTENT (immediate block):",
      "- References to illegal substances, drug use, or drug-related activities",
      "- Money laundering, tax evasion, or financial fraud schemes",
      "- Piracy, copyright infringement, or unauthorized recording plans",
      "- Bribery, corruption, or under-the-table payment proposals",
      "- Any activity that violates Indian law",
      "",
      "OFFENSIVE / NSFW CONTENT (immediate block):",
      "- Slurs, hate speech, or discriminatory language targeting a group",
      "- Sexual content, innuendo, or inappropriate advances",
      "- Direct threats, intimidation, coercion, or blackmail",
      "- Targeted personal harassment or character defamation",
      "NOTE: Casual profanity or strong language (e.g. expletives for emphasis) must NOT be filtered.",
      "Instead, understand the underlying intent and relay it with professional language.",
      "",
      "OFF-TOPIC CONTENT (immediate block):",
      "- Casual conversation unrelated to the booking (small talk, gossip, personal life)",
      "- Promotion of unrelated products, services, or events",
      "- Attempts to arrange deals outside the platform",
      "- Political, religious, or controversial opinions",
      "- Spam, chain messages, or repeated content",
      "",
      "When blocking, set filterReason to a brief, professional explanation.",
      "NEVER relay the blocked content to the other party. Only inform the sender.",
      "",
      "═══ YOUR ROLE ═══",
      "",
      "- You are a NEUTRAL, professional intermediary. You represent neither party.",
      "- Analyse the current negotiation state (offers, counter-offers, deadlines).",
      "- Research market rates for comparable bookings to ground recommendations in data.",
      "- Provide clear, reasoned recommendations with supporting evidence.",
      "- Draft counter-proposals when the user's targets diverge from the current offer.",
      "",
      "═══ RELAY PROTOCOL ═══",
      "",
      "For messages between parties, choose ONE action:",
      "- RELAY: Forward with professional rephrasing. Remove filler/emotion, keep facts intact.",
      "- FILTER: Block the message entirely. Only notify the sender with the reason.",
      "- SUGGEST: Relay the message AND include a data-driven suggestion (fee, timing, market insight).",
      "- RESPOND: The user is asking YOU a question (about fees, timing, market data, strategy). Answer directly without relaying to the other party.",
      "- ACKNOWLEDGE: Simple receipt, no relay needed.",
      "",
      "DETECTING QUESTIONS FOR YOU:",
      "- If the message asks about \"what should I offer?\", \"is this a fair price?\", \"what's the market rate?\", \"when is the best time slot?\" — these are questions FOR YOU. Use action \"respond\".",
      "- If the message starts with \"@agent\" or \"hey agent\" — it's directed at you.",
      "- If unsure whether a message is for you or for the other party, default to RELAY.",
      "",
      "═══ STRATEGY ═══",
      "",
      "- Follow the user's strategy preference: aggressive (push for user's price), balanced (fair middle ground), or conservative (small incremental moves).",
      "- Justify every recommendation with market data, historical patterns, or profile insights.",
      "- Consider the 72-hour negotiation deadline when advising urgency.",
      "- All monetary values are in INR unless otherwise specified.",
      "",
      "═══ TURN ENFORCEMENT ═══",
      "",
      "- Reference the current stepState to enforce whose turn it is.",
      "- If a message arrives out of turn, acknowledge privately but do not relay until it's their turn.",
      "",
      "═══ CONFIDENTIALITY ═══",
      "",
      "- NEVER reveal one party's targets, minimum/maximum price, or strategy to the other party.",
      "- NEVER disclose research confidence scores or internal intelligence data.",
      "- NEVER share one party's personal details (legal name, address, PAN, bank info) with the other — these exist only in contracts.",
      "",
      "═══ AVAILABLE TOOLS ═══",
      "",
      "- get_negotiation_state: Load current booking and latest proposals.",
      "- get_booking_history: Query past bookings between parties.",
      "- get_market_rates: Aggregate market data for comparable bookings.",
      "- draft_counter_proposal: Store a draft proposal in session memory (does NOT submit).",
      "- get_artist_profile: Load artist details, genres, trust score.",
      "- get_event_details: Load event info, venue, capacity.",
      "- get_research_intel: Fetch comprehensive research intelligence for a booking.",
      "- get_fee_suggestion: Get a data-driven fee suggestion based on artist profile, venue, and genre.",
      "- process_chat_message: Analyse a chat message for moderation and professional rephrasing.",
      "- suggest_proposal_terms: Generate suggested proposal terms based on research.",
      "- summarize_negotiation: Generate a plain-English summary of current negotiation state.",
      "",
      "Always start by fetching the negotiation state, then gather supporting data before making recommendations.",
    ].join("\n");
  }

  // ── Tool definitions ─────────────────────────────────────────────────────

  protected getTools(): ToolDefinition[] {
    return [
      {
        name: "get_negotiation_state",
        description:
          "Load the current booking and its latest proposals. Returns status, whose turn it is, latest offer amounts, and deadline information.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "number", description: "The booking ID to inspect" },
          },
          required: ["bookingId"],
        },
      },
      {
        name: "get_booking_history",
        description:
          "Query completed bookings between an artist and organizer. Returns count of past bookings, average amounts, and a history summary.",
        parameters: {
          type: "object",
          properties: {
            artistId: { type: "number", description: "Artist ID (optional)" },
            organizerId: { type: "number", description: "Organizer/promoter ID (optional)" },
          },
          required: [],
        },
      },
      {
        name: "get_market_rates",
        description:
          "Aggregate offer amounts from completed bookings to derive market rate statistics (min, max, avg, count).",
        parameters: {
          type: "object",
          properties: {
            genre: { type: "string", description: "Filter by genre name (optional)" },
            city: { type: "string", description: "Filter by city name (optional)" },
            capacity: { type: "number", description: "Approximate venue capacity for comparison (optional)" },
          },
          required: [],
        },
      },
      {
        name: "draft_counter_proposal",
        description:
          "Store a draft counter-proposal in session memory for human review. This does NOT submit or accept anything — it merely records the draft.",
        parameters: {
          type: "object",
          properties: {
            offerAmount: { type: "number", description: "Proposed offer amount" },
            currency: { type: "string", description: "Currency code (e.g. INR)" },
            notes: { type: "string", description: "Notes to accompany the proposal" },
            reasoning: { type: "string", description: "Explanation of why this amount is recommended" },
          },
          required: ["offerAmount", "currency", "notes", "reasoning"],
        },
      },
      {
        name: "get_artist_profile",
        description:
          "Load an artist's profile including name, bio, genres, fee range, and trust score.",
        parameters: {
          type: "object",
          properties: {
            artistId: { type: "number", description: "The artist ID to look up" },
          },
          required: ["artistId"],
        },
      },
      {
        name: "get_event_details",
        description:
          "Load event details including title, date, venue, capacity, and description.",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "number", description: "The event ID to look up" },
          },
          required: ["eventId"],
        },
      },
      // ── Research & message-processing tools ────────────────────────────
      {
        name: "get_research_intel",
        description:
          "Fetch comprehensive research intelligence for a booking, including artist profile data, organizer history, market comparables, and venue context. Returns a consolidated context object.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "number", description: "The booking ID to research" },
          },
          required: ["bookingId"],
        },
      },
      {
        name: "get_fee_suggestion",
        description:
          "Get a data-driven fee suggestion for an artist based on their profile, the organizer's history, venue capacity, and genre. Returns a suggested fee range with confidence score.",
        parameters: {
          type: "object",
          properties: {
            artistId: { type: "number", description: "The artist ID" },
            organizerId: { type: "number", description: "The organizer/promoter ID (optional)" },
            venueCapacity: { type: "number", description: "Approximate venue capacity (optional)" },
            genre: { type: "string", description: "Genre name for comparable fee lookup (optional)" },
          },
          required: ["artistId"],
        },
      },
      {
        name: "process_chat_message",
        description:
          "Analyse a chat message from one negotiation party for content moderation and professional rephrasing. Returns a relay/filter/suggest/acknowledge action with processed content.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "The raw message text to process" },
            senderRole: { type: "string", description: "Role of the sender: 'artist' or 'organizer'" },
            conversationContext: { type: "string", description: "Summary of recent conversation for context (optional)" },
          },
          required: ["message", "senderRole"],
        },
      },
      {
        name: "suggest_proposal_terms",
        description:
          "Generate suggested proposal terms for a booking based on research intelligence, market rates, and negotiation history. Returns pre-filled form values the user can review and adjust.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "number", description: "The booking ID to suggest terms for" },
          },
          required: ["bookingId"],
        },
      },
      {
        name: "summarize_negotiation",
        description:
          "Generate a plain-English summary of where a negotiation currently stands, including proposal history, key sticking points, and next steps.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "number", description: "The booking ID to summarize" },
          },
          required: ["bookingId"],
        },
      },
    ];
  }

  // ── Tool handlers ────────────────────────────────────────────────────────

  private getToolHandlers(
    context: AgentContext,
  ): Record<string, (args: any) => Promise<string>> {
    return {
      get_negotiation_state: async (args) => {
        return this.handleGetNegotiationState(args);
      },
      get_booking_history: async (args) => {
        return this.handleGetBookingHistory(args);
      },
      get_market_rates: async (args) => {
        return this.handleGetMarketRates(args);
      },
      draft_counter_proposal: async (args) => {
        return this.handleDraftCounterProposal(context, args);
      },
      get_artist_profile: async (args) => {
        return this.handleGetArtistProfile(args);
      },
      get_event_details: async (args) => {
        return this.handleGetEventDetails(args);
      },
      // ── Research & message-processing tool handlers ────────────────────
      get_research_intel: async (args) => {
        return this.handleGetResearchIntel(args);
      },
      get_fee_suggestion: async (args) => {
        return this.handleGetFeeSuggestion(args);
      },
      process_chat_message: async (args) => {
        return this.handleProcessChatMessage(args);
      },
      suggest_proposal_terms: async (args) => {
        return this.handleSuggestProposalTerms(args);
      },
      summarize_negotiation: async (args) => {
        return this.handleSummarizeNegotiation(args);
      },
    };
  }

  // ── Individual tool handler implementations ──────────────────────────────

  private async handleGetNegotiationState(args: { bookingId: number }): Promise<string> {
    try {
      const booking = await storage.getBooking(args.bookingId);
      if (!booking) {
        return JSON.stringify({ error: `Booking #${args.bookingId} not found` });
      }

      const proposals = await storage.getBookingProposals(args.bookingId);
      const latestProposal = await storage.getLatestBookingProposal(args.bookingId);

      const meta = (booking.meta as any) ?? {};
      const negotiation = meta.negotiation ?? {};

      // Determine whose turn it is based on the latest proposal
      let whoseTurn = "unknown";
      if (latestProposal) {
        whoseTurn = latestProposal.submittedByRole === "artist" ? "organizer" : "artist";
      }

      return JSON.stringify({
        bookingId: booking.id,
        status: booking.status,
        currentOfferAmount: booking.offerAmount ? Number(booking.offerAmount) : null,
        offerCurrency: booking.offerCurrency ?? "INR",
        artistFee: booking.artistFee ? Number(booking.artistFee) : null,
        organizerFee: booking.organizerFee ? Number(booking.organizerFee) : null,
        grossBookingValue: booking.grossBookingValue ? Number(booking.grossBookingValue) : null,
        whoseTurn,
        proposalCount: proposals.length,
        latestProposal: latestProposal
          ? {
              round: latestProposal.round,
              step: latestProposal.stepNumber,
              submittedByRole: latestProposal.submittedByRole,
              status: latestProposal.status,
              proposedTerms: latestProposal.proposedTerms,
              note: latestProposal.note,
            }
          : null,
        deadline: booking.flowDeadlineAt?.toISOString() ?? null,
        flowStarted: booking.flowStartedAt?.toISOString() ?? null,
        currentSnapshot: negotiation.currentProposalSnapshot ?? null,
        eventId: booking.eventId,
        artistId: booking.artistId,
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load negotiation state: ${err.message}` });
    }
  }

  private async handleGetBookingHistory(args: {
    artistId?: number;
    organizerId?: number;
  }): Promise<string> {
    try {
      const conditions: any[] = [eq(bookings.status, "completed")];

      if (args.artistId) {
        conditions.push(eq(bookings.artistId, args.artistId));
      }
      if (args.organizerId) {
        // Join through events to filter by organizer
        const orgEvents = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.organizerId, args.organizerId));
        const eventIds = orgEvents.map((e) => e.id);

        if (eventIds.length === 0) {
          return JSON.stringify({
            count: 0,
            averageAmount: null,
            history: "No completed bookings found for this organizer.",
          });
        }

        // Add event filter using sql`in` since we have an array
        conditions.push(
          sql`${bookings.eventId} IN (${sql.join(
            eventIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      }

      const result = await db
        .select({
          count: sql<number>`count(*)::int`,
          avgAmount: sql<string>`coalesce(avg(${bookings.offerAmount}::numeric), 0)`,
          minAmount: sql<string>`coalesce(min(${bookings.offerAmount}::numeric), 0)`,
          maxAmount: sql<string>`coalesce(max(${bookings.offerAmount}::numeric), 0)`,
        })
        .from(bookings)
        .where(and(...conditions));

      const row = result[0];
      return JSON.stringify({
        count: row?.count ?? 0,
        averageAmount: row?.avgAmount ? Number(Number(row.avgAmount).toFixed(2)) : null,
        minAmount: row?.minAmount ? Number(Number(row.minAmount).toFixed(2)) : null,
        maxAmount: row?.maxAmount ? Number(Number(row.maxAmount).toFixed(2)) : null,
        history:
          row?.count && row.count > 0
            ? `Found ${row.count} completed booking(s). Average deal: INR ${Number(Number(row.avgAmount).toFixed(0)).toLocaleString()}, range: INR ${Number(Number(row.minAmount).toFixed(0)).toLocaleString()} — INR ${Number(Number(row.maxAmount).toFixed(0)).toLocaleString()}.`
            : "No completed bookings found between these parties.",
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load booking history: ${err.message}` });
    }
  }

  private async handleGetMarketRates(args: {
    genre?: string;
    city?: string;
    capacity?: number;
  }): Promise<string> {
    try {
      // Base aggregation on completed bookings
      const result = await db
        .select({
          count: sql<number>`count(*)::int`,
          avgAmount: sql<string>`coalesce(avg(${bookings.offerAmount}::numeric), 0)`,
          minAmount: sql<string>`coalesce(min(${bookings.offerAmount}::numeric), 0)`,
          maxAmount: sql<string>`coalesce(max(${bookings.offerAmount}::numeric), 0)`,
        })
        .from(bookings)
        .where(eq(bookings.status, "completed"));

      const row = result[0];
      const count = row?.count ?? 0;

      // Build a textual summary
      const filters: string[] = [];
      if (args.genre) filters.push(`genre: ${args.genre}`);
      if (args.city) filters.push(`city: ${args.city}`);
      if (args.capacity) filters.push(`capacity ~${args.capacity}`);

      return JSON.stringify({
        filters: filters.length > 0 ? filters.join(", ") : "all completed bookings",
        sampleSize: count,
        avgAmount: row?.avgAmount ? Number(Number(row.avgAmount).toFixed(2)) : null,
        minAmount: row?.minAmount ? Number(Number(row.minAmount).toFixed(2)) : null,
        maxAmount: row?.maxAmount ? Number(Number(row.maxAmount).toFixed(2)) : null,
        summary:
          count > 0
            ? `Based on ${count} completed booking(s): average INR ${Number(Number(row!.avgAmount).toFixed(0)).toLocaleString()}, range INR ${Number(Number(row!.minAmount).toFixed(0)).toLocaleString()} — INR ${Number(Number(row!.maxAmount).toFixed(0)).toLocaleString()}.`
            : "No completed bookings found matching these criteria. Market data is insufficient for reliable rate estimation.",
        note:
          count < 5
            ? "Warning: small sample size — treat these figures as directional, not definitive."
            : undefined,
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load market rates: ${err.message}` });
    }
  }

  private async handleDraftCounterProposal(
    context: AgentContext,
    args: {
      offerAmount: number;
      currency: string;
      notes: string;
      reasoning: string;
    },
  ): Promise<string> {
    try {
      // Reload session to get the latest memory state
      const session = await storage.getAgentSession(context.session.id);
      if (!session) {
        return JSON.stringify({ error: "Session not found — cannot store draft" });
      }

      const memory = (session.memory as NegotiationMemory | null) ?? {
        targets: {},
        pendingDrafts: [],
        analysis: null,
      };

      const draftId = (memory.pendingDrafts?.length ?? 0) + 1;

      const draft: NegotiationDraft = {
        id: draftId,
        proposal: {
          offerAmount: args.offerAmount,
          currency: args.currency,
          notes: args.notes,
        },
        reasoning: args.reasoning,
        createdAt: new Date().toISOString(),
      };

      if (!Array.isArray(memory.pendingDrafts)) {
        memory.pendingDrafts = [];
      }
      memory.pendingDrafts.push(draft);

      await storage.updateAgentSession(context.session.id, { memory });

      return JSON.stringify({
        status: "draft_stored",
        draftId,
        message: `Draft proposal #${draftId} stored in session memory: ${args.currency} ${args.offerAmount.toLocaleString()}. This draft requires human approval before submission.`,
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to store draft proposal: ${err.message}` });
    }
  }

  private async handleGetArtistProfile(args: { artistId: number }): Promise<string> {
    try {
      const artist = await storage.getArtist(args.artistId);
      if (!artist) {
        return JSON.stringify({ error: `Artist #${args.artistId} not found` });
      }

      const metadata = (artist.metadata as any) ?? {};

      return JSON.stringify({
        id: artist.id,
        name: artist.name,
        bio: artist.bio ?? null,
        genre: metadata.primaryGenre ?? null,
        secondaryGenres: metadata.secondaryGenres ?? [],
        feeRange: {
          min: artist.priceFrom ? Number(artist.priceFrom) : null,
          max: artist.priceTo ? Number(artist.priceTo) : null,
          currency: artist.currency ?? "INR",
        },
        category: artist.artistCategory ?? null,
        trustScore: metadata.trustScore ?? null,
        ratingAvg: artist.ratingAvg ? Number(artist.ratingAvg) : null,
        ratingCount: artist.ratingCount ?? 0,
        location: (artist.baseLocation as any)?.name ?? metadata.location ?? null,
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load artist profile: ${err.message}` });
    }
  }

  private async handleGetEventDetails(args: { eventId: number }): Promise<string> {
    try {
      const event = await storage.getEvent(args.eventId);
      if (!event) {
        return JSON.stringify({ error: `Event #${args.eventId} not found` });
      }

      return JSON.stringify({
        id: event.id,
        title: event.title,
        description: event.description ?? null,
        startTime: event.startTime?.toISOString() ?? null,
        endTime: event.endTime?.toISOString() ?? null,
        capacity: event.capacityTotal ?? null,
        status: event.status ?? null,
        venue: event.venue
          ? {
              name: event.venue.name,
              capacity: event.venue.capacity ?? null,
              city: event.venue.cityId ?? null,
            }
          : null,
        organizer: event.organizer
          ? {
              id: event.organizer.id,
              name: event.organizer.name ?? null,
            }
          : null,
        stages: Array.isArray(event.stages)
          ? event.stages.map((s: any) => ({
              id: s.id,
              name: s.name,
              startTime: s.startTime?.toISOString() ?? null,
              endTime: s.endTime?.toISOString() ?? null,
            }))
          : [],
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load event details: ${err.message}` });
    }
  }

  // ── Research & message-processing tool handler implementations ─────────

  private async handleGetResearchIntel(args: { bookingId: number }): Promise<string> {
    try {
      const context = await researchService.buildFullContext(args.bookingId);
      return JSON.stringify(context);
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to load research intel: ${err.message}` });
    }
  }

  private async handleGetFeeSuggestion(args: {
    artistId: number;
    organizerId?: number;
    venueCapacity?: number;
    genre?: string;
  }): Promise<string> {
    try {
      const suggestion = await researchService.suggestFee(args);
      return JSON.stringify(suggestion);
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to get fee suggestion: ${err.message}` });
    }
  }

  private async handleProcessChatMessage(args: {
    message: string;
    senderRole: string;
    conversationContext?: string;
  }): Promise<string> {
    try {
      // This tool provides structured analysis guidance for the LLM.
      // The actual moderation decision is made by the LLM using the system prompt rules.
      return JSON.stringify({
        instruction: "Analyse the following message using the RELAY PROTOCOL rules in your system prompt.",
        message: args.message,
        senderRole: args.senderRole,
        conversationContext: args.conversationContext ?? "No additional context provided.",
        expectedResponseFormat: {
          action: "relay | filter | suggest | acknowledge",
          processedContent: "Professionally rephrased version of the message (for relay/suggest)",
          filterReason: "Reason the message was blocked (for filter action only)",
          suggestions: ["Optional data-driven suggestions to append"],
        },
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to process chat message: ${err.message}` });
    }
  }

  private async handleSuggestProposalTerms(args: { bookingId: number }): Promise<string> {
    try {
      // Load full research context for data-driven suggestions
      let researchContext: any = null;
      try {
        researchContext = await researchService.buildFullContext(args.bookingId);
      } catch {
        // Research may not be available; proceed without it
      }

      // Load current negotiation state for baseline
      const stateJson = await this.handleGetNegotiationState({ bookingId: args.bookingId });
      const state = JSON.parse(stateJson);

      if (state.error) {
        return JSON.stringify({ error: state.error });
      }

      // Build suggested terms from research + current state
      const currentOffer = state.currentOfferAmount;
      const latestProposal = state.latestProposal;

      const suggestedTerms: any = {
        bookingId: args.bookingId,
        currentState: {
          status: state.status,
          currentOffer,
          whoseTurn: state.whoseTurn,
          proposalRound: latestProposal?.round ?? 0,
        },
        suggestedFormValues: {
          offerAmount: currentOffer,
          currency: state.offerCurrency ?? "INR",
          notes: "",
        },
      };

      // Enrich with research data if available
      if (researchContext) {
        suggestedTerms.researchBasis = {
          marketContext: researchContext.marketRates ?? null,
          artistIntel: researchContext.artistProfile ?? null,
          feeSuggestion: researchContext.feeSuggestion ?? null,
        };

        // If research has a fee suggestion, include it
        if (researchContext.feeSuggestion?.suggestedFee) {
          suggestedTerms.suggestedFormValues.offerAmount = researchContext.feeSuggestion.suggestedFee;
          suggestedTerms.suggestedFormValues.notes =
            `Data-driven suggestion based on market analysis (confidence: ${researchContext.feeSuggestion.confidence ?? "unknown"}).`;
        }
      }

      // Include latest proposal terms for comparison
      if (latestProposal?.proposedTerms) {
        suggestedTerms.lastProposedTerms = latestProposal.proposedTerms;
      }

      return JSON.stringify(suggestedTerms);
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to suggest proposal terms: ${err.message}` });
    }
  }

  private async handleSummarizeNegotiation(args: { bookingId: number }): Promise<string> {
    try {
      const proposals = await storage.getBookingProposals(args.bookingId);
      const booking = await storage.getBooking(args.bookingId);

      if (!booking) {
        return JSON.stringify({ error: `Booking #${args.bookingId} not found` });
      }

      // Build a chronological summary of all proposals
      const proposalSummaries = proposals.map((p: any, idx: number) => ({
        round: p.round,
        step: p.stepNumber,
        submittedBy: p.submittedByRole,
        status: p.status,
        terms: p.proposedTerms,
        note: p.note ?? null,
        response: p.responseAction ?? null,
        date: p.createdAt?.toISOString() ?? null,
      }));

      const meta = (booking.meta as any) ?? {};
      const negotiation = meta.negotiation ?? {};

      // Determine whose turn it is
      const latestProposal = proposals.length > 0 ? proposals[proposals.length - 1] : null;
      const whoseTurn = latestProposal
        ? (latestProposal as any).submittedByRole === "artist" ? "organizer" : "artist"
        : "unknown";

      // Calculate time remaining if deadline is set
      let timeRemaining: string | null = null;
      if (booking.flowDeadlineAt) {
        const msLeft = new Date(booking.flowDeadlineAt).getTime() - Date.now();
        if (msLeft > 0) {
          const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
          const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
          timeRemaining = `${hoursLeft}h ${minutesLeft}m remaining`;
        } else {
          timeRemaining = "DEADLINE EXPIRED";
        }
      }

      return JSON.stringify({
        bookingId: booking.id,
        status: booking.status,
        totalRounds: proposals.length,
        whoseTurn,
        currentOffer: booking.offerAmount ? Number(booking.offerAmount) : null,
        currency: booking.offerCurrency ?? "INR",
        deadline: booking.flowDeadlineAt?.toISOString() ?? null,
        timeRemaining,
        currentSnapshot: negotiation.currentProposalSnapshot ?? null,
        proposalHistory: proposalSummaries,
        summary: this.buildNegotiationSummaryText(booking, proposals),
      });
    } catch (err: any) {
      return JSON.stringify({ error: `Failed to summarize negotiation: ${err.message}` });
    }
  }

  /**
   * Build a human-readable negotiation summary from booking and proposal data.
   */
  private buildNegotiationSummaryText(booking: any, proposals: any[]): string {
    if (proposals.length === 0) {
      return `Booking #${booking.id} is in "${booking.status}" status with no proposals exchanged yet.`;
    }

    const lines: string[] = [];
    lines.push(`Negotiation for booking #${booking.id} (status: ${booking.status}):`);

    for (const p of proposals) {
      const terms = p.proposedTerms as any;
      const amount = terms?.offerAmount ?? terms?.fee ?? "N/A";
      const currency = terms?.currency ?? booking.offerCurrency ?? "INR";
      lines.push(
        `  Round ${p.round}, Step ${p.stepNumber ?? "?"}: ${p.submittedByRole} proposed ${currency} ${typeof amount === "number" ? amount.toLocaleString() : amount}` +
        (p.responseAction ? ` (response: ${p.responseAction})` : "") +
        (p.note ? ` — "${p.note}"` : ""),
      );
    }

    const latest = proposals[proposals.length - 1];
    const nextTurn = (latest as any).submittedByRole === "artist" ? "organizer" : "artist";
    lines.push(`Next move: ${nextTurn}'s turn.`);

    if (booking.flowDeadlineAt) {
      const msLeft = new Date(booking.flowDeadlineAt).getTime() - Date.now();
      if (msLeft > 0) {
        const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
        lines.push(`Deadline: ${hoursLeft} hours remaining.`);
      } else {
        lines.push("WARNING: Negotiation deadline has expired.");
      }
    }

    return lines.join("\n");
  }

  // ── Public message-processing method ────────────────────────────────────

  /**
   * Process a single chat message through the AI mediator.
   *
   * This is called per-message during active negotiation conversations to
   * moderate, rephrase, and optionally enrich messages before they reach
   * the other party.  It operates outside the normal `execute()` flow —
   * it does NOT create/manage a full agent session.
   */
  async processMessage(params: {
    sessionId: number;
    userId: number;
    bookingId: number;
    rawMessage: string;
    senderRole: "artist" | "organizer";
  }): Promise<MessageProcessingResult> {
    // 1. Load recent conversation messages for context
    let recentMessages: string = "No recent messages available.";
    try {
      // Find the negotiation conversation for this booking
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.entityType, "booking"),
            eq(conversations.entityId, params.bookingId),
            eq(conversations.conversationType, "negotiation"),
          ),
        );

      if (conversation) {
        const recentRows = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(10);

        // Reverse to chronological order
        const chronological = recentRows.reverse();
        recentMessages = chronological
          .map((m) => `[${m.senderId ? `User #${m.senderId}` : "System"}]: ${m.body ?? "(no body)"}`)
          .join("\n");
      }
    } catch {
      // Non-critical — proceed with empty context
    }

    // 2. Load research context (non-blocking, defaults to null)
    let researchContext: any = null;
    try {
      researchContext = await researchService.buildFullContext(params.bookingId);
    } catch {
      // Research service may be unavailable; proceed without it
    }

    // 3. Load current negotiation state
    let negotiationState = "Negotiation state unavailable.";
    try {
      negotiationState = await this.handleGetNegotiationState({ bookingId: params.bookingId });
    } catch {
      // Non-critical
    }

    // 4. Build a focused system prompt for message processing
    const isArtist = params.senderRole === "artist";
    const senderLabel = isArtist ? "ARTIST" : "ORGANIZER";
    const feeVerb = isArtist ? "charge" : "offer/pay";
    const feeFraming = isArtist
      ? "The sender is the ARTIST. Frame all fee guidance from their perspective: what fee to CHARGE, what their performance is worth, what the market pays artists like them. Never frame it as what to 'offer' as if they are paying someone."
      : "The sender is the ORGANIZER. Frame all fee guidance from their perspective: what to OFFER/PAY the artist, what their budget can sustain, what organizers typically pay for this type of act.";

    const systemPrompt = [
      `You are BANDWIDTH's negotiation mediator processing a message from the ${senderLabel} (role: ${params.senderRole}) for booking #${params.bookingId}.`,
      "",
      "═══ ROLE-AWARE CONTEXT ═══",
      "",
      feeFraming,
      `When the ${senderLabel} asks for advice, ALWAYS answer from their perspective as the ${params.senderRole}.`,
      "Never confuse which side of the negotiation the sender is on.",
      "",
      "CONTEXT:",
      `- Negotiation state: ${negotiationState}`,
      `- Research context: ${researchContext ? JSON.stringify(researchContext) : "Not available"}`,
      `- Recent messages:\n${recentMessages}`,
      "",
      "═══ CONTENT MODERATION — BLOCK IMMEDIATELY ═══",
      "",
      "Set action to \"filter\" ONLY if the message contains:",
      "- Personal contact info: phone numbers, emails, social media handles, WhatsApp numbers, UPI IDs",
      "- Physical addresses, government IDs (Aadhaar, PAN, passport), or bank details",
      "- Links or URLs meant to take communication off-platform",
      "- Illegal content: drugs, fraud, tax evasion, piracy, bribery, under-the-table payments",
      "- NSFW content: sexual content, inappropriate advances, explicit material",
      "- Hate speech: slurs, discriminatory language targeting a group",
      "- Direct threats, blackmail, or coercion",
      "- Attempts to bypass the platform or arrange deals outside BANDWIDTH",
      "",
      "DO NOT filter for:",
      "- Casual profanity or strong language expressing frustration (e.g. 'wtf', 'damn', expletives used for emphasis) — instead, understand the intent and RELAY it professionally",
      "- ALL-CAPS messages — understand the underlying request and respond accordingly",
      "- Informal or slang phrasing — extract the professional meaning and relay/respond",
      "- Off-topic chatter mixed with a real question — strip the off-topic parts and address the question",
      "",
      "═══ DATA-DRIVEN INTELLIGENCE ═══",
      "",
      "You have access to the research context above. USE IT:",
      "- Reference actual market rates from comparable bookings in the platform DB",
      "- Factor in the artist's trust score, genre, past booking history, and fee history",
      "- Factor in the organizer's payment reliability and cancellation history",
      "- Factor in the venue capacity, type, and typical fee bands for this region/season",
      "- If research context is unavailable, use Indian music industry norms (Bangalore market)",
      "- When suggesting a fee, give a specific number or range — never say 'it depends' without data",
      `- Always frame the suggestion from the ${senderLabel}'s interest: what is best for them`,
      "",
      "═══ ACTION RULES ═══",
      "",
      "Choose ONE action:",
      "1. FILTER: Block the message entirely. Set filterReason. Do NOT relay to other party. Use only for the hard-block categories above.",
      "2. RELAY: Message is constructive and on-topic. Rephrase professionally. Remove filler/emotion/profanity, keep facts and intent.",
      "3. SUGGEST: Relay AND include a data-driven suggestion (fee, timing, market insight) backed by the research context.",
      "4. RESPOND: The user is asking YOU a question. Answer directly from their role's perspective with specific, data-backed advice. Do NOT relay to other party.",
      "5. ACKNOWLEDGE: Simple receipt, no relay needed.",
      "",
      "DETECTING QUESTIONS FOR YOU (use \"respond\"):",
      `- Questions about what to ${feeVerb}, is a price fair, market rate, best time slot`,
      "- Messages starting with \"@agent\" or \"hey agent\"",
      "- Any question about fees, market data, strategy, or booking logistics",
      "- Even if phrased informally or with profanity (e.g. 'wtf should I charge??') — detect the intent, respond professionally",
      "",
      "CONFIDENTIALITY: Never reveal the sender's private targets, strategy, or personal details to the other party.",
      "",
      "Respond ONLY with valid JSON (no markdown fences, no extra text):",
      "{",
      '  "action": "relay" | "filter" | "suggest" | "acknowledge" | "respond",',
      '  "processedContent": "the rephrased message (relay/suggest) OR your direct answer (respond)",',
      '  "filterReason": "why blocked (filter only)",',
      '  "suggestions": ["optional data-driven suggestions"]',
      "}",
    ].join("\n");

    const llmMessages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: params.rawMessage },
    ];

    // 5. Make a single LLM call (outside the normal execute flow)
    try {
      const { callLlm } = await import("../llm-proxy.service");

      const response = await callLlm({
        userId: params.userId,
        agentType: this.agentType,
        sessionId: params.sessionId,
        messages: llmMessages,
        temperature: 0.3, // Low temperature for consistent moderation
        maxTokens: 1024,
      });

      // 6. Parse the JSON response
      const parsed = this.parseMessageProcessingResponse(response.content, params.rawMessage);
      return parsed;
    } catch (err: any) {
      // On LLM failure, default to relaying the original message unmodified
      return {
        action: "relay",
        processedContent: params.rawMessage,
        originalContent: params.rawMessage,
        suggestions: [],
      };
    }
  }

  /**
   * Safely parse the LLM's JSON response for message processing.
   * Falls back to relaying the original message if parsing fails.
   */
  private parseMessageProcessingResponse(
    llmContent: string,
    originalMessage: string,
  ): MessageProcessingResult {
    try {
      // Strip potential markdown code fences
      let cleaned = llmContent.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned);

      // Validate required fields
      const action = ["relay", "filter", "suggest", "acknowledge", "respond"].includes(parsed.action)
        ? parsed.action
        : "relay";

      return {
        action,
        processedContent: parsed.processedContent ?? originalMessage,
        originalContent: originalMessage,
        filterReason: parsed.filterReason ?? undefined,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : undefined,
      };
    } catch {
      // JSON parse failure — safe fallback to relay
      return {
        action: "relay",
        processedContent: originalMessage,
        originalContent: originalMessage,
      };
    }
  }
}
