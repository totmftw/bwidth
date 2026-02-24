# Tech Stack & Build System

## Runtime & Language
- Node.js with TypeScript 5.6.3
- ES Modules ("type": "module" in package.json)

## Backend
- Express.js v5 (server/index.ts entry point)
- Drizzle ORM with PostgreSQL (pg driver)
- Passport.js with local strategy (session-based auth, not JWT)
- Session store: PostgreSQL via connect-pg-simple
- Password hashing: Node.js crypto.scrypt (not bcrypt)
- Zod for request/response validation
- WebSocket support via ws

## Frontend
- React 18 with TypeScript
- Vite 7 (build tool, dev server with HMR)
- Wouter for routing (not React Router)
- TanStack Query (React Query) for server state
- Radix UI + shadcn/ui component library
- Tailwind CSS for styling
- Framer Motion for animations
- React Hook Form + Zod for form validation
- Lucide React for icons

## Database
- PostgreSQL 14+
- Drizzle ORM for schema definition and queries
- Schema defined in shared/schema.ts
- Drizzle Kit for migrations
- Config: drizzle.config.ts

## Path Aliases
- @/* maps to client/src/*
- @shared/* maps to shared/*

## Common Commands
- npm run dev: Start dev server (Express + Vite, port 5000)
- npm run build: Production build (tsx script/build.ts)
- npm run start: Start production server
- npm run check: TypeScript type checking
- npm run db:push: Push schema changes to database (drizzle-kit push)
- npm run db:generate: Generate migration files
- npm run seed: Seed database with initial data (tsx script/seed.ts)

## Key Conventions
- Single server serves both API and client on port 5000
- API routes are under /api/ (no version prefix in current implementation)
- Auth endpoints: /api/register, /api/login, /api/logout, /api/user
- Drizzle-zod generates insert/select schemas from table definitions
- Shared route contracts defined in shared/routes.ts with Zod schemas
