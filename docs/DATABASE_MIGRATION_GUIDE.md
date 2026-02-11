# 🔄 Database Migration Guide

## Overview

This guide provides step-by-step instructions for migrating the Music Artist Management Platform to use the comprehensive PostgreSQL schema defined in `existingDB.sql`.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Migration Strategy](#migration-strategy)
3. [Backup Current Database](#backup-current-database)
4. [Schema Comparison](#schema-comparison)
5. [Migration Steps](#migration-steps)
6. [Data Migration](#data-migration)
7. [Verification](#verification)
8. [Rollback Plan](#rollback-plan)
9. [Post-Migration Tasks](#post-migration-tasks)

---

## Prerequisites

### Required Tools
- PostgreSQL 14+in
- pg_dump / pg_restore
- Drizzle Kit
- Node.js environment

### Access Requirements
- Database admin credentials
- Write access to database
- Backup storage location

---

## Migration Strategy

### Approach: Blue-Green  Deployment

1. **Current State** (Blue): Existing Drizzle schema
2. **Target State** (Green): Comprehensive PostgreSQL schema from `existingDB.sql`
3. **Migration Path**: Incremental with data preservation

### Timeline
- **Preparation**: 1-2 hours
- **Migration Execution**: 2-4 hours
- **Verification**: 1-2 hours
- **Total**: ~6-8 hours

---

## Backup Current Database

### Step 1: Create Full Backup

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup entire database
pg_dump -h localhost -U postgres -d music_booking_platform \
  -F c -b -v -f "backups/$(date +%Y%m%d)/full_backup.dump"

# Backup schema only
pg_dump -h localhost -U postgres -d music_booking_platform \
  --schema-only -f "backups/$(date +%Y%m%d)/schema_only.sql"

# Backup data only
pg_dump -h localhost -U postgres -d music_booking_platform \
  --data-only -f "backups/$(date +%Y%m%d)/data_only.sql"
```

### Step 2: Verify Backup

```bash
# Check backup file size
ls -lh backups/$(date +%Y%m%d)/

# Test restore to temporary database
createdb -U postgres music_booking_platform_test
pg_restore -h localhost -U postgres -d music_booking_platform_test \
  "backups/$(date +%Y%m%d)/full_backup.dump"

# Verify table count
psql -U postgres -d music_booking_platform_test -c "\\dt"

# Drop test database
dropdb -U postgres music_booking_platform_test
```

---

## Schema Comparison

### Tables to Add

The comprehensive schema includes many tables not in the current Drizzle schema:

#### Core Tables (Already Exist - Need Review)
- users
- roles
- user_roles

#### New Tables to Create
1. **Geography**
   - countries
   - states
   - cities
   - timezones
   - locales
   - currencies

2. **Artists & Venues**
   - artists
   - artist_genres
   - venues
   - venue_amenities
   - promoters
   - organizations

3. **Booking System**
   - opportunities
   - applications
   - bookings
   - negotiations
   - negotiation_rounds

4. **Contracts & Payments**
   - contracts
   - contract_templates
   - payments
   - payouts
   - invoices
   - commission_rules

5. **Trust & Reviews**
   - trust_scores
   - trust_score_history
   - reviews
   - disputes

6. **Communication**
   - conversations
   - conversation_participants
   - messages
   - notifications
   - notification_preferences

7. **Media & Files**
   - media
   - kyc_documents
   - equipment_inventories

8. **System**
   - audit_logs
   - analytics_events
   - search_index
   - tags
   - entity_tags
   - feature_flags
   - system_settings
   - webhooks
   - api_keys
   - auth_providers
   - favorites

### Enums to Create

```sql
CREATE TYPE booking_status AS ENUM (
    'inquiry', 'offered', 'negotiating', 'confirmed',
    'paid_deposit', 'scheduled', 'completed',
    'cancelled', 'disputed', 'refunded'
);

CREATE TYPE contract_status AS ENUM (
    'draft', 'sent', 'signed_by_promoter',
    'signed_by_artist', 'signed', 'voided', 'completed'
);

CREATE TYPE dispute_status AS ENUM (
    'open', 'investigating', 'resolved_refund',
    'resolved_no_refund', 'escalated'
);

CREATE TYPE gender AS ENUM (
    'male', 'female', 'other', 'prefer_not_say'
);

CREATE TYPE gst_registration_type AS ENUM (
    'registered', 'unregistered', 'composition', 'none'
);

CREATE TYPE invoice_status AS ENUM (
    'draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'
);

CREATE TYPE media_type AS ENUM (
    'image', 'audio', 'video', 'document', 'other'
);

CREATE TYPE notification_channel AS ENUM (
    'in_app', 'email', 'sms', 'push'
);

CREATE TYPE payment_status AS ENUM (
    'initiated', 'authorized', 'captured', 'failed', 'refunded', 'cancelled'
);

CREATE TYPE payout_status AS ENUM (
    'queued', 'processing', 'paid', 'failed', 'cancelled'
);

CREATE TYPE role_name AS ENUM (
    'artist', 'band_manager', 'promoter',
    'organizer', 'venue_manager', 'admin', 'staff'
);

CREATE TYPE search_entity AS ENUM (
    'artist', 'venue', 'event', 'promoter', 'organizer'
);

CREATE TYPE ticket_type AS ENUM (
    'general', 'vip', 'reserved', 'earlybird', 'guestlist'
);

CREATE TYPE user_status AS ENUM (
    'active', 'suspended', 'deleted', 'pending_verification'
);
```

---

## Migration Steps

### Phase 1: Create New Schema in Separate Schema

```sql
-- Create migration schema
CREATE SCHEMA migration;

-- Set search path
SET search_path TO migration, public;
```

### Phase 2: Execute existingDB.sql

```bash
# Apply the comprehensive schema to migration schema
psql -U postgres -d music_booking_platform -f prereq/existingDB.sql
```

### Phase 3: Create Migration Scripts

Create individual migration files in `migrations/` directory:

#### migrations/001_add_enums.sql
```sql
-- Add new enum types
CREATE TYPE public.booking_status AS ENUM (
    'inquiry', 'offered', 'negotiating', 'confirmed',
    'paid_deposit', 'scheduled', 'completed',
    'cancelled', 'disputed', 'refunded'
);
-- ... (other enums)
```

#### migrations/002_add_geography_tables.sql
```sql
-- Create geography tables
CREATE TABLE public.countries (
    country_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    iso2 CHAR(2),
    iso3 CHAR(3),
    currency_code CHAR(3)
);

-- Insert default data
INSERT INTO countries (name, iso2, iso3, currency_code) VALUES
('India', 'IN', 'IND', 'INR'),
('United States', 'US', 'USA', 'USD');

-- ... (states, cities)
```

#### migrations/003_add_artist_tables.sql
```sql
CREATE TABLE public.artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,
    bio TEXT,
    years_experience INT,
    budget_min NUMERIC(12, 2),
    budget_standard NUMERIC(12, 2),
    budget_premium NUMERIC(12, 2),
    trust_score NUMERIC(5, 2) DEFAULT 50.00,
    profile_photo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_trust_score ON artists(trust_score);
```

#### migrations/004_add_venue_tables.sql
```sql
CREATE TABLE public.venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    capacity INT,
    venue_type TEXT,
    city_id INT REFERENCES cities(city_id),
    address JSONB,
    amenities JSONB,
    technical_specs JSONB,
    photos JSONB,
    trust_score NUMERIC(5, 2) DEFAULT 50.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### migrations/005_add_booking_tables.sql
```sql
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID REFERENCES artists(id),
    organizer_id UUID REFERENCES promoters(id),
    venue_id UUID REFERENCES venues(id),
    event_date DATE NOT NULL,
    slot_time TEXT,
    performance_duration INT,
    status booking_status DEFAULT 'inquiry',
    budget NUMERIC(14, 2),
    currency CHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bookings_artist_id ON bookings(artist_id);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_status ON bookings(status);
```

### Phase 4: Run Migrations Sequentially

```bash
# Run each migration in order
for migration in migrations/*.sql; do
  echo "Running $migration..."
  psql -U postgres -d music_booking_platform -f "$migration"
  if [ $? -eq 0 ]; then
    echo "✓ $migration completed successfully"
  else
    echo "✗ $migration failed - stopping"
    exit 1
  fi
done
```

---

## Data Migration

### Migrate Existing User Data

```sql
-- If you have existing users in old schema
-- Map them to new schema structure

INSERT INTO public.users (
    id, username, email, password_hash, phone,
    display_name, first_name, last_name,
    status, created_at, updated_at
)
SELECT 
    id, username, email, password, phone,
    display_name, first_name, last_name,
    CASE 
        WHEN email_verified THEN 'active'::user_status
        ELSE 'pending_verification'::user_status
    END as status,
    created_at, updated_at
FROM old_schema.users
ON CONFLICT (id) DO NOTHING;
```

### Create Default Roles

```sql
-- Insert standard roles
INSERT INTO roles (name, description) VALUES
('artist', 'Artist or DJ performing at events'),
('band_manager', 'Manager representing artists'),
('promoter', 'Event promoter'),
('organizer', 'Event organizer'),
('venue_manager', 'Venue or club manager'),
('admin', 'Platform administrator'),
('staff', 'Platform staff member')
ON CONFLICT (name) DO NOTHING;
```

### Seed Geography Data

```sql
-- Insert Indian states
INSERT INTO states (country_id, name) VALUES
((SELECT country_id FROM countries WHERE iso2 = 'IN'), 'Karnataka'),
((SELECT country_id FROM countries WHERE iso2 = 'IN'), 'Maharashtra'),
((SELECT country_id FROM countries WHERE iso2 = 'IN'), 'Delhi');

-- Insert cities
INSERT INTO cities (state_id, name, lat, lon) VALUES
((SELECT state_id FROM states WHERE name = 'Karnataka'), 'Bangalore', 12.9716, 77.5946),
((SELECT state_id FROM states WHERE name = 'Maharashtra'), 'Mumbai', 19.0760, 72.8777),
((SELECT state_id FROM states WHERE name = 'Delhi'), 'New Delhi', 28.6139, 77.2090);
```

### Seed Currencies and Locales

```sql
-- Insert currencies
INSERT INTO currencies (currency_code, name, symbol, precision) VALUES
('INR', 'Indian Rupee', '₹', 2),
('USD', 'US Dollar', '$', 2),
('EUR', 'Euro', '€', 2)
ON CONFLICT (currency_code) DO NOTHING;

-- Insert locales
INSERT INTO locales (locale_code, display_name) VALUES
('en-IN', 'English (India)'),
('hi-IN', 'Hindi (India)'),
('en-US', 'English (United States)')
ON CONFLICT (locale_code) DO NOTHING;

-- Insert timezones
INSERT INTO timezones (tz_name) VALUES
('Asia/Kolkata'),
('America/New_York'),
('Europe/London')
ON CONFLICT (tz_name) DO NOTHING;
```

---

## Verification

### Step 1: Check Table Creation

```sql
-- List all tables
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count tables (should be ~50+)
SELECT COUNT(*) as table_count 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Step 2: Verify Enums

```sql
-- List all enum types
SELECT t.typname as enum_name,
       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t 
   JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;
```

### Step 3: Check Indexes

```sql
-- List all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Step 4: Verify Foreign Keys

```sql
-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### Step 5: Test Data Integrity

```sql
-- Check for orphaned records
SELECT 'artists' as table_name, COUNT(*) as orphaned_count
FROM artists a
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id)

UNION ALL

SELECT 'venues', COUNT(*)
FROM venues v
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = v.user_id);
```

---

## Rollback Plan

### Option 1: Restore from Backup

```bash
# Drop current database
dropdb -U postgres music_booking_platform

# Restore from backup
createdb -U postgres music_booking_platform
pg_restore -U postgres -d music_booking_platform \
  "backups/$(date +%Y%m%d)/full_backup.dump"
```

### Option 2: Undo Migrations

Create rollback scripts for each migration:

#### rollback/001_drop_enums.sql
```sql
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS contract_status CASCADE;
-- ... (all enums)
```

#### rollback/002_drop_tables.sql
```sql
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
-- ... (all new tables)
```

---

## Post-Migration Tasks

### 1. Update Drizzle Schema

Update your Drizzle schema files to match the new PostgreSQL schema:

```typescript
// shared/schema/users.ts
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'deleted',
  'pending_verification'
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  displayName: text('display_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  status: userStatusEnum('status').default('pending_verification'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2. Update Server Code

Update server routes and controllers to work with new schema:

```typescript
// server/routes.ts
import { db } from './db';
import { users, artists, bookings } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Example: Get artist profile
app.get('/api/artists/:id', async (req, res) => {
  const artist = await db
    .select()
    .from(artists)
    .where(eq(artists.id, req.params.id))
    .leftJoin(users, eq(artists.userId, users.id))
    .limit(1);
    
  if (!artist.length) {
    return res.status(404).json({ error: 'Artist not found' });
  }
  
  res.json({ success: true, data: artist[0] });
});
```

### 3. Update Frontend Queries

Update React Query hooks to match new API structure:

```typescript
// client/src/hooks/useArtists.ts
import { useQuery } from '@tanstack/react-query';

export function useArtistProfile(artistId: string) {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      const res = await fetch(`/api/artists/${artistId}`);
      if (!res.ok) throw new Error('Failed to fetch artist');
      return res.json();
    }
  });
}
```

### 4. Run Drizzle Kit

Generate types and sync with database:

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# OR apply migrations
npm run db:migrate
```

### 5. Seed Initial Data

```bash
# Run seed script
node scripts/seed.js
```

Example seed script:

```javascript
// scripts/seed.js
import { db } from '../server/db.js';
import { roles, users, genres } from '../shared/schema.js';

async function seed() {
  console.log('Seeding database...');
  
  // Insert roles
  await db.insert(roles).values([
    { name: 'artist', description: 'Artist or DJ' },
    { name: 'organizer', description: 'Event organizer' },
    { name: 'venue_manager', description: 'Venue manager' },
    { name: 'admin', description: 'Platform admin' },
  ]);
  
  // Insert genres
  await db.insert(genres).values([
    { name: 'Techno', slug: 'techno' },
    { name: 'House', slug: 'house' },
    { name: 'Trance', slug: 'trance' },
  ]);
  
  console.log('✓ Seeding complete');
}

seed().catch(console.error);
```

### 6. Update Environment Variables

Add new environment variables if needed:

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/music_booking_platform
SESSION_SECRET=your-session-secret
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### 7. Test Application

1. Start development server
2. Test all major workflows:
   - User registration & login
   - Artist profile creation
   - Opportunity browsing
   - Application submission
   - Booking creation
   - Contract generation
   - Payment flow

### 8. Monitor and Log

Set up monitoring for:
- Database query performance
- API response times
- Error rates
- User activity

---

## Troubleshooting

### Common Issues

#### Issue: Enum type already exists
```sql
-- Solution: Drop and recreate
DROP TYPE IF EXISTS booking_status CASCADE;
CREATE TYPE booking_status AS ENUM (...);
```

#### Issue: Foreign key constraint fails
```sql
-- Solution: Check referenced table exists and has data
SELECT * FROM users WHERE id = 'problematic-uuid';
```

#### Issue: Migration script fails midway
```sql
-- Solution: Use transactions
BEGIN;
  -- migration steps
COMMIT;
-- Or ROLLBACK if error
```

---

## Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] Backup verified and tested
- [ ] Migration scripts prepared
- [ ] Rollback plan documented
- [ ] Team notified

### During Migration
- [ ] Run migrations in order
- [ ] Verify each step
- [ ] Log all actions
- [ ] Monitor for errors

### Post-Migration
- [ ] All tables created
- [ ] Indexes created
- [ ] Foreign keys established
- [ ] Data migrated correctly
- [ ] Drizzle schema updated
- [ ] Server code updated
- [ ] Frontend updated
- [ ] Application tested
- [ ] Monitoring enabled

---

**Last Updated**: February 3, 2026  
**Document Version**: 1.0.0  
**Author**: Development Team
