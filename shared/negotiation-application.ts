import type {
  NegotiationSnapshot,
  TechRiderBrings,
  TechRiderRequirement,
} from "./routes";

const BULLET_PREFIX = /^[\s\-*•]+/;
const LEADING_QUANTITY = /^(\d+)\s*(?:x|×)?\s+(.+)$/i;
const TRAILING_QUANTITY = /^(.+?)\s*(?:x|×)\s*(\d+)$/i;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeQuantity(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return 1;
  }

  return numericValue;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseLineDetails(line: string) {
  let working = line.replace(BULLET_PREFIX, "").trim();

  if (!working) {
    return null;
  }

  let notes: string | undefined;

  for (const separator of [" - ", " — "]) {
    if (working.includes(separator)) {
      const [itemPart, ...noteParts] = working.split(separator);
      const item = itemPart.trim();
      const note = noteParts.join(separator).trim();

      if (item && note) {
        working = item;
        notes = note;
      }

      break;
    }
  }

  let quantity = 1;

  const leadingMatch = working.match(LEADING_QUANTITY);
  const trailingMatch = working.match(TRAILING_QUANTITY);

  if (leadingMatch) {
    quantity = normalizeQuantity(Number(leadingMatch[1]));
    working = leadingMatch[2].trim();
  } else if (trailingMatch) {
    quantity = normalizeQuantity(Number(trailingMatch[2]));
    working = trailingMatch[1].trim();
  }

  if (!working) {
    return null;
  }

  return {
    item: working,
    quantity,
    notes,
  };
}

export function splitTechnicalText(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return dedupeByKey(
    value
      .split(/\r?\n/)
      .map((line) => line.replace(BULLET_PREFIX, "").trim())
      .filter(Boolean),
    (line) => line.toLowerCase(),
  );
}

export function mergeTechnicalDefaultText(...values: unknown[]): string {
  return dedupeByKey(
    values.flatMap((value) => splitTechnicalText(value)),
    (line) => line.toLowerCase(),
  ).join("\n");
}

export function textToTechRiderRequirements(value: unknown): TechRiderRequirement[] {
  const requirements = splitTechnicalText(value)
    .map((line) => parseLineDetails(line))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => {
      const req: TechRiderRequirement = {
        item: item.item,
        quantity: item.quantity,
        status: "pending" as const,
      };
      if (item.notes) req.notes = item.notes;
      return req;
    });

  return dedupeByKey(
    requirements,
    (item) => `${item.item.toLowerCase()}|${item.quantity}|${item.notes?.toLowerCase() || ""}`,
  );
}

export function textToTechRiderBrings(value: unknown): TechRiderBrings[] {
  const brings = splitTechnicalText(value)
    .map((line) => parseLineDetails(line))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => {
      const brings: TechRiderBrings = {
        item: item.item,
        quantity: item.quantity,
      };
      if (item.notes) brings.notes = item.notes;
      return brings;
    });

  return dedupeByKey(
    brings,
    (item) => `${item.item.toLowerCase()}|${item.quantity}|${item.notes?.toLowerCase() || ""}`,
  );
}

export function normalizeTechRiderRequirements(value: unknown): TechRiderRequirement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const requirements = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = cleanString((entry as Record<string, unknown>).item);

      if (!item) {
        return null;
      }

      const requirement: TechRiderRequirement = {
        item,
        quantity: normalizeQuantity((entry as Record<string, unknown>).quantity),
        status: "pending",
      };

      const category = cleanString((entry as Record<string, unknown>).category);
      if (category) requirement.category = category;

      const notes = cleanString((entry as Record<string, unknown>).notes);
      if (notes) requirement.notes = notes;

      return requirement;
    })
    .filter((entry): entry is TechRiderRequirement => entry !== null);

  return dedupeByKey(
    requirements,
    (item) => `${item.item.toLowerCase()}|${item.category?.toLowerCase() || ""}|${item.quantity}|${item.notes?.toLowerCase() || ""}`,
  );
}

export function normalizeTechRiderBrings(value: unknown): TechRiderBrings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const brings = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = cleanString((entry as Record<string, unknown>).item);

      if (!item) {
        return null;
      }

      const bringsEntry: TechRiderBrings = {
        item,
        quantity: normalizeQuantity((entry as Record<string, unknown>).quantity),
      };

      const notes = cleanString((entry as Record<string, unknown>).notes);
      if (notes) bringsEntry.notes = notes;

      return bringsEntry;
    })
    .filter((entry): entry is TechRiderBrings => entry !== null);

  return dedupeByKey(
    brings,
    (item) => `${item.item.toLowerCase()}|${item.quantity}|${item.notes?.toLowerCase() || ""}`,
  );
}

export function normalizeApplicationProposalSnapshot(snapshot: NegotiationSnapshot): NegotiationSnapshot {
  const normalizedRequirements = normalizeTechRiderRequirements(snapshot.techRider?.artistRequirements);
  const normalizedBrings = normalizeTechRiderBrings(snapshot.techRider?.artistBrings);
  const artistNote = cleanString(snapshot.notes?.artist);
  const organizerNote = cleanString(snapshot.notes?.organizer);
  const schedule = snapshot.schedule
    ? {
        stageId: snapshot.schedule.stageId ?? null,
        stageName: cleanString(snapshot.schedule.stageName) ?? null,
        slotLabel: cleanString(snapshot.schedule.slotLabel) ?? null,
        startsAt: cleanString(snapshot.schedule.startsAt) ?? null,
        endsAt: cleanString(snapshot.schedule.endsAt) ?? null,
        soundCheckLabel: cleanString(snapshot.schedule.soundCheckLabel) ?? null,
        soundCheckAt: cleanString(snapshot.schedule.soundCheckAt) ?? null,
      }
    : null;

  return {
    financial: {
      offerAmount: Number(snapshot.financial.offerAmount),
      currency: (cleanString(snapshot.financial.currency) || "INR").toUpperCase(),
      depositPercent: snapshot.financial.depositPercent ?? null,
    },
    schedule,
    techRider: {
      artistRequirements: normalizedRequirements,
      artistBrings: normalizedBrings,
      organizerCommitments: [],
      organizerConfirmedAt: null,
      organizerConfirmedBy: null,
    },
    logistics: snapshot.logistics ?? null,
    notes: artistNote || organizerNote
      ? {
          artist: artistNote,
          organizer: organizerNote,
        }
      : null,
  };
}
