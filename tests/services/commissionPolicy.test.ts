import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommissionPolicyService } from "../../server/services/commissionPolicy.service";

// Mock the database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      {
        artistCategory: "mid_scale",
        artistPct: "10.00",
        organizerPct: "5.00",
        platformPctTotal: "15.00",
      }
    ]),
  }
}));

describe("CommissionPolicyService", () => {
  let service: CommissionPolicyService;

  beforeEach(() => {
    service = new CommissionPolicyService();
  });

  it("calculates trusted tier math correctly", async () => {
    const result = await service.calculateBookingMath("mid_scale", "trusted", 1000);
    
    // With trusted tier:
    // organizerPct base is 5%, trusted tier reduces by 1% => 4%
    // artistPct is 10%
    
    expect(result.grossBookingValue).toBe(1000);
    expect(result.organizerFee).toBe(40); // 1000 * 4%
    expect(result.netCostToOrganizer).toBe(1040);
    
    expect(result.artistCommissionPct).toBe(10);
    expect(result.netPayoutToArtist).toBe(900); // 1000 - 10%
    
    expect(result.platformRevenue).toBe(140); // 1040 - 900
  });

  it("calculates high risk math correctly", async () => {
    const result = await service.calculateBookingMath("mid_scale", "high_risk", 1000);
    
    // With high risk trust tier:
    // organizerPct base is 5%, high risk adds 2% => 7%
    // artistPct is 10%
    
    expect(result.grossBookingValue).toBe(1000);
    expect(result.organizerFee).toBe(70); // 1000 * 7%
    expect(result.netCostToOrganizer).toBe(1070);
    
    expect(result.artistCommissionPct).toBe(10);
    expect(result.netPayoutToArtist).toBe(900); // 1000 - 10%
    
    expect(result.platformRevenue).toBe(170); // 1070 - 900
  });
});
