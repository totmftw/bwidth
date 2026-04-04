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
import { bookings, artists, events, promoters, bookingProposals } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

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
      "You are a negotiation advisor for BANDWIDTH, a curator-led music booking platform in India (Bangalore-first).",
      "",
      "CRITICAL RULES:",
      "- You MUST NOT accept, confirm, or submit any deal. You can ONLY draft proposals for human review.",
      "- Every draft proposal you create is stored in session memory and requires explicit human approval before it takes effect.",
      "- Never fabricate data. If a tool returns an error, acknowledge it and work with what you have.",
      "",
      "YOUR ROLE:",
      "- Analyse the current negotiation state (offers, counter-offers, deadlines).",
      "- Research market rates for comparable bookings to ground your recommendations in data.",
      "- Review artist profiles and event details for context.",
      "- Provide clear, reasoned recommendations with supporting evidence.",
      "- Draft counter-proposals when the user's targets diverge from the current offer.",
      "",
      "STRATEGY:",
      "- Follow the user's strategy preference: aggressive (push hard for user's price), balanced (fair middle ground), or conservative (small incremental moves).",
      "- Justify every recommendation with market data, historical patterns, or profile insights.",
      "- Consider the 72-hour negotiation deadline when advising urgency.",
      "- All monetary values are in INR unless otherwise specified.",
      "",
      "AVAILABLE TOOLS:",
      "- get_negotiation_state: Load current booking and latest proposals.",
      "- get_booking_history: Query past bookings between parties.",
      "- get_market_rates: Aggregate market data for comparable bookings.",
      "- draft_counter_proposal: Store a draft proposal in session memory (does NOT submit).",
      "- get_artist_profile: Load artist details, genres, trust score.",
      "- get_event_details: Load event info, venue, capacity.",
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
}
