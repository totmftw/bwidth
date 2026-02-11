# 🚀 Setup & Deployment Guide - Music Artist Management Platform

## Quick Setup (5 Minutes)

### Step 1: Verify Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check PostgreSQL is running
psql --version
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Backend: Express, Drizzle ORM, Passport.js
- Frontend: React, TanStack Query, Radix UI, Tailwind CSS

### Step 3: Verify Database Connection

Your `.env` file should already contain:
```
DATABASE_URL=postgresql://user:password@host:5432/database_name
```

Test the connection:
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# If successful, you'll see the psql prompt
# Type \q to exit
```

### Step 4: Push Database Schema

This creates all tables, enums, and relationships:

```bash
npx drizzle-kit push
```

**What this does:**
- Creates 50+ tables from the comprehensive schema
- Sets up 14 custom ENUM types
- Establishes all foreign key relationships
- Creates indexes for performance
- Sets up geography data (countries, states, cities)

You'll be prompted to confirm. Type `y` to proceed.

### Step 5: Seed Initial Data

```bash
npm run seed
```

**What gets seeded:**
- ✓ Currencies (INR, USD, EUR, GBP, AUD)
- ✓ Locales (en-IN, hi-IN, en-US, en-GB)
- ✓ Timezones (Asia/Kolkata, America/New_York, etc.)
- ✓ Geography (India, states, major cities)
- ✓ Roles (artist, organizer, venue_manager, admin, etc.)
- ✓ Music Genres (Techno, House, Trance, etc.)
- ✓ Admin user (email: admin@musicplatform.com, password: admin123)
- ✓ System settings (commission rates, negotiation rules, etc.)

### Step 6: Start Development Server

```bash
npm run dev
```

Application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

---

## Database Schema Overview

### Core Tables Created

#### User Management (7 tables)
- `users` - User accounts
- `roles` - Role definitions
- `user_roles` - User-role assignments
- `auth_providers` - OAuth/social login providers
- `organizations` - Companies/collectives
- `organization_members` - Org membership
- `user_sessions` - Active sessions

#### Geography (5 tables)
- `countries` - Country data
- `states` - States/provinces
- `cities` - Cities with coordinates
- `currencies` - Currency definitions
- `locales` - Language/locale settings
- `timezones` - Timezone data

#### Artists & Content (5 tables)
- `artists` - Artist profiles
- `artist_genres` - Genre associations
- `genres` - Music genre taxonomy
- `media` - Photos, videos, audio files
- `kyc_documents` - Verification documents

#### Venues & Promoters (3 tables)
- `venues` - Venue profiles
- `promoters` - Event promoters/organizers
- `equipment_inventory` - Venue equipment

#### Events & Bookings (5 tables)
- `events` - Event details
- `event_stages` - Multi-stage events
- `bookings` - Artist bookings
- `opportunities` - Open booking opportunities
- `applications` - Artist applications

#### Contracts & Payments (7 tables)
- `contracts` - Digital contracts
- `contract_templates` - Reusable templates
- `payments` - Payment transactions
- `payouts` - Artist payouts
- `invoices` - Tax invoices
- `escrow_accounts` - Escrow balances
- `commission_rules` - Platform commission

#### Trust & Reviews (4 tables)
- `trust_scores` - Current trust scores
- `trust_score_history` - Score changes
- `reviews` - User reviews
- `disputes` - Dispute cases

#### Communication (5 tables)
- `notifications` - In-app notifications
- `notification_preferences` - User preferences
- `conversations` - Message threads
- `conversation_participants` - Thread members
- `messages` - Individual messages

#### System (6 tables)
- `audit_logs` - Complete audit trail
- `system_settings` - Platform configuration
- `analytics_events` - Event tracking
- `search_index` - Full-text search
- `webhooks` - Webhook configurations
- `api_keys` - API key management

---

## Default Admin Access

After seeding, you can log in as admin:

```
Email: admin@musicplatform.com
Password: admin123
```

**⚠️ IMPORTANT**: Change this password immediately in production!

To change the admin password:

```sql
-- Connect to database
psql $DATABASE_URL

