import { describe, it, expect } from "vitest";
import { generateContractText, buildTermsFromBooking, BookingForContract } from "../../server/contract-utils";

describe("Contract Generation", () => {
  const mockBooking: BookingForContract = {
    id: 1,
    offerAmount: 5000,
    offerCurrency: "EUR",
    depositPercent: 50,
    artist: {
      name: "Crazy Astronaut",
      user: {
        legalName: "Crazy Astronaut Legal",
        permanentAddress: "123 Artist Lane",
        panNumber: "ART12345C",
        gstin: "27ART12345C1Z5",
        bankAccountHolderName: "Crazy Astronaut",
        bankName: "HDFC",
        bankAccountNumber: "000011112222",
        bankIfsc: "HDFC0001234",
      }
    },
    organizer: {
      name: "Future Sound Bookings",
      user: {
        legalName: "Future Sound Bookings Pvt Ltd",
        permanentAddress: "456 Organizer St",
        panNumber: "ORG12345O",
      }
    },
    venue: {
      city: "Bangalore",
    },
    meta: {
      performanceDuration: "60 to 90-minute",
      terms: {
        travel: {
          flightClass: "business class",
          flightPreference: "Star Alliance or Aeroflot only",
          routing: "Delhi to Moscow return, direct flights only via Sheremetyevo Airport",
        },
        accommodation: {
          hotelStarRating: "5",
          roomType: "one private room",
        },
        hospitality: {
          perDiem: 100,
          guestListCount: 5,
        }
      }
    }
  };

  it("buildTermsFromBooking merges custom terms from negotiation", () => {
    const terms = buildTermsFromBooking(mockBooking);
    expect((terms.travel as any).flightClass).toBe("business class");
    expect((terms.accommodation as any).hotelStarRating).toBe("5");
    expect((terms.hospitality as any).perDiem).toBe(100);
  });

  it("generateContractText includes legal variables and text correctly", () => {
    const terms = buildTermsFromBooking(mockBooking);
    const contractText = generateContractText(mockBooking, terms);

    // Assert legal identities are placed
    expect(contractText).toContain("Future Sound Bookings Pvt Ltd");
    expect(contractText).toContain("ORG12345O");
    expect(contractText).toContain("Crazy Astronaut Legal");
    expect(contractText).toContain("ART12345C");

    // Assert custom terms were populated
    expect(contractText).toContain("All international and domestic flights (business class)");
    expect(contractText).toContain("Delhi to Moscow return, direct flights only via Sheremetyevo Airport");
    expect(contractText).toContain("Minimum 5-star hotel accommodation");
    expect(contractText).toContain("A EUR 100 per day allowance for the Artist");
    
    // Assert bank details
    expect(contractText).toContain("Account Holder: Crazy Astronaut");
    expect(contractText).toContain("IFSC/SWIFT Code: HDFC0001234");
  });
});
