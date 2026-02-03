import { z } from 'zod';
import { insertUserSchema, insertArtistSchema, insertOrganizerSchema, insertVenueSchema, insertBookingSchema, users, artists, organizers, venues, bookings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema.extend({
        roleData: z.union([
          insertArtistSchema,
          insertOrganizerSchema,
          insertVenueSchema
        ]).optional()
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    user: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect & { artist?: typeof artists.$inferSelect, organizer?: typeof organizers.$inferSelect, venue?: typeof venues.$inferSelect }>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  artists: {
    list: {
      method: 'GET' as const,
      path: '/api/artists',
      input: z.object({
        genre: z.string().optional(),
        minFee: z.coerce.number().optional(),
        maxFee: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof artists.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/artists/:id',
      responses: {
        200: z.custom<typeof artists.$inferSelect & { user: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/artists/:id',
      input: insertArtistSchema.partial(),
      responses: {
        200: z.custom<typeof artists.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  venues: {
    list: {
      method: 'GET' as const,
      path: '/api/venues',
      responses: {
        200: z.array(z.custom<typeof venues.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/venues/:id',
      responses: {
        200: z.custom<typeof venues.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { 
          artist: typeof artists.$inferSelect & { user: typeof users.$inferSelect },
          organizer: typeof organizers.$inferSelect & { user: typeof users.$inferSelect },
          venue: typeof venues.$inferSelect | null
        }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bookings/:id',
      input: insertBookingSchema.partial(),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