-- Update password (use bcrypt hash)
UPDATE users 
SET password_hash = crypt('new_password_here', gen_salt('bf', 12))
WHERE email = 'admin@musicplatform.com';
```

Or use the frontend password change feature after logging in.

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Session Secret (use a strong random string)
SESSION_SECRET=your-super-secret-key-change-this-in-production

# Environment
NODE_ENV=development
```

### Optional Variables (for full functionality)

```bash
# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1

# Email Service (SendGrid or AWS SES)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Music Platform

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Frontend URL
FRONTEND_URL=http://localhost:5000

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

Generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Verification Steps

### 1. Check Database Tables

```bash
psql $DATABASE_URL -c "\dt"
```

You should see 50+ tables listed.

### 2. Check Enums

```sql
SELECT t.typname as enum_name,
       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t 
   JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;
```

### 3. Verify Seed Data

```sql
-- Check roles
SELECT * FROM roles;

-- Check genres
SELECT * FROM genres ORDER BY name;

-- Check admin user
SELECT email, display_name, status FROM users WHERE email = 'admin@musicplatform.com';

-- Check geography
SELECT c.name as country, s.name as state, ci.name as city
FROM cities ci
JOIN states s ON ci.state_id = s.state_id
JOIN countries c ON s.country_id = c.country_id;
```

### 4. Test API

```bash
# Health check
curl http://localhost:5000/api/health

# Get current user (should return 401 when not logged in)
curl http://localhost:5000/api/auth/me
```

---

## Troubleshooting

### Issue: "drizzle-kit" is not recognized

**Solution**: Use npx
```bash
npx drizzle-kit push
```

### Issue: Database connection error

**Solution**: Check your DATABASE_URL format
```bash
# Correct format
DATABASE_URL=postgresql://username:password@host:port/database

# Example
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/music_booking_platform
```

### Issue: "relation already exists" error

**Solution**: Database already has tables. Either:
1. Drop the existing database and recreate:
```bash
dropdb music_booking_platform
createdb music_booking_platform
npx drizzle-kit push
```

2. Or use migrations instead of push:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Issue: bcrypt/bcryptjs not found in seed

**Solution**: Install bcryptjs
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### Issue: TypeScript errors in schema.ts

**Solution**: These are likely dev-time only. The code will work at runtime. To fix:
```bash
npm install --save-dev @types/node
```

---

## Next Steps

### 1. Customize System Settings

```sql
-- Update commission rate
UPDATE system_settings 
SET value = '{"default": 0.03, "min": 0.02, "max": 0.05}'::jsonb
WHERE key = 'platform.commission_rate';

-- Update negotiation rounds
UPDATE system_settings 
SET value = '{"value": 5}'::jsonb
WHERE key = 'booking.max_negotiation_rounds';
```

### 2. Add More Geography Data

Edit `script/seed.ts` and add more cities, states, or countries as needed.

### 3. Create Additional Admin Users

```sql
-- Create new admin user
INSERT INTO users (username, email, password_hash, display_name, status)
VALUES (
  'johndoe',
  'john@example.com',
  crypt('securepassword', gen_salt('bf', 12)),
  'John Doe',
  'active'
);

-- Assign admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'john@example.com' AND r.name = 'admin';
```

### 4. Configure Third-Party Services

- Set up Razorpay account for payments
- Configure AWS S3 for file storage
- Set up SendGrid/SES for emails
- Configure Twilio for SMS

### 5. Start Building Features

Check the documentation:
- `docs/API_DOCUMENTATION.md` - Build API endpoints
- `docs/TECHNICAL_SPECIFICATION.md` - Architecture reference
- `prereq/devGuide.md` - Detailed development guide
- `prereq/workflow.md` - Business logic flows

---

## Production Deployment

See `docs/DATABASE_MIGRATION_GUIDE.md` for production deployment checklist.

Key production steps:
1. Use strong SESSION_SECRET
2. Change admin password
3. Set NODE_ENV=production
4. Enable HTTPS
5. Configure proper CORS
6. Set up database backups
7. Configure monitoring
8. Set up error tracking (Sentry)

---

## Support

- **Documentation**: `/docs` directory
- **Requirements**: `/prereq` directory
- **Issues**: Create a GitHub issue
- **Questions**: Contact dev team

---

**Last Updated**: February 3, 2026  
**Version**: 1.0.0
