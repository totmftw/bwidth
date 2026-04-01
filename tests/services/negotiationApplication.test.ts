import { describe, expect, it } from "vitest";
import {
  mergeTechnicalDefaultText,
  normalizeApplicationProposalSnapshot,
  textToTechRiderBrings,
  textToTechRiderRequirements,
} from "../../shared/negotiation-application";

describe("negotiation application helpers", () => {
  it("merges artist defaults without duplicate lines", () => {
    const merged = mergeTechnicalDefaultText(
      "CDJ 3000\nMixer",
      "Mixer\nMonitors",
    );

    expect(merged).toBe("CDJ 3000\nMixer\nMonitors");
  });

  it("parses rider requirements and artist brings into structured items", () => {
    expect(textToTechRiderRequirements("2x Wireless Mic - for hosts\nMonitors")).toEqual([
      {
        item: "Wireless Mic",
        quantity: 2,
        notes: "for hosts",
        status: "pending",
      },
      {
        item: "Monitors",
        quantity: 1,
        status: "pending",
      },
    ]);

    expect(textToTechRiderBrings("Controller x2\nUSB Sticks")).toEqual([
      {
        item: "Controller",
        quantity: 2,
      },
      {
        item: "USB Sticks",
        quantity: 1,
      },
    ]);
  });

  it("normalizes proposal snapshots for application payloads", () => {
    const snapshot = normalizeApplicationProposalSnapshot({
      financial: {
        offerAmount: 25000,
        currency: "inr",
        depositPercent: 30,
      },
      schedule: {
        stageId: 9,
        stageName: " Main Stage ",
        slotLabel: " Sunset ",
        startsAt: "2026-03-28T18:00:00.000Z",
        endsAt: "2026-03-28T19:30:00.000Z",
        soundCheckLabel: " Check-in ",
        soundCheckAt: "2026-03-28T16:00:00.000Z",
      },
      techRider: {
        artistRequirements: [
          { item: "  CDJ 3000  ", quantity: 2, status: "confirmed" },
          { item: "", quantity: 1, status: "pending" },
        ],
        artistBrings: [
          { item: " Laptop ", quantity: 1 },
          { item: "Laptop", quantity: 1 },
        ],
        organizerCommitments: [{ item: "Ignore me", quantity: 1 }],
        organizerConfirmedAt: "2026-03-28T12:00:00.000Z",
        organizerConfirmedBy: 8,
      },
      logistics: null,
      notes: {
        artist: " Need clean setup ",
        organizer: "  ",
      },
    });

    expect(snapshot).toEqual({
      financial: {
        offerAmount: 25000,
        currency: "INR",
        depositPercent: 30,
      },
      schedule: {
        stageId: 9,
        stageName: "Main Stage",
        slotLabel: "Sunset",
        startsAt: "2026-03-28T18:00:00.000Z",
        endsAt: "2026-03-28T19:30:00.000Z",
        soundCheckLabel: "Check-in",
        soundCheckAt: "2026-03-28T16:00:00.000Z",
      },
      techRider: {
        artistRequirements: [
          {
            item: "CDJ 3000",
            quantity: 2,
            status: "pending",
          },
        ],
        artistBrings: [
          {
            item: "Laptop",
            quantity: 1,
          },
        ],
        organizerCommitments: [],
        organizerConfirmedAt: null,
        organizerConfirmedBy: null,
      },
      logistics: null,
      notes: {
        artist: "Need clean setup",
        organizer: null,
      },
    });
  });
});
