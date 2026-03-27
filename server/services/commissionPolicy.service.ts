import { db } from "../db";
import { commissionPolicies } from "../../shared/schema";
import { eq } from "drizzle-orm";

export interface BookingMathResult {
  grossBookingValue: number;
  artistFee: number;
  organizerFee: number;
  artistCommissionPct: number;
  organizerCommissionPct: number;
  platformRevenue: number;
  netPayoutToArtist: number;
  netCostToOrganizer: number;
}

export class CommissionPolicyService {
  /**
   * Calculates the exact settlement breakdown for a booking.
   * Example: booking value is ₹100.
   * Organizer pays ₹100 + (₹100 * organizerPct)
   * Artist receives ₹100 - (₹100 * artistCommissionPct)
   * Platform keeps the spread.
   */
  async calculateBookingMath(
    artistCategory: "budding" | "mid_scale" | "international" | "custom",
    trustTier: string,
    agreedFee: number
  ): Promise<BookingMathResult> {
    const [policy] = await db.select().from(commissionPolicies).where(eq(commissionPolicies.artistCategory, artistCategory));
    
    if (!policy) {
      throw new Error(`Commission policy not found for category: ${artistCategory}`);
    }

    let artistPct = Number(policy.artistPct || 0) / 100;
    let organizerPct = Number(policy.organizerPct || 0) / 100;

    // Trust tier modifier
    // Example: Critical/High Risk increases organizer fee by 2%
    // Standard/Trusted decreases organizer fee by 1%
    if (trustTier === "critical" || trustTier === "high_risk") {
      organizerPct += 0.02;
    } else if (trustTier === "trusted" || trustTier === "premium") {
      organizerPct -= 0.01;
      if (organizerPct < 0) organizerPct = 0;
    }

    const artistFee = agreedFee;
    const organizerFeeAmount = agreedFee * organizerPct;
    const artistCommissionAmount = agreedFee * artistPct;

    const netCostToOrganizer = agreedFee + organizerFeeAmount;
    const netPayoutToArtist = agreedFee - artistCommissionAmount;
    
    // Platform revenue is what organizer pays minus what artist gets
    const platformRevenue = netCostToOrganizer - netPayoutToArtist;

    return {
      grossBookingValue: agreedFee,
      artistFee: agreedFee,
      organizerFee: organizerFeeAmount,
      artistCommissionPct: artistPct * 100,
      organizerCommissionPct: organizerPct * 100,
      platformRevenue,
      netPayoutToArtist,
      netCostToOrganizer,
    };
  }
}

export const commissionPolicyService = new CommissionPolicyService();
