# 🎵 Music Artist Management Platform

A curator-led booking system that manages artist bookings, venues, contracts, and payments for the music industry. Built on trust, data intelligence, and professional workflows.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd z
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   The `.env` file should already contain your `DATABASE_URL`. If not, create one:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/music_booking_platform
   SESSION_SECRET=your-super-secret-session-key
   ```

4. **Push database schema**
   ```bash
   npx drizzle-kit push
   ```
   
   This will create all tables, enums, and relationships in your PostgreSQL database based on the comprehensive schema from `existingDB.sql`.

5. **Seed initial data** (optional)
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## 📁 Project Structure

```
z/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
│   └── public/          # Static assets
│
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── auth.ts          # Authentication
│   ├── db.ts            # Database connection
│   └── storage.ts       # File storage
│
├── shared/              # Shared code
│   ├── schema.ts        # Drizzle schema (comprehensive)
│   └── routes.ts        # Shared types
│
├── docs/                # Documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── TECHNICAL_SPECIFICATION.md
│   ├── API_DOCUMENTATION.md
│   └── DATABASE_MIGRATION_GUIDE.md
│
├── prereq/              # Requirements & reference
│   ├── existingDB.sql   # Comprehensive PostgreSQL schema
│   ├── appInfo.md       # Feature specifications
│   ├── devGuide.md      # Developer guide
│   ├── workflow.md      # Workflow logic
│   └── userJourney.md   # User journeys
│
└── migrations/          # Database migrations (generated)
```

## 🎯 Core Features

### For Artists
- Profile management with portfolio
- Gig discovery with smart matching
- Application submission
- Negotiation workflow
- Contract signing
- Payment tracking
- Trust score system

### For Organizers/Venues
- Artist search and discovery
- Booking management
- Contract generation
- Payment processing
- Venue programming (3-6 month calendars)
- Trust score tracking

### For Admins
- User management
- Platform analytics
- Dispute resolution
- System configuration

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **50+ tables** covering all aspects of the booking workflow
- **14 custom ENUM types** for type safety
- **Geography tables** (countries, states, cities)
- **Complete audit logging**
- **Trust score tracking**
- **Full-text search** capabilities

Key tables:
- `users`, `roles`, `user_roles`
- `artists`, `venues`, `promoters`
- `events`, `event_stages`
- `bookings`, `contracts`, `payments`
- `negotiations`, `disputes`
- `media`, `notifications`, `messages`

See `docs/TECHNICAL_SPECIFICATION.md` for complete schema documentation.

## 🔐 Authentication

The platform uses **session-based authentication** with:
- Passport.js local strategy
- PostgreSQL session store
- bcrypt password hashing
- Role-based access control (RBAC)

Roles: `artist`, `band_manager`, `promoter`, `organizer`, `venue_manager`, `admin`, `staff`

## 🛣️ API Routes

All API endpoints are prefixed with `/api/v1`:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Artists
- `GET /api/artists` - List artists
- `POST /api/artists` - Create artist profile
- `GET /api/artists/:id` - Get artist details
- `PATCH /api/artists/:id` - Update artist
- `GET /api/artists/:id/bookings` - Get artist bookings

### Bookings
- `GET /api/opportunities` - Browse opportunities
- `POST /api/applications` - Apply to opportunity
- `GET /api/bookings/:id` - Get booking details
- `POST /api/negotiations` - Start negotiation
- `POST /api/contracts/:id/sign` - Sign contract

See `docs/API_DOCUMENTATION.md` for complete API reference.

## 📊 Available Scripts

```bash
# Development
npm run dev              # Start dev server (frontend + backend)
npm run check            # TypeScript type checking

# Database
npm run db:push          # Push schema to database
npm run db:generate      # Generate migrations
npm run seed             # Seed initial data

# Production
npm run build            # Build for production
npm start                # Start production server
```

## 🧪 Development Workflow

1. **Make schema changes** in `shared/schema.ts`
2. **Push to database**: `npm run db:push`
3. **Update API routes** in `server/routes.ts`
4. **Update frontend** in `client/src/`
5. **Test** your changes
6. **Commit** and push

## 📚 Documentation

Complete documentation is available in the `docs/` directory:

- **[PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** - Vision, features, roadmap
- **[TECHNICAL_SPECIFICATION.md](docs/TECHNICAL_SPECIFICATION.md)** - Architecture, database, security
- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md)** - Migration instructions

## 🌟 Key Workflows

### Artist Registration & Onboarding
1. User signs up with email/phone
2. Email verification
3. Profile setup (5 steps)
4. Admin approval
5. Trust score initialized at 50
6. Ready to browse opportunities

### Booking Workflow
1. **Discovery**: Artist browses opportunities
2. **Application**: Artist applies with proposed fee
3. **Negotiation**: Max 3 rounds, time-bound
4. **Contract**: Auto-generated, digital signature
5. **Payment**: Milestone-based (deposit → pre-event → final)
6. **Execution**: Checklist-driven
7. **Completion**: Feedback & trust score update

### Contract Generation
- 90% pre-filled templates
- 4 contract types based on trust scores and booking type
- Slot time protection clauses
- Cancellation policies with penalties
- Digital signature workflow (48-hour window)

## 🔒 Security Features

- **Password Security**: bcrypt with 12 rounds
- **Session Security**: HttpOnly cookies, CSRF protection
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **Rate Limiting**: Configurable per endpoint
- **Audit Logging**: All critical actions logged

## 🚢 Deployment

### Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<random-secret-key>
FRONTEND_URL=https://yourdomain.com
```

Optional (for full functionality):
```bash
RAZORPAY_KEY_ID=<your-key>
RAZORPAY_KEY_SECRET=<your-secret>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=<bucket-name>
SMTP_HOST=smtp.example.com
SMTP_USER=<email>
SMTP_PASSWORD=<password>
```

### Production Build

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

For issues or questions:
- Check documentation in `docs/`
- Review `prereq/` folder for specifications
- Contact: support@musicplatform.com

## 📝 License

MIT License - See LICENSE file for details

---

**Built with**: React, Express, PostgreSQL, Drizzle ORM, TypeScript, Tailwind CSS

**Version**: 1.0.0  
**Last Updated**: February 3, 2026
