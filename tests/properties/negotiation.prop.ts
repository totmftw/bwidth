import { describe, it, expect } from 'vitest';
import { negotiationSnapshotSchema, api } from '../../shared/routes';

describe('Negotiation Schemas', () => {
  it('validates a correct snapshot', () => {
    const snapshot = {
      version: 1,
      financial: {
        offerAmount: 5000,
        currency: 'USD',
        depositPercent: 30,
      },
      schedule: {
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
      },
      techRider: {
        artistRequirements: [
          { item: 'Mic', quantity: 2, status: 'pending' }
        ],
        artistBrings: [],
        organizerCommitments: [],
      }
    };
    const result = negotiationSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });
});
