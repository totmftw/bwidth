# 🔧 Technical Specification - Music Artist Management Platform

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [Authentication & Authorization](#authentication--authorization)
5. [Security Measures](#security-measures)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Data Flow](#data-flow)
9. [Third-Party Integrations](#third-party-integrations)
10. [Deployment Architecture](#deployment-architecture)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
├──────────────────────────────────────────────────────────────┤
│  React SPA (Vite + TypeScript)                               │
│  - Component Library: Radix UI + shadcn/ui                   │
│  - State Management: TanStack Query                          │
│  - Form Validation: React Hook Form + Zod                   │
│  - Routing: Wouter                                           │
│  - Styling: Tailwind CSS v4                                  │
└──────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌──────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                           │
├──────────────────────────────────────────────────────────────┤
│  Express.js v5 (Node.js + TypeScript)                       │
│  - Session Management: express-session                       │
│  - Authentication: Passport.js (local strategy)              │
│  - ORM: Drizzle                                              │
│  - Schema Validation: Zod                                    │
│  - WebSocket: ws                                             │
└──────────────────────────────────────────────────────────────┘
                            ↕ TCP
┌──────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                        │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL 14+                                              │
│  - Session Store: connect-pg-simple                          │
│  - Connection Pooling: pg                                    │
│  - Migrations: Drizzle Kit                                   │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack Details

#### Frontend Stack
```typescript
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.6.3",
  "buildTool": "Vite 7.3.0",
  "routing": "Wouter 3.3.5",
  "stateManagement": "TanStack Query 5.60.5",
  "forms": "React Hook Form 7.55.0",
  "validation": "Zod 3.24.2",
  "ui": {
    "components": "Radix UI",
    "styling": "Tailwind CSS 4.x",
    "animations": "Framer Motion 11.18.2",
    "icons": "Lucide React 0.453.0"
  }
}
```

#### Backend Stack
```typescript
{
  "runtime": "Node.js",
  "framework": "Express 5.0.1",
  "language": "TypeScript 5.6.3",
  "orm": "Drizzle ORM 0.39.3",
  "database": "PostgreSQL",
  "authentication": {
    "strategy": "Passport.js 0.7.0",
    "method": "passport-local 1.0.0",
    "sessions": "express-session 1.18.1",
    "sessionStore": "connect-pg-simple 10.0.0"
  },
  "validation": "Zod 3.24.2 + drizzle-zod 0.7.0",
  "realtime": "ws 8.18.0"
}
```

### 1.3 Module Structure

```
src/
├── server/                 # Backend code
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route handlers
│   ├── storage.ts         # File storage utilities
│   ├── static.ts          # Static file serving
│   └── vite.ts            # Vite integration
│
├── client/                # Frontend code
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
│
├── shared/                # Shared code (types, utils)
│   └── schema/            # Drizzle schema definitions
│
└── script/                # Build scripts
    └── build.ts           # Production build script
```

---

## 2. Database Schema

### 2.1 Schema Overview

The database is designed with PostgreSQL and follows a relational model with strong data integrity. We use Drizzle ORM for type-safe database access.

### 2.2 Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    phone TEXT,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    gender gender,
    date_of_birth DATE,
    status user_status DEFAULT 'pending_verification',
    locale CHAR(5),
    currency CHAR(3) DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### Roles & Permissions
```sql
CREATE TYPE role_name AS ENUM (
    'artist',
    'band_manager',
    'promoter',
    'organizer',
    'venue_manager',
    'admin',
    'staff'
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name role_name NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
```

#### Artists Table
```sql
CREATE TABLE artists (
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
```

#### Venues Table
```sql
CREATE TABLE venues (
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

#### Bookings Table
```sql
CREATE TYPE booking_status AS ENUM (
    'inquiry',
    'offered',
    'negotiating',
    'confirmed',
    'paid_deposit',
    'scheduled',
    'completed',
    'cancelled',
    'disputed',
    'refunded'
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID REFERENCES artists(id),
    organizer_id UUID REFERENCES promoters(id),
    venue_id UUID REFERENCES venues(id),
    event_date DATE NOT NULL,
    slot_time TEXT,
    performance_duration INT, -- minutes
    status booking_status DEFAULT 'inquiry',
    budget NUMERIC(14, 2),
    currency CHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### Contracts Table
```sql
CREATE TYPE contract_status AS ENUM (
    'draft',
    'sent',
    'signed_by_promoter',
    'signed_by_artist',
    'signed',
    'voided',
    'completed'
);

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    contract_type TEXT NOT NULL,
    terms JSONB NOT NULL,
    status contract_status DEFAULT 'draft',
    artist_signature JSONB,
    artist_signed_at TIMESTAMPTZ,
    promoter_signature JSONB,
    promoter_signed_at TIMESTAMPTZ,
    contract_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Payments Table
```sql
CREATE TYPE payment_status AS ENUM (
    'initiated',
    'authorized',
    'captured',
    'failed',
    'refunded',
    'cancelled'
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    payer_id UUID REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    amount NUMERIC(14, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'INR',
    payment_type TEXT, -- 'deposit', 'milestone', 'final'
    status payment_status DEFAULT 'initiated',
    gateway TEXT,
    gateway_transaction_id TEXT,
    gateway_response JSONB,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);
```

### 2.3 Supporting Tables

#### Trust Scores
```sql
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'artist', 'organizer', 'venue'
    entity_id UUID NOT NULL,
    old_score NUMERIC(5, 2),
    new_score NUMERIC(5, 2),
    change_reason TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Geography
```sql
CREATE TABLE countries (
    country_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    iso2 CHAR(2),
    iso3 CHAR(3),
    currency_code CHAR(3)
);

CREATE TABLE states (
    state_id SERIAL PRIMARY KEY,
    country_id INT REFERENCES countries(country_id),
    name TEXT NOT NULL
);

CREATE TABLE cities (
    city_id SERIAL PRIMARY KEY,
    state_id INT REFERENCES states(state_id),
    name TEXT NOT NULL,
    lat FLOAT8,
    lon FLOAT8
);
```

### 2.4 Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- Artist searches
CREATE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_trust_score ON artists(trust_score);
CREATE INDEX idx_artists_budget ON artists(budget_min, budget_standard, budget_premium);

-- Booking queries
CREATE INDEX idx_bookings_artist_id ON bookings(artist_id);
CREATE INDEX idx_bookings_organizer_id ON bookings(organizer_id);
CREATE INDEX idx_bookings_venue_id ON bookings(venue_id);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Payment tracking
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Full-text search
CREATE INDEX idx_search_index_tsv ON search_index USING gin(tsv);
```

### 2.5 Triggers & Functions

```sql
-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (who, action, entity_type, entity_id, diff, context)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
            jsonb_build_object('ip', current_setting('app.client_ip', TRUE))
        );
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (who, action, entity_type, entity_id, diff, context)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW),
            jsonb_build_object('ip', current_setting('app.client_ip', TRUE))
        );
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (who, action, entity_type, entity_id, diff, context)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            jsonb_build_object('ip', current_setting('app.client_ip', TRUE))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

---

## 3. API Design

### 3.1 API Architecture

**Style**: RESTful API with JSON  
**Base URL**: `/api/v1`  
**Authentication**: Session-based with cookies  

### 3.2 API Endpoints

#### Authentication Endpoints

```typescript
POST   /api/auth/register        // Register new user
POST   /api/auth/login           // Login
POST   /api/auth/logout          // Logout
GET    /api/auth/me              // Get current user
POST   /api/auth/refresh-token   // Refresh session
POST   /api/auth/forgot-password // Request password reset
POST   /api/auth/reset-password  // Reset password
POST   /api/auth/verify-email    // Verify email
```

#### User Management

```typescript
GET    /api/users                // List users (admin only)
GET    /api/users/:id            // Get user by ID
PATCH  /api/users/:id            // Update user
DELETE /api/users/:id            // Delete user (soft delete)
POST   /api/users/:id/roles      // Assign role
DELETE /api/users/:id/roles/:roleId // Remove role
```

#### Artist Profile

```typescript
GET    /api/artists              // List artists (with filters)
POST   /api/artists              // Create artist profile
GET    /api/artists/:id          // Get artist profile
PATCH  /api/artists/:id          // Update artist profile
DELETE /api/artists/:id          // Delete artist profile
GET    /api/artists/:id/portfolio // Get portfolio
POST   /api/artists/:id/portfolio // Upload portfolio item
GET    /api/artists/:id/bookings  // Get artist bookings
GET    /api/artists/:id/earnings  // Get earnings stats
```

#### Venue Management

```typescript
GET    /api/venues               // List venues
POST   /api/venues               // Create venue
GET    /api/venues/:id           // Get venue details
PATCH  /api/venues/:id           // Update venue
DELETE /api/venues/:id           // Delete venue
GET    /api/venues/:id/events    // Get venue events
POST   /api/venues/:id/programming // Request programming
```

#### Booking Workflow

```typescript
GET    /api/opportunities        // Browse available opportunities
POST   /api/opportunities        // Create opportunity (organizer)
GET    /api/opportunities/:id    // Get opportunity details
PATCH  /api/opportunities/:id    // Update opportunity
DELETE /api/opportunities/:id    // Delete opportunity

POST   /api/applications         // Apply to opportunity
GET    /api/applications/:id     // Get application details
PATCH  /api/applications/:id     // Update application
DELETE /api/applications/:id     // Withdraw application

POST   /api/bookings             // Create booking
GET    /api/bookings/:id         // Get booking details
PATCH  /api/bookings/:id         // Update booking
DELETE /api/bookings/:id         // Cancel booking
GET    /api/bookings/:id/timeline // Get booking timeline
```

#### Negotiation

```typescript
POST   /api/negotiations         // Start negotiation
GET    /api/negotiations/:id     // Get negotiation thread
POST   /api/negotiations/:id/offer // Make counter-offer
POST   /api/negotiations/:id/accept // Accept offer
POST   /api/negotiations/:id/decline // Decline offer
```

#### Contracts

```typescript
POST   /api/contracts            // Generate contract
GET    /api/contracts/:id        // Get contract
POST   /api/contracts/:id/sign   // Sign contract
GET    /api/contracts/:id/pdf    // Download PDF
POST   /api/contracts/:id/void   // Void contract
```

#### Payments

```typescript
POST   /api/payments             // Initiate payment
GET    /api/payments/:id         // Get payment status
POST   /api/payments/:id/confirm  // Confirm payment
POST   /api/payments/:id/refund   // Request refund
GET    /api/payments/webhooks    // Payment gateway webhook
```

#### Search & Discovery

```typescript
GET    /api/search               // Global search
GET    /api/search/artists       // Search artists
GET    /api/search/venues        // Search venues
GET    /api/search/events        // Search events
```

### 3.3 Request/Response Format

#### Standard Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2026-02-03T13:56:47+05:30"
}
```

#### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-02-03T13:56:47+05:30"
}
```

#### Pagination
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### 3.4 Status Codes

```
200 - OK                    // Success
201 - Created               // Resource created
204 - No Content            // Success with no response body
400 - Bad Request           // Invalid input
401 - Unauthorized          // Not authenticated
403 - Forbidden             // Not authorized
404 - Not Found             // Resource doesn't exist
409 - Conflict              // Duplicate or state conflict
422 - Unprocessable Entity  // Validation error
429 - Too Many Requests     // Rate limit exceeded
500 - Internal Server Error // Server error
503 - Service Unavailable   // Temporary outage
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Strategy

**Method**: Session-based authentication using Passport.js  
**Session Store**: PostgreSQL via connect-pg-simple  
**Password Hashing**: bcrypt (12 rounds)

### 4.2 Authentication Flow

```typescript
// Registration
1. User submits email, password, phone, role
2. Server validates input (Zod schema)
3. Check if email/phone already exists
4. Hash password with bcrypt
5. Create user record with status='pending_verification'
6. Send verification email/SMS
7. Return success (no auto-login)

// Email/Phone Verification
1. User clicks link or enters OTP
2. Server validates token/OTP
3. Update user status to 'active'
4. Send welcome email
5. Redirect to login

// Login
1. User submits email/username and password
2. Passport.js local strategy authenticates
3. Check password hash with bcrypt.compare()
4. Create session in PostgreSQL
5. Set session cookie (httpOnly, secure, sameSite)
6. Return user profile

// Logout
1. Client sends logout request
2. Destroy session from PostgreSQL
3. Clear session cookie
4. Return success
```

### 4.3 Session Configuration

```typescript
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PGStore({
    pool: pgPool,
    tableName: 'sessions',
    pruneSessionInterval: 60 * 15 // 15 minutes
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}
```

### 4.4 Role-Based Access Control (RBAC)

```typescript
enum Role {
  ARTIST = 'artist',
  BAND_MANAGER = 'band_manager',
  PROMOTER = 'promoter',
  ORGANIZER = 'organizer',
  VENUE_MANAGER = 'venue_manager',
  ADMIN = 'admin',
  STAFF = 'staff'
}

// Middleware example
function requireRole(roles: Role[]) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRoles = req.user.roles.map(r => r.name);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage
router.get('/admin/users', requireRole([Role.ADMIN]), async (req, res) => {
  // Only admins can access
});
```

### 4.5 API Authentication

All API requests (except public endpoints) require:
1. Valid session cookie
2. User must be authenticated (`req.isAuthenticated()`)
3. User must have required role(s) for endpoint

---

## 5. Security Measures

### 5.1 Password Security
- **Hashing**: bcrypt with 12 salt rounds
- **Minimum length**: 8 characters
- **Requirements**: At least one uppercase, lowercase, number
- **No password reuse**: Check against previous 5 passwords
- **Password reset tokens**: UUID v4, expires in 1 hour

### 5.2 Session Security
- **HttpOnly cookies**: Prevent XSS access to cookies
- **Secure flag**: HTTPS only in production
- **SameSite=lax**: CSRF protection
- **Session rotation**: New session ID after login
- **Absolute timeout**: 7 days
- **Idle timeout**: 30 minutes of inactivity

### 5.3 Input Validation
- **All inputs validated**: Using Zod schemas
- **SQL injection prevention**: Parameterized queries via Drizzle ORM
- **XSS prevention**: Input sanitization, Content Security Policy
- **File upload validation**: Type, size, virus scanning

### 5.4 Rate Limiting
```typescript
// Login endpoint: 5 attempts per 15 minutes per IP
// API endpoints: 100 requests per 15 minutes per user
// Public endpoints: 1000 requests per hour per IP
```

### 5.5 CORS Configuration
```typescript
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### 5.6 Content Security Policy
```typescript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"]
}
```

### 5.7 Data Encryption
- **In transit**: TLS 1.3
- **At rest**: Database-level encryption (PostgreSQL pgcrypto)
- **Sensitive fields**: PAN, Aadhar, bank details encrypted
- **Encryption key**: Stored in environment variables, rotated quarterly

---

## 6. Performance Optimization

### 6.1 Database Optimization
- **Connection pooling**: pg pool with max 20 connections
- **Indexes**: Strategic indexes on frequently queried fields
- **Query optimization**: Use EXPLAIN ANALYZE for slow queries
- **Caching**: Redis for session store (optional upgrade from PostgreSQL)

### 6.2 Frontend Optimization
- **Code splitting**: Lazy loading with React.lazy()
- **Bundle size**: Tree shaking, minification
- **Asset optimization**: Image optimization, lazy loading images
- **Caching strategy**: Service workers, cache-first for assets

### 6.3 API Response Optimization
- **Pagination**: Default 20 items per page, max 100
- **Field filtering**: Client can specify which fields to return
- **Response compression**: gzip/brotli
- **ETags**: Conditional requests for unchanged resources

---

## 7. Error Handling

### 7.1 Error Categories

```typescript
enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

### 7.2 Error Logging
- **Winston logger**: Structured JSON logging
- **Log levels**: error, warn, info, debug
- **Error tracking**: Sentry integration (optional)
- **Log retention**: 30 days

---

## 8. Data Flow

### 8.1 Booking Workflow Data Flow

```mermaid
sequenceDiagram
    Artist->>Frontend: Browse opportunities
    Frontend->>API: GET /api/opportunities?filters
    API->>Database: Query opportunities
    Database-->>API: Return results
    API-->>Frontend: Paginated opportunities
    Frontend-->>Artist: Display list
    
    Artist->>Frontend: Apply to opportunity
    Frontend->>API: POST /api/applications
    API->>Database: Create application
    Database-->>API: Confirm creation
    API->>Notification: Send notification to organizer
    API-->>Frontend: Success response
    Frontend-->>Artist: Confirmation message
    
    Organizer->>Frontend: Review applications
    Frontend->>API: GET /api/applications?opportunityId
    API->>Database: Fetch applications
    Database-->>API: Return applications
    API-->>Frontend: Application list
    Frontend-->>Organizer: Display applications
    
    Organizer->>Frontend: Accept application
    Frontend->>API: POST /api/negotiations
    API->>Database: Create negotiation
    Database-->>API: Confirm
    API->>ContractService: Generate contract
    ContractService-->>API: Contract created
    API-->>Frontend: Contract ready
    Frontend-->>Organizer: Show contract
```

---

## 9. Third-Party Integrations

### 9.1 Payment Gateway Integration
- **Provider**: Razorpay (primary), Stripe (international)
- **Webhooks**: Listen for payment events
- **Reconciliation**: Daily automated reconciliation
- **Refunds**: Automated refund processing

### 9.2 Email Service
- **Provider**: SendGrid or AWS SES
- **Templates**: HTML email templates
- **Tracking**: Open rates, click rates
- **Bounce handling**: Automatic email validation

### 9.3 SMS Service
- **Provider**: Twilio or AWS SNS
- **OTP delivery**: 6-digit codes, 10-minute expiry
- **Delivery tracking**: Success/failure logging

### 9.4 File Storage
- **Provider**: AWS S3 or Cloudinary
- **Assets**: Profile photos, portfolio images, contracts
- **CDN**: CloudFront for fast delivery
- **Access control**: Signed URLs for private files

---

## 10. Deployment Architecture

### 10.1 Hosting Infrastructure
- **Application server**: Replit (development), AWS EC2/ECS (production)
- **Database**: AWS RDS PostgreSQL or managed PostgreSQL
- **File storage**: AWS S3
- **CDN**: CloudFront

### 10.2 Environment Configuration
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<secure-random-string>
FRONTEND_URL=https://app.musicplatform.com
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=<bucket-name>
```

### 10.3 CI/CD Pipeline
1. **Code push**: Git push to main branch
2. **Tests**: Run unit tests, integration tests
3. **Build**: TypeScript compilation, Vite build
4. **Deploy**: Deploy to staging environment
5. **Smoke tests**: Automated smoke tests
6. **Production deploy**: Manual approval, then deploy
7. **Health check**: Verify application is running

### 10.4 Monitoring
- **Application monitoring**: PM2 or AWS CloudWatch
- **Database monitoring**: PostgreSQL logs, slow query log
- **Error tracking**: Sentry
- **Uptime monitoring**: UptimeRobot or Pingdom
- **Performance**: New Relic or DataDog

---

**Last Updated**: February 3, 2026  
**Document Version**: 1.0.0  
**Author**: Development Team
