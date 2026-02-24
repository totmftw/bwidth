# Project Structure

Monorepo with client, server, and shared code in one workspace.

```
├── client/                    # React frontend (Vite root)
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/            # shadcn/ui primitives (modify with care)
│   │   │   ├── booking/       # Booking-specific components
│   │   │   └── *.tsx          # Feature components (modals, nav)
│   │   ├── hooks/             # Custom React hooks (use-*.ts pattern)
│   │   ├── lib/               # Utilities (queryClient, utils)
│   │   ├── pages/             # Page components organized by role
│   │   │   ├── admin/         # Admin dashboard pages
│   │   │   ├── artist/        # Artist-facing pages
│   │   │   ├── venue/         # Venue management pages
│   │   │   └── *.tsx          # Shared pages (Auth, Landing, etc.)
│   │   ├── App.tsx            # Root component with routing
│   │   └── main.tsx           # React entry point
│   └── index.html
│
├── server/                    # Express backend
│   ├── routes/                # Feature-specific route modules
│   ├── services/              # Business logic services
│   ├── auth.ts                # Passport.js auth setup
│   ├── db.ts                  # Drizzle + pg pool connection
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # Main route registration
│   ├── storage.ts             # Data access layer (all DB queries)
│   ├── seed.ts                # Database seeding script
│   ├── static.ts              # Production static file serving
│   └── vite.ts                # Vite dev middleware integration
│
├── shared/                    # Code shared between client and server
│   ├── schema.ts              # Drizzle ORM tables, enums, Zod schemas
│   └── routes.ts              # API route contracts (paths, methods, types)
│
├── migrations/                # Drizzle-generated SQL migrations
├── docs/                      # Project documentation
├── prereq/                    # Product requirements and reference docs
└── drizzle.config.ts          # Drizzle Kit configuration
```

## Architecture Notes
- `shared/schema.ts` is the single source of truth for DB types and validation
- `server/storage.ts` is the data access layer — all DB queries go through it
- Pages are organized by user role (`admin/`, `artist/`, `venue/`)
- `client/src/components/ui/` contains shadcn/ui primitives — don't edit directly
- Custom hooks follow the `use-*.ts` naming convention
- Feature routes split into `server/routes/` modules, registered in `server/routes.ts`
