import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtistCategoryService } from "../../server/services/artistCategory.service";

// Mock the database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation((condition: any) => {
      // Return a mock artist based on some ID we use
      return Promise.resolve([{
        id: 1,
        priceFrom: 20000,
        priceTo: 60000,
      }]);
    }),
  }
}));

describe("ArtistCategoryService", () => {
  let service: ArtistCategoryService;

  beforeEach(() => {
    service = new ArtistCategoryService();
  });

  it("suggests mid_scale for an artist with fee max 60000", async () => {
    const category = await service.suggestCategory(1);
    expect(category).toBe("mid_scale");
  });
});
