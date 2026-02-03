The Complete Developer's Guide: Building the Music Artist Management Platform

# 📖 The Complete Developer's Guide

## Building the Music Artist Management Platform from Scratch

<aside>
🎯

**Welcome, Developer!** This guide will take you on a journey from zero to a fully functional music artist management platform. Think of this as your storybook companion—we'll build this together, one chapter at a time, with no ambiguity and complete clarity.

</aside>

---

## 🗺️ The Journey Ahead

Before we write a single line of code, let's understand the adventure we're embarking on.

### What We're Building

A **curator-led booking system** that connects:

- **Artists/DJs** who want to find gigs
- **Organizers/Promoters** who need talent for events
- **Venues/Clubs** who want consistent programming

### Our Technology Stack: PERN

- **P**ostgreSQL - Our robust, relational database
- **E**xpress.js - Our backend framework for REST APIs
- **R**eact.js - Our frontend library for beautiful UIs
- **N**ode.js - Our runtime environment

### Key Technical Requirements

- 🔐 Heavy-duty encryption (AES-256, bcrypt, JWT)
- 👥 Multi-user, multi-role authentication
- 🛡️ Robust middleware for security
- 📡 RESTful API architecture
- 🏗️ Scalable, maintainable codebase

---

## 📑 Table of Contents

### Part 1: Foundation (Chapters 1-4)

1. **Chapter 1:** Project Setup & Architecture
2. **Chapter 2:** Database Design & PostgreSQL Setup
3. **Chapter 3:** Authentication & Authorization System
4. **Chapter 4:** Core Middleware & Security Layer

### Part 2: Core Features (Chapters 5-10)

1. **Chapter 5:** User Management (Artists, Organizers, Venues)
2. **Chapter 6:** Profile & Verification System
3. **Chapter 7:** Gig Discovery & Application System
4. **Chapter 8:** Negotiation Engine
5. **Chapter 9:** Contract Generation & E-Signature
6. **Chapter 10:** Payment Milestone System

### Part 3: Advanced Features (Chapters 11-15)

1. **Chapter 11:** Trust Score Algorithm
2. **Chapter 12:** Venue Programming Mode
3. **Chapter 13:** Calendar & Scheduling System
4. **Chapter 14:** Notification & Communication Engine
5. **Chapter 15:** Cancellation & Refund Workflow

### Part 4: Polish & Launch (Chapters 16-18)

1. **Chapter 16:** Admin Dashboard
2. **Chapter 17:** Testing & Quality Assurance
3. **Chapter 18:** Deployment & DevOps

---

# Part 1: Foundation

---

## Chapter 1: Project Setup & Architecture

### 1.1 The Story Begins: Understanding Our Architecture

Imagine our application as a grand theater. The **backend** is everything behind the curtain—the stage machinery, the lighting controls, the sound systems. The **frontend** is what the audience sees—the beautiful stage, the performers, the experience.

**Our architecture follows a layered approach:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Redux)                    │
│         Artists UI    │    Organizers UI    │    Admin UI    │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS │
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│              Rate Limiting │ Request Validation              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                      │
│            JWT Verification │ Role-Based Access              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                    │
│    Users │ Bookings │ Contracts │ Payments │ Trust Score    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                      │
│              Sequelize ORM │ Query Builders                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL DATABASE                       │
│     Users │ Profiles │ Bookings │ Contracts │ Payments      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Setting Up Your Development Environment

**Prerequisites Checklist:**

- [ ]  Node.js v18+ installed
- [ ]  PostgreSQL 14+ installed
- [ ]  npm or yarn package manager
- [ ]  VS Code (recommended) or your preferred IDE
- [ ]  Git for version control
- [ ]  Postman for API testing

### 1.3 Project Folder Structure

**Let's create our project structure. Think of this as building the foundation of our theater:**

```bash
# Create the main project directory
mkdir music-booking-platform
cd music-booking-platform

# Create backend and frontend directories
mkdir backend frontend
```

**Backend Structure (The Engine Room):**

```
backend/
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.js         # Database connection
│   │   ├── redis.js            # Redis configuration (caching)
│   │   ├── email.js            # Email service config
│   │   └── constants.js        # App constants
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.js          # JWT verification
│   │   ├── role.middleware.js          # Role-based access
│   │   ├── validation.middleware.js    # Request validation
│   │   ├── rateLimit.middleware.js     # Rate limiting
│   │   ├── encryption.middleware.js    # Data encryption
│   │   ├── logging.middleware.js       # Request logging
│   │   └── error.middleware.js         # Error handling
│   │
│   ├── models/                 # Sequelize models
│   │   ├── User.model.js
│   │   ├── Artist.model.js
│   │   ├── Organizer.model.js
│   │   ├── Venue.model.js
│   │   ├── Booking.model.js
│   │   ├── Contract.model.js
│   │   ├── Payment.model.js
│   │   ├── TrustScore.model.js
│   │   └── index.js            # Model associations
│   │
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── artist.controller.js
│   │   ├── organizer.controller.js
│   │   ├── venue.controller.js
│   │   ├── booking.controller.js
│   │   ├── contract.controller.js
│   │   ├── payment.controller.js
│   │   └── admin.controller.js
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── booking.service.js
│   │   ├── contract.service.js
│   │   ├── payment.service.js
│   │   ├── trustScore.service.js
│   │   ├── notification.service.js
│   │   ├── email.service.js
│   │   └── encryption.service.js
│   │
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── artist.routes.js
│   │   ├── organizer.routes.js
│   │   ├── venue.routes.js
│   │   ├── booking.routes.js
│   │   ├── contract.routes.js
│   │   ├── payment.routes.js
│   │   ├── admin.routes.js
│   │   └── index.js            # Route aggregator
│   │
│   ├── utils/                  # Utility functions
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   ├── crypto.js           # Encryption utilities
│   │   ├── jwt.js              # Token utilities
│   │   └── responses.js        # Standard API responses
│   │
│   ├── jobs/                   # Background jobs
│   │   ├── paymentReminder.job.js
│   │   ├── contractExpiry.job.js
│   │   └── trustScoreUpdate.job.js
│   │
│   └── app.js                  # Express app setup
│
├── tests/                      # Test files
├── migrations/                 # Database migrations
├── seeders/                    # Database seeders
├── .env.example               # Environment template
├── .env                       # Environment variables (gitignored)
├── package.json
└── server.js                  # Entry point
```

### 1.4 Initialize the Backend Project

**Step 1: Create package.json**

```bash
cd backend
npm init -y
```

**Step 2: Install Dependencies**

```bash
# Core dependencies
npm install express pg pg-hstore sequelize cors helmet morgan dotenv

# Authentication & Security
npm install bcryptjs jsonwebtoken express-rate-limit express-validator
npm install crypto-js node-forge

# File handling & utilities
npm install multer uuid dayjs

# Email & notifications
npm install nodemailer

# Background jobs
npm install node-cron

# PDF generation (for contracts)
npm install pdfkit

# Development dependencies
npm install --save-dev nodemon sequelize-cli jest supertest
```

**Step 3: Create the Environment File**

Create `.env` in the backend folder:

```
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration
DB_HOST=[localhost](http://localhost)
DB_PORT=5432
DB_NAME=music_booking_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_also_32_chars
JWT_REFRESH_EXPIRES_IN=30d

# Encryption Keys (AES-256)
ENCRYPTION_KEY=your_32_character_encryption_key!
ENCRYPTION_IV=16_char_iv_here!

# Email Configuration
SMTP_HOST=[smtp.gmail.com](http://smtp.gmail.com)
SMTP_PORT=587
[SMTP_USER=your_email@gmail.com](mailto:SMTP_USER=your_email@gmail.com)
SMTP_PASSWORD=your_app_password
[EMAIL_FROM=noreply@musicplatform.com](mailto:EMAIL_FROM=noreply@musicplatform.com)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 1.5 Create the Express Application

**Create `src/app.js`:**

```jsx
// src/app.js
// The heart of our backend application

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { rateLimiter } = require('./middleware/rateLimit.middleware');
const { requestLogger } = require('./middleware/logging.middleware');

// Import routes
const routes = require('./routes');

// Initialize express app
const app = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet adds various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
}));

// Rate limiting
app.use(rateLimiter);

// ===========================================
// PARSING MIDDLEWARE
// ===========================================

// Parse JSON bodies (limit size for security)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// LOGGING MIDDLEWARE
// ===========================================

// Morgan for HTTP request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Custom request logger
app.use(requestLogger);

// ===========================================
// STATIC FILES
// ===========================================

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===========================================
// API ROUTES
// ===========================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// API routes
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
```

**Create `server.js` (Entry Point):**

```jsx
// server.js
// The starting point of our application journey

require('dotenv').config();

const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    try {
        await sequelize.close();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Sync models (in development only)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized.');
        }
        
        // Start listening
        app.listen(PORT, () => {
            console.log(`
🎵 Music Booking Platform API Server
====================================
📍 Environment: ${process.env.NODE_ENV}
🚀 Server running on port ${PORT}
📡 API Base URL: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}
⏰ Started at: ${new Date().toISOString()}
====================================
            `);
        });
        
    } catch (error) {
        console.error('❌ Unable to start server:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
```

---

# Chapter 2: Database Design & PostgreSQL Setup

<aside>
📖

**The Story So Far:** We've set up our project structure and created the Express application skeleton. Now it's time to design the foundation that will hold all our data—the database. Think of this as laying the underground pipes and wiring before building a house.

</aside>

---

## 2.1 Understanding Our Data Relationships

Before we write any database code, let's understand the story of our data. In our music booking platform, data flows like music through a venue:

### The Characters (Entities) in Our Story:

**Primary Actors:**

- **Users** - The base identity for everyone
- **Artists** - Musicians looking for gigs
- **Organizers** - People booking artists for events
- **Venues** - Locations where events happen

**Supporting Cast:**

- **Bookings** - The connection between artists and events
- **Contracts** - Legal agreements for bookings
- **Payments** - Money flow tracking
- **Applications** - Artists applying for opportunities
- **Negotiations** - Back-and-forth discussions
- **Trust Scores** - Reputation tracking

### Relationship Map:

```
                    ┌─────────────┐
                    │    USER     │
                    │  (Base)     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌───────────┐   ┌──────────┐
    │  ARTIST  │    │ ORGANIZER │   │  VENUE   │
    └────┬─────┘    └─────┬─────┘   └────┬─────┘
         │                │              │
         │    ┌───────────┴──────────────┤
         │    │                          │
         ▼    ▼                          │
    ┌─────────────┐                      │
    │ APPLICATION │                      │
    └──────┬──────┘                      │
           │                             │
           ▼                             │
    ┌─────────────┐                      │
    │ NEGOTIATION │                      │
    └──────┬──────┘                      │
           │                             │
           ▼                             ▼
    ┌─────────────┐              ┌───────────┐
    │   BOOKING   │◄─────────────│OPPORTUNITY│
    └──────┬──────┘              └───────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌──────────┐ ┌─────────┐
│ CONTRACT │ │ PAYMENT │
└──────────┘ └─────────┘
```

---

## 2.2 Setting Up PostgreSQL

### Step 1: Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE music_booking_platform;

# Create a dedicated user (recommended for production)
CREATE USER music_admin WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE music_booking_platform TO music_admin;

# Exit psql
\q
```

### Step 2: Configure Sequelize

**Create `src/config/database.js`:**

```jsx
// src/config/database.js
// Our database configuration - the connection to our data foundation

require('dotenv').config();

module.exports = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: console.log, // Log SQL queries in development
        pool: {
            max: 10,        // Maximum connections
            min: 0,         // Minimum connections
            acquire: 30000, // Max time to get connection (ms)
            idle: 10000,    // Max time connection can be idle (ms)
        },
        define: {
            timestamps: true,      // Add createdAt and updatedAt
            underscored: true,     // Use snake_case for columns
            freezeTableName: true, // Don't pluralize table names
        },
    },
    test: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME + '_test',
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false,
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 20,
            min: 5,
            acquire: 60000,
            idle: 10000,
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    },
};
```

---

## 2.3 Creating the Database Models

### Model 1: User (The Base Identity)

**Create `src/models/User.model.js`:**

```jsx
// src/models/User.model.js
// The foundation identity for all platform users

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('artist', 'organizer', 'venue', 'admin', 'curator'),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'suspended', 'banned'),
            defaultValue: 'pending',
        },
        emailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'email_verified',
        },
        phoneVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'phone_verified',
        },
        lastLogin: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'last_login',
        },
        refreshToken: {
            type: DataTypes.TEXT,
            field: 'refresh_token',
        },
        passwordResetToken: {
            type: DataTypes.STRING(255),
            field: 'password_reset_token',
        },
        passwordResetExpires: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'password_reset_expires',
        },
    }, {
        tableName: 'users',
        hooks: {
            // Hash password before saving
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(12);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(12);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    });

    // Instance method to check password
    User.prototype.validatePassword = async function(candidatePassword) {
        return await [bcrypt.compare](http://bcrypt.compare)(candidatePassword, this.password);
    };

    // Remove sensitive data when converting to JSON
    User.prototype.toJSON = function() {
        const values = { ...this.get() };
        delete values.password;
        delete values.refreshToken;
        delete values.passwordResetToken;
        delete values.passwordResetExpires;
        return values;
    };

    return User;
};
```

### Model 2: Artist Profile

**Create `src/models/Artist.model.js`:**

```jsx
// src/models/Artist.model.js
// Extended profile for artists - the performers in our ecosystem

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Artist = sequelize.define('Artist', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Basic Information
        artistName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'artist_name',
        },
        bio: {
            type: DataTypes.TEXT,
            validate: {
                len: [0, 2000], // Max 2000 characters
            },
        },
        profilePhoto: {
            type: DataTypes.STRING(500),
            field: 'profile_photo',
        },
        // Genres (stored as JSON array)
        primaryGenre: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'primary_genre',
        },
        secondaryGenres: {
            type: DataTypes.ARRAY(DataTypes.STRING(100)),
            defaultValue: [],
            field: 'secondary_genres',
        },
        // Experience
        yearsOfExperience: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'years_of_experience',
        },
        experienceLevel: {
            type: DataTypes.ENUM('beginner', 'intermediate', 'professional', 'veteran'),
            defaultValue: 'beginner',
            field: 'experience_level',
        },
        // Location
        city: {
            type: DataTypes.STRING(100),
        },
        state: {
            type: DataTypes.STRING(100),
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'India',
        },
        // Budget Tiers (stored encrypted)
        minimumFee: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'minimum_fee',
        },
        standardFee: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'standard_fee',
        },
        premiumFee: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'premium_fee',
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR',
        },
        // Social Links
        soundcloudUrl: {
            type: DataTypes.STRING(500),
            field: 'soundcloud_url',
        },
        mixcloudUrl: {
            type: DataTypes.STRING(500),
            field: 'mixcloud_url',
        },
        instagramHandle: {
            type: DataTypes.STRING(100),
            field: 'instagram_handle',
        },
        spotifyUrl: {
            type: DataTypes.STRING(500),
            field: 'spotify_url',
        },
        websiteUrl: {
            type: DataTypes.STRING(500),
            field: 'website_url',
        },
        // Technical Requirements
        technicalRiderUrl: {
            type: DataTypes.STRING(500),
            field: 'technical_rider_url',
        },
        equipmentRequirements: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'equipment_requirements',
        },
        performanceDurations: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            defaultValue: [60, 90, 120], // In minutes
            field: 'performance_durations',
        },
        specialRequests: {
            type: DataTypes.TEXT,
            field: 'special_requests',
        },
        // Verification Documents (encrypted references)
        panCardUrl: {
            type: DataTypes.STRING(500),
            field: 'pan_card_url',
        },
        aadharCardUrl: {
            type: DataTypes.STRING(500),
            field: 'aadhar_card_url',
        },
        // Bank Details (encrypted)
        bankAccountName: {
            type: DataTypes.STRING(255),
            field: 'bank_account_name',
        },
        bankAccountNumber: {
            type: DataTypes.STRING(255), // Encrypted
            field: 'bank_account_number',
        },
        bankIfscCode: {
            type: DataTypes.STRING(20),
            field: 'bank_ifsc_code',
        },
        gstNumber: {
            type: DataTypes.STRING(20),
            field: 'gst_number',
        },
        // Achievements
        achievements: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        // Past Performances (for display)
        pastVenues: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'past_venues',
        },
        // Portfolio Images
        portfolioImages: {
            type: DataTypes.ARRAY(DataTypes.STRING(500)),
            defaultValue: [],
            field: 'portfolio_images',
        },
        // Verification Status
        verificationStatus: {
            type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'),
            defaultValue: 'pending',
            field: 'verification_status',
        },
        verificationNotes: {
            type: DataTypes.TEXT,
            field: 'verification_notes',
        },
        verifiedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'verified_at',
        },
        // Profile Completion
        profileCompleteness: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'profile_completeness',
        },
        // Application Limits
        pendingApplicationsCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'pending_applications_count',
        },
        maxPendingApplications: {
            type: DataTypes.INTEGER,
            defaultValue: 5, // Based on trust score
            field: 'max_pending_applications',
        },
    }, {
        tableName: 'artists',
        indexes: [
            { fields: ['user_id'], unique: true },
            { fields: ['artist_name'] },
            { fields: ['primary_genre'] },
            { fields: ['city'] },
            { fields: ['verification_status'] },
            { fields: ['minimum_fee', 'premium_fee'] },
        ],
    });

    return Artist;
};
```

### Model 3: Organizer Profile

**Create `src/models/Organizer.model.js`:**

```jsx
// src/models/Organizer.model.js
// Profile for event organizers and promoters

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Organizer = sequelize.define('Organizer', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Organization Details
        organizationName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'organization_name',
        },
        organizationType: {
            type: DataTypes.ENUM('individual', 'company', 'agency', 'collective'),
            defaultValue: 'individual',
            field: 'organization_type',
        },
        description: {
            type: DataTypes.TEXT,
        },
        logo: {
            type: DataTypes.STRING(500),
        },
        // Registration Details
        registrationNumber: {
            type: DataTypes.STRING(100),
            field: 'registration_number',
        },
        gstNumber: {
            type: DataTypes.STRING(20),
            field: 'gst_number',
        },
        panNumber: {
            type: DataTypes.STRING(20),
            field: 'pan_number',
        },
        // Contact Information
        contactPerson: {
            type: DataTypes.STRING(255),
            field: 'contact_person',
        },
        contactPhone: {
            type: DataTypes.STRING(20),
            field: 'contact_phone',
        },
        contactEmail: {
            type: DataTypes.STRING(255),
            field: 'contact_email',
        },
        // Address
        address: {
            type: DataTypes.TEXT,
        },
        city: {
            type: DataTypes.STRING(100),
        },
        state: {
            type: DataTypes.STRING(100),
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'India',
        },
        pincode: {
            type: DataTypes.STRING(10),
        },
        // Experience
        yearsInBusiness: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'years_in_business',
        },
        eventsOrganized: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'events_organized',
        },
        maxCrowdAchieved: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'max_crowd_achieved',
        },
        // Social & Web Presence
        websiteUrl: {
            type: DataTypes.STRING(500),
            field: 'website_url',
        },
        instagramHandle: {
            type: DataTypes.STRING(100),
            field: 'instagram_handle',
        },
        facebookUrl: {
            type: DataTypes.STRING(500),
            field: 'facebook_url',
        },
        // Past Events & Artists (for verification)
        pastEvents: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'past_events',
        },
        artistsBooked: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'artists_booked',
        },
        venuesWorkedWith: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'venues_worked_with',
        },
        // Bank Details (encrypted)
        bankAccountName: {
            type: DataTypes.STRING(255),
            field: 'bank_account_name',
        },
        bankAccountNumber: {
            type: DataTypes.STRING(255),
            field: 'bank_account_number',
        },
        bankIfscCode: {
            type: DataTypes.STRING(20),
            field: 'bank_ifsc_code',
        },
        // Verification
        verificationStatus: {
            type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'),
            defaultValue: 'pending',
            field: 'verification_status',
        },
        verificationDocuments: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'verification_documents',
        },
        verifiedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'verified_at',
        },
        // Profile Completion
        profileCompleteness: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'profile_completeness',
        },
    }, {
        tableName: 'organizers',
        indexes: [
            { fields: ['user_id'], unique: true },
            { fields: ['organization_name'] },
            { fields: ['city'] },
            { fields: ['verification_status'] },
        ],
    });

    return Organizer;
};
```

### Model 4: Venue Profile

**Create `src/models/Venue.model.js`:**

```jsx
// src/models/Venue.model.js
// Profile for venues and clubs

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Venue = sequelize.define('Venue', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Venue Details
        venueName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'venue_name',
        },
        venueType: {
            type: DataTypes.ENUM('club', 'bar', 'lounge', 'restaurant', 'hotel', 'outdoor', 'arena', 'other'),
            defaultValue: 'club',
            field: 'venue_type',
        },
        description: {
            type: DataTypes.TEXT,
        },
        // Location
        address: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING(100),
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'India',
        },
        pincode: {
            type: DataTypes.STRING(10),
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
        },
        // Capacity
        standingCapacity: {
            type: DataTypes.INTEGER,
            field: 'standing_capacity',
        },
        seatedCapacity: {
            type: DataTypes.INTEGER,
            field: 'seated_capacity',
        },
        // Operating Hours
        operatingDays: {
            type: DataTypes.ARRAY(DataTypes.STRING(20)),
            defaultValue: ['friday', 'saturday'],
            field: 'operating_days',
        },
        openingTime: {
            type: DataTypes.TIME,
            field: 'opening_time',
        },
        closingTime: {
            type: DataTypes.TIME,
            field: 'closing_time',
        },
        // Music Policy
        preferredGenres: {
            type: DataTypes.ARRAY(DataTypes.STRING(100)),
            defaultValue: [],
            field: 'preferred_genres',
        },
        musicPolicy: {
            type: DataTypes.TEXT,
            field: 'music_policy',
        },
        // Technical Equipment
        soundSystem: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'sound_system',
        },
        lightingSystem: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'lighting_system',
        },
        djEquipment: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'dj_equipment',
        },
        stageSpecs: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'stage_specs',
        },
        // Amenities
        amenities: {
            type: DataTypes.JSONB,
            defaultValue: {
                greenRoom: false,
                parking: false,
                vipArea: false,
                outdoorSpace: false,
                coatCheck: false,
            },
        },
        // Photos
        photos: {
            type: DataTypes.ARRAY(DataTypes.STRING(500)),
            defaultValue: [],
        },
        virtualTourUrl: {
            type: DataTypes.STRING(500),
            field: 'virtual_tour_url',
        },
        // Contact
        contactPerson: {
            type: DataTypes.STRING(255),
            field: 'contact_person',
        },
        contactPhone: {
            type: DataTypes.STRING(20),
            field: 'contact_phone',
        },
        contactEmail: {
            type: DataTypes.STRING(255),
            field: 'contact_email',
        },
        // Licensing
        licenseNumber: {
            type: DataTypes.STRING(100),
            field: 'license_number',
        },
        licenseExpiry: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'license_expiry',
        },
        // Past Artists
        pastArtists: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'past_artists',
        },
        // Verification
        verificationStatus: {
            type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'),
            defaultValue: 'pending',
            field: 'verification_status',
        },
        verificationDocuments: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'verification_documents',
        },
        verifiedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'verified_at',
        },
        // Profile Completion
        profileCompleteness: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'profile_completeness',
        },
    }, {
        tableName: 'venues',
        indexes: [
            { fields: ['user_id'], unique: true },
            { fields: ['venue_name'] },
            { fields: ['city'] },
            { fields: ['venue_type'] },
            { fields: ['verification_status'] },
        ],
    });

    return Venue;
};
```

### Model 5: Trust Score

**Create `src/models/TrustScore.model.js`:**

```jsx
// src/models/TrustScore.model.js
// The reputation system that keeps our ecosystem trustworthy

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TrustScore = sequelize.define('TrustScore', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Current Score
        currentScore: {
            type: DataTypes.INTEGER,
            defaultValue: 50, // Everyone starts at 50
            field: 'current_score',
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Score Tier
        tier: {
            type: DataTypes.ENUM('critical', 'high_risk', 'standard', 'trusted', 'premium'),
            defaultValue: 'standard',
        },
        // Score Components (for transparency)
        componentScores: {
            type: DataTypes.JSONB,
            defaultValue: {
                completedBookings: 0,
                paymentTimeliness: 0,
                communicationScore: 0,
                cancellationPenalty: 0,
                profileCompleteness: 0,
                disputesPenalty: 0,
            },
            field: 'component_scores',
        },
        // Statistics
        totalBookings: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_bookings',
        },
        successfulBookings: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'successful_bookings',
        },
        cancellations: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        disputes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        latePayments: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'late_payments',
        },
        // Last Update
        lastUpdated: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            defaultValue: [DataTypes.NOW](http://DataTypes.NOW),
            field: 'last_updated',
        },
    }, {
        tableName: 'trust_scores',
        indexes: [
            { fields: ['user_id'], unique: true },
            { fields: ['current_score'] },
            { fields: ['tier'] },
        ],
    });

    // Calculate tier based on score
    TrustScore.prototype.calculateTier = function() {
        const score = this.currentScore;
        if (score <= 30) return 'critical';
        if (score <= 50) return 'high_risk';
        if (score <= 70) return 'standard';
        if (score <= 85) return 'trusted';
        return 'premium';
    };

    return TrustScore;
};
```

---

## 2.4 Creating the Booking Models

### Model 6: Opportunity (What Organizers Post)

**Create `src/models/Opportunity.model.js`:**

```jsx
// src/models/Opportunity.model.js
// Gig opportunities that artists can apply for

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Opportunity = sequelize.define('Opportunity', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // Who posted it
        organizerId: {
            type: DataTypes.UUID,
            allowNull: true, // null if venue posts directly
            field: 'organizer_id',
            references: {
                model: 'organizers',
                key: 'id',
            },
        },
        venueId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'venue_id',
            references: {
                model: 'venues',
                key: 'id',
            },
        },
        // Event Details
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
        },
        eventType: {
            type: DataTypes.ENUM('club_night', 'festival', 'private_event', 'corporate', 'concert', 'other'),
            defaultValue: 'club_night',
            field: 'event_type',
        },
        // Date and Time
        eventDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'event_date',
        },
        slotStartTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'slot_start_time',
        },
        slotEndTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'slot_end_time',
        },
        slotType: {
            type: DataTypes.ENUM('opening', 'mid', 'closing', 'headliner'),
            allowNull: false,
            field: 'slot_type',
        },
        // Requirements
        requiredGenres: {
            type: DataTypes.ARRAY(DataTypes.STRING(100)),
            defaultValue: [],
            field: 'required_genres',
        },
        experienceLevelRequired: {
            type: DataTypes.ENUM('any', 'beginner', 'intermediate', 'professional', 'veteran'),
            defaultValue: 'any',
            field: 'experience_level_required',
        },
        performanceDuration: {
            type: DataTypes.INTEGER, // in minutes
            allowNull: false,
            field: 'performance_duration',
        },
        // Budget
        budgetMin: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'budget_min',
        },
        budgetMax: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'budget_max',
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR',
        },
        // Additional Details
        expectedAudience: {
            type: DataTypes.INTEGER,
            field: 'expected_audience',
        },
        specialRequirements: {
            type: DataTypes.TEXT,
            field: 'special_requirements',
        },
        travelIncluded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'travel_included',
        },
        accommodationIncluded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'accommodation_included',
        },
        // Status
        status: {
            type: DataTypes.ENUM('draft', 'active', 'closed', 'filled', 'cancelled'),
            defaultValue: 'draft',
        },
        // Visibility
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_public',
        },
        // Application Details
        applicationDeadline: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'application_deadline',
        },
        maxApplications: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
            field: 'max_applications',
        },
        currentApplications: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'current_applications',
        },
        // Statistics
        viewCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'view_count',
        },
    }, {
        tableName: 'opportunities',
        indexes: [
            { fields: ['organizer_id'] },
            { fields: ['venue_id'] },
            { fields: ['event_date'] },
            { fields: ['status'] },
            { fields: ['budget_min', 'budget_max'] },
            { fields: ['required_genres'], using: 'gin' },
        ],
    });

    return Opportunity;
};
```

### Model 7: Application (Artist Applying for Opportunity)

**Create `src/models/Application.model.js`:**

```jsx
// src/models/Application.model.js
// Applications from artists for opportunities

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Application = sequelize.define('Application', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        opportunityId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'opportunity_id',
            references: {
                model: 'opportunities',
                key: 'id',
            },
        },
        artistId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'artist_id',
            references: {
                model: 'artists',
                key: 'id',
            },
        },
        // Proposed Terms
        proposedFee: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'proposed_fee',
        },
        willingToNegotiate: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'willing_to_negotiate',
        },
        personalMessage: {
            type: DataTypes.STRING(500),
            field: 'personal_message',
        },
        preferredSlotTime: {
            type: DataTypes.ENUM('opening', 'mid', 'closing', 'headliner', 'any'),
            defaultValue: 'any',
            field: 'preferred_slot_time',
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'pending',           // Waiting for organizer review
                'viewed',           // Organizer viewed the application
                'shortlisted',      // Under consideration
                'accepted',         // Directly accepted
                'counter_offered',  // Organizer made counter-offer
                'declined',         // Rejected by organizer
                'withdrawn',        // Withdrawn by artist
                'expired'           // Auto-expired after timeout
            ),
            defaultValue: 'pending',
        },
        // Timeline Tracking
        viewedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'viewed_at',
        },
        respondedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'responded_at',
        },
        expiresAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'expires_at',
        },
        // Organizer Response
        responseMessage: {
            type: DataTypes.TEXT,
            field: 'response_message',
        },
        declineReason: {
            type: DataTypes.TEXT,
            field: 'decline_reason',
        },
        // Match Score (calculated)
        matchScore: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'match_score',
        },
    }, {
        tableName: 'applications',
        indexes: [
            { fields: ['opportunity_id'] },
            { fields: ['artist_id'] },
            { fields: ['status'] },
            { fields: ['opportunity_id', 'artist_id'], unique: true },
        ],
    });

    return Application;
};
```

---

*Continue to the next file for more models...*

---

## 2.5 Model Index and Associations

**Create `src/models/index.js`:**

```jsx
// src/models/index.js
// The grand assembler - connecting all our models together

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: [dbConfig.host](http://dbConfig.host),
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        define: dbConfig.define,
        dialectOptions: dbConfig.dialectOptions,
    }
);

// Import models
const User = require('./User.model')(sequelize);
const Artist = require('./Artist.model')(sequelize);
const Organizer = require('./Organizer.model')(sequelize);
const Venue = require('./Venue.model')(sequelize);
const TrustScore = require('./TrustScore.model')(sequelize);
const Opportunity = require('./Opportunity.model')(sequelize);
const Application = require('./Application.model')(sequelize);
const Negotiation = require('./Negotiation.model')(sequelize);
const Booking = require('./Booking.model')(sequelize);
const Contract = require('./Contract.model')(sequelize);
const Payment = require('./Payment.model')(sequelize);
const Notification = require('./Notification.model')(sequelize);

// ===========================================
// DEFINE ASSOCIATIONS
// ===========================================

// User associations
User.hasOne(Artist, { foreignKey: 'userId', as: 'artistProfile' });
User.hasOne(Organizer, { foreignKey: 'userId', as: 'organizerProfile' });
User.hasOne(Venue, { foreignKey: 'userId', as: 'venueProfile' });
User.hasOne(TrustScore, { foreignKey: 'userId', as: 'trustScore' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Artist associations
Artist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Artist.hasMany(Application, { foreignKey: 'artistId', as: 'applications' });
Artist.hasMany(Booking, { foreignKey: 'artistId', as: 'bookings' });

// Organizer associations
Organizer.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Organizer.hasMany(Opportunity, { foreignKey: 'organizerId', as: 'opportunities' });
Organizer.hasMany(Booking, { foreignKey: 'organizerId', as: 'bookings' });

// Venue associations
Venue.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Venue.hasMany(Opportunity, { foreignKey: 'venueId', as: 'opportunities' });
Venue.hasMany(Booking, { foreignKey: 'venueId', as: 'bookings' });

// Opportunity associations
Opportunity.belongsTo(Organizer, { foreignKey: 'organizerId', as: 'organizer' });
Opportunity.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });
Opportunity.hasMany(Application, { foreignKey: 'opportunityId', as: 'applications' });
Opportunity.hasOne(Booking, { foreignKey: 'opportunityId', as: 'booking' });

// Application associations
Application.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
Application.belongsTo(Artist, { foreignKey: 'artistId', as: 'artist' });
Application.hasOne(Negotiation, { foreignKey: 'applicationId', as: 'negotiation' });

// Negotiation associations
Negotiation.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

// Booking associations
Booking.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
Booking.belongsTo(Artist, { foreignKey: 'artistId', as: 'artist' });
Booking.belongsTo(Organizer, { foreignKey: 'organizerId', as: 'organizer' });
Booking.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });
Booking.hasOne(Contract, { foreignKey: 'bookingId', as: 'contract' });
Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments' });

// Contract associations
Contract.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

// Payment associations
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

// TrustScore associations
TrustScore.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export everything
module.exports = {
    sequelize,
    Sequelize,
    User,
    Artist,
    Organizer,
    Venue,
    TrustScore,
    Opportunity,
    Application,
    Negotiation,
    Booking,
    Contract,
    Payment,
    Notification,
};
```

---

## 2.6 Additional Essential Models

Let me provide the remaining critical models:

### Model 8: Booking

```jsx
// src/models/Booking.model.js
// The confirmed engagement between artist and organizer

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Booking = sequelize.define('Booking', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        bookingNumber: {
            type: DataTypes.STRING(20),
            unique: true,
            field: 'booking_number',
        },
        opportunityId: {
            type: DataTypes.UUID,
            field: 'opportunity_id',
            references: { model: 'opportunities', key: 'id' },
        },
        artistId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'artist_id',
            references: { model: 'artists', key: 'id' },
        },
        organizerId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'organizer_id',
            references: { model: 'organizers', key: 'id' },
        },
        venueId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'venue_id',
            references: { model: 'venues', key: 'id' },
        },
        // Event Details
        eventDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'event_date',
        },
        slotStartTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'slot_start_time',
        },
        slotEndTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'slot_end_time',
        },
        slotType: {
            type: DataTypes.ENUM('opening', 'mid', 'closing', 'headliner'),
            allowNull: false,
            field: 'slot_type',
        },
        performanceDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'performance_duration',
        },
        // Financial
        agreedFee: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'agreed_fee',
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR',
        },
        platformCommission: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'platform_commission',
        },
        commissionPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 3.00,
            field: 'commission_percentage',
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'pending_contract',
                'contract_sent',
                'contract_signed',
                'deposit_pending',
                'deposit_paid',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
                'disputed'
            ),
            defaultValue: 'pending_contract',
        },
        // Travel & Accommodation
        travelIncluded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'travel_included',
        },
        travelDetails: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'travel_details',
        },
        accommodationIncluded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'accommodation_included',
        },
        accommodationDetails: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'accommodation_details',
        },
        // Checklist
        checklist: {
            type: DataTypes.JSONB,
            defaultValue: {
                contractSigned: false,
                depositPaid: false,
                technicalRiderConfirmed: false,
                travelArranged: false,
                accommodationBooked: false,
                itineraryShared: false,
                soundCheckScheduled: false,
                guestListSubmitted: false,
            },
        },
        // Timestamps
        contractSignedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'contract_signed_at',
        },
        depositPaidAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'deposit_paid_at',
        },
        completedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'completed_at',
        },
        cancelledAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'cancelled_at',
        },
        cancellationReason: {
            type: DataTypes.TEXT,
            field: 'cancellation_reason',
        },
        cancelledBy: {
            type: DataTypes.ENUM('artist', 'organizer', 'platform', 'mutual'),
            field: 'cancelled_by',
        },
    }, {
        tableName: 'bookings',
        hooks: {
            beforeCreate: async (booking) => {
                // Generate booking number
                const count = await [sequelize.models.Booking](http://sequelize.models.Booking).count();
                booking.bookingNumber = `BK${[Date.now](http://Date.now)().toString(36).toUpperCase()}${(count + 1).toString().padStart(4, '0')}`;
            },
        },
        indexes: [
            { fields: ['booking_number'], unique: true },
            { fields: ['artist_id'] },
            { fields: ['organizer_id'] },
            { fields: ['venue_id'] },
            { fields: ['event_date'] },
            { fields: ['status'] },
        ],
    });

    return Booking;
};
```

### Model 9: Contract

```jsx
// src/models/Contract.model.js
// Legal agreements for bookings

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Contract = sequelize.define('Contract', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        contractNumber: {
            type: DataTypes.STRING(30),
            unique: true,
            field: 'contract_number',
        },
        bookingId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'booking_id',
            references: { model: 'bookings', key: 'id' },
        },
        // Contract Type
        contractType: {
            type: DataTypes.ENUM('local', 'interstate', 'international', 'multi_day'),
            defaultValue: 'local',
            field: 'contract_type',
        },
        // Terms (JSON structure matching the contract template)
        terms: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        // Payment Structure
        paymentStructure: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'payment_structure',
        },
        // Document
        pdfUrl: {
            type: DataTypes.STRING(500),
            field: 'pdf_url',
        },
        // Signatures
        artistSignature: {
            type: DataTypes.JSONB,
            field: 'artist_signature',
        },
        artistSignedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'artist_signed_at',
        },
        organizerSignature: {
            type: DataTypes.JSONB,
            field: 'organizer_signature',
        },
        organizerSignedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'organizer_signed_at',
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'draft',
                'pending_artist_signature',
                'pending_organizer_signature',
                'fully_executed',
                'expired',
                'cancelled'
            ),
            defaultValue: 'draft',
        },
        // Deadlines
        signatureDeadline: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'signature_deadline',
        },
        // Verification
        verificationHash: {
            type: DataTypes.STRING(128),
            field: 'verification_hash',
        },
    }, {
        tableName: 'contracts',
        hooks: {
            beforeCreate: async (contract) => {
                const count = await sequelize.models.Contract.count();
                contract.contractNumber = `CTR${new Date().getFullYear()}${(count + 1).toString().padStart(6, '0')}`;
            },
        },
        indexes: [
            { fields: ['contract_number'], unique: true },
            { fields: ['booking_id'], unique: true },
            { fields: ['status'] },
        ],
    });

    return Contract;
};
```

### Model 10: Payment

```jsx
// src/models/Payment.model.js
// Payment milestones and transactions

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        paymentNumber: {
            type: DataTypes.STRING(30),
            unique: true,
            field: 'payment_number',
        },
        bookingId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'booking_id',
            references: { model: 'bookings', key: 'id' },
        },
        // Milestone
        milestoneType: {
            type: DataTypes.ENUM('deposit', 'pre_event', 'final', 'penalty', 'refund'),
            allowNull: false,
            field: 'milestone_type',
        },
        milestoneNumber: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'milestone_number',
        },
        // Amounts
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR',
        },
        platformFee: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'platform_fee',
        },
        processingFee: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            field: 'processing_fee',
        },
        netAmount: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'net_amount',
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'pending',
                'processing',
                'completed',
                'failed',
                'refunded',
                'cancelled'
            ),
            defaultValue: 'pending',
        },
        // Payment Details
        paymentMethod: {
            type: DataTypes.ENUM('bank_transfer', 'upi', 'card', 'net_banking', 'escrow'),
            field: 'payment_method',
        },
        transactionId: {
            type: DataTypes.STRING(100),
            field: 'transaction_id',
        },
        gatewayResponse: {
            type: DataTypes.JSONB,
            field: 'gateway_response',
        },
        // Escrow
        inEscrow: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'in_escrow',
        },
        escrowReleasedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'escrow_released_at',
        },
        // Timestamps
        dueDate: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'due_date',
        },
        paidAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'paid_at',
        },
        // Payer/Payee
        payerType: {
            type: DataTypes.ENUM('organizer', 'artist', 'platform'),
            field: 'payer_type',
        },
        payerId: {
            type: DataTypes.UUID,
            field: 'payer_id',
        },
        payeeType: {
            type: DataTypes.ENUM('artist', 'organizer', 'platform'),
            field: 'payee_type',
        },
        payeeId: {
            type: DataTypes.UUID,
            field: 'payee_id',
        },
    }, {
        tableName: 'payments',
        hooks: {
            beforeCreate: async (payment) => {
                const count = await sequelize.models.Payment.count();
                payment.paymentNumber = `PAY${[Date.now](http://Date.now)().toString(36).toUpperCase()}${(count + 1).toString().padStart(5, '0')}`;
            },
        },
        indexes: [
            { fields: ['payment_number'], unique: true },
            { fields: ['booking_id'] },
            { fields: ['status'] },
            { fields: ['milestone_type'] },
            { fields: ['due_date'] },
        ],
    });

    return Payment;
};
```

---

## 2.7 Running Migrations

In production, you'll want to use migrations instead of sync. Here's how to set them up:

```bash
# Initialize Sequelize CLI
npx sequelize-cli init

# Create a migration
npx sequelize-cli migration:generate --name create-users-table
```

---

<aside>
📖

**The Story So Far:** Our database is designed and ready. Now we need to build the gatekeepers—the authentication and authorization system that will protect our kingdom and ensure only the right people access the right resources.

</aside>

---

## 3.1 Understanding Authentication vs Authorization

Before we write code, let's understand two crucial concepts:

**Authentication** = "Who are you?" 

- Verifying the identity of a user
- Login, registration, password verification

**Authorization** = "What can you do?"

- Determining what a verified user can access
- Role-based permissions, resource ownership

```
┌─────────────────────────────────────────────────────┐
│                    USER REQUEST                         │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│            AUTHENTICATION (Who are you?)                │
│                                                         │
│   ┌─────────┐   ┌──────────┐   ┌─────────────┐      │
│   │  JWT    │   │  Verify  │   │  Decode &   │      │
│   │  Token  │──▶│  Token   │──▶│  Extract    │      │
│   └─────────┘   └──────────┘   │  User ID    │      │
│                               └─────────────┘      │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│           AUTHORIZATION (What can you do?)              │
│                                                         │
│   ┌─────────┐   ┌──────────┐   ┌─────────────┐      │
│   │  Check  │   │  Check   │   │  Grant or   │      │
│   │  Role   │──▶│  Resource│──▶│  Deny       │      │
│   └─────────┘   └──────────┘   │  Access     │      │
│                               └─────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## 3.2 JWT Token Strategy

We'll use a **dual-token strategy**:

1. **Access Token** (short-lived: 15 minutes to 7 days)
    - Used for API requests
    - Contains user ID, role, permissions
    - Stored in memory (never in localStorage for sensitive data)
2. **Refresh Token** (long-lived: 30 days)
    - Used only to get new access tokens
    - Stored in HTTP-only, secure cookie
    - Can be revoked (stored in database)

---

## 3.3 Encryption Utilities

**Create `src/utils/crypto.js`:**

```jsx
// src/utils/crypto.js
// Our encryption toolkit - the vault that keeps secrets safe

const crypto = require('crypto');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 characters
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;   // 16 characters

/**
 * Encrypt sensitive data using AES-256-CBC
 * Use this for: bank account numbers, PAN cards, Aadhar numbers
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string (hex format)
 */
const encrypt = (text) => {
    if (!text) return null;
    
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY),
        Buffer.from(ENCRYPTION_IV)
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += [cipher.final](http://cipher.final)('hex');
    
    return encrypted;
};

/**
 * Decrypt AES-256-CBC encrypted data
 * @param {string} encryptedText - Encrypted string (hex format)
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY),
        Buffer.from(ENCRYPTION_IV)
    );
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += [decipher.final](http://decipher.final)('utf8');
    
    return decrypted;
};

/**
 * Generate a secure random token
 * Use this for: password reset tokens, verification codes
 * @param {number} length - Length of the token
 * @returns {string} - Random hex string
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a string using SHA-256
 * Use this for: verification hashes, checksums
 * @param {string} text - Text to hash
 * @returns {string} - SHA-256 hash
 */
const hashSHA256 = (text) => {
    return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate OTP (One-Time Password)
 * @param {number} digits - Number of digits (default 6)
 * @returns {string} - OTP string
 */
const generateOTP = (digits = 6) => {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

/**
 * Mask sensitive data for display
 * Example: "1234567890" -> "******7890"
 * @param {string} text - Text to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} - Masked string
 */
const maskSensitiveData = (text, visibleChars = 4) => {
    if (!text || text.length <= visibleChars) return text;
    const masked = '*'.repeat(text.length - visibleChars);
    return masked + text.slice(-visibleChars);
};

module.exports = {
    encrypt,
    decrypt,
    generateSecureToken,
    hashSHA256,
    generateOTP,
    maskSensitiveData,
};
```

---

## 3.4 JWT Utilities

**Create `src/utils/jwt.js`:**

```jsx
// src/utils/jwt.js
// Token management - the keys to our kingdom

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate Access Token
 * Contains user identity and role for API authentication
 */
const generateAccessToken = (user) => {
    const payload = {
        id: [user.id](http://user.id),
        email: [user.email](http://user.email),
        role: user.role,
        status: user.status,
        type: 'access',
    };
    
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'music-booking-platform',
        audience: 'music-booking-users',
    });
};

/**
 * Generate Refresh Token
 * Used only to obtain new access tokens
 */
const generateRefreshToken = (user) => {
    const payload = {
        id: [user.id](http://user.id),
        type: 'refresh',
        tokenVersion: user.tokenVersion || 0, // For token invalidation
    };
    
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'music-booking-platform',
    });
};

/**
 * Verify Access Token
 * @returns {object} Decoded payload or throws error
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'music-booking-platform',
            audience: 'music-booking-users',
        });
        
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        
        return decoded;
    } catch (error) {
        if ([error.name](http://error.name) === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        if ([error.name](http://error.name) === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'music-booking-platform',
        });
        
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        
        return decoded;
    } catch (error) {
        if ([error.name](http://error.name) === 'TokenExpiredError') {
            throw new Error('Refresh token has expired');
        }
        throw error;
    }
};

/**
 * Generate both tokens as a pair
 */
const generateTokenPair = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
    };
};

/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
    decodeToken,
};
```

---

## 3.5 Authentication Service

**Create `src/services/auth.service.js`:**

```jsx
// src/services/auth.service.js
// The bouncer at the door - handles all authentication logic

const { User, Artist, Organizer, Venue, TrustScore } = require('../models');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { generateSecureToken, generateOTP, hashSHA256 } = require('../utils/crypto');
const emailService = require('./email.service');
const dayjs = require('dayjs');

class AuthService {
    /**
     * Register a new user
     * Step 1 of the registration flow
     */
    async register({ email, phone, password, role }) {
        // Check if email already exists
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            throw new Error('Email already registered');
        }
        
        // Check if phone already exists
        const existingPhone = await User.findOne({ where: { phone } });
        if (existingPhone) {
            throw new Error('Phone number already registered');
        }
        
        // Validate role
        const validRoles = ['artist', 'organizer', 'venue'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role specified');
        }
        
        // Create user (password is hashed by model hook)
        const user = await User.create({
            email,
            phone,
            password,
            role,
            status: 'pending',
        });
        
        // Initialize trust score
        await TrustScore.create({
            userId: [user.id](http://user.id),
            currentScore: 50,
            tier: 'standard',
        });
        
        // Generate verification token
        const verificationToken = generateSecureToken();
        const verificationOTP = generateOTP(6);
        
        // Store verification token (in production, use Redis with expiry)
        user.passwordResetToken = hashSHA256(verificationToken);
        user.passwordResetExpires = dayjs().add(24, 'hour').toDate();
        await [user.save](http://user.save)();
        
        // Send verification email
        await emailService.sendVerificationEmail([user.email](http://user.email), verificationToken);
        
        // Return user without sensitive data
        return {
            id: [user.id](http://user.id),
            email: [user.email](http://user.email),
            phone: [user.phone](http://user.phone),
            role: user.role,
            status: user.status,
            message: 'Registration successful. Please verify your email.',
        };
    }
    
    /**
     * Verify email with token
     */
    async verifyEmail(token) {
        const hashedToken = hashSHA256(token);
        
        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
            },
        });
        
        if (!user) {
            throw new Error('Invalid verification token');
        }
        
        if (dayjs().isAfter(user.passwordResetExpires)) {
            throw new Error('Verification token has expired');
        }
        
        // Mark email as verified
        user.emailVerified = true;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await [user.save](http://user.save)();
        
        return { message: 'Email verified successfully' };
    }
    
    /**
     * Login user
     */
    async login({ email, password }) {
        // Find user by email
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            throw new Error('Invalid email or password');
        }
        
        // Check password
        const isValidPassword = await user.validatePassword(password);
        
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        
        // Check account status
        if (user.status === 'banned') {
            throw new Error('Your account has been banned');
        }
        
        if (user.status === 'suspended') {
            throw new Error('Your account is suspended. Please contact support.');
        }
        
        // Generate tokens
        const tokens = generateTokenPair(user);
        
        // Store refresh token hash in database
        user.refreshToken = hashSHA256(tokens.refreshToken);
        user.lastLogin = new Date();
        await [user.save](http://user.save)();
        
        // Get profile based on role
        let profile = null;
        if (user.role === 'artist') {
            profile = await Artist.findOne({ where: { userId: [user.id](http://user.id) } });
        } else if (user.role === 'organizer') {
            profile = await Organizer.findOne({ where: { userId: [user.id](http://user.id) } });
        } else if (user.role === 'venue') {
            profile = await Venue.findOne({ where: { userId: [user.id](http://user.id) } });
        }
        
        // Get trust score
        const trustScore = await TrustScore.findOne({ where: { userId: [user.id](http://user.id) } });
        
        return {
            user: user.toJSON(),
            profile,
            trustScore: trustScore ? trustScore.toJSON() : null,
            tokens,
        };
    }
    
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        // Verify the refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Find user
        const user = await User.findByPk([decoded.id](http://decoded.id));
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Verify refresh token matches stored hash
        const tokenHash = hashSHA256(refreshToken);
        if (user.refreshToken !== tokenHash) {
            throw new Error('Invalid refresh token');
        }
        
        // Generate new tokens
        const tokens = generateTokenPair(user);
        
        // Update stored refresh token
        user.refreshToken = hashSHA256(tokens.refreshToken);
        await [user.save](http://user.save)();
        
        return tokens;
    }
    
    /**
     * Logout user (invalidate refresh token)
     */
    async logout(userId) {
        const user = await User.findByPk(userId);
        
        if (user) {
            user.refreshToken = null;
            await [user.save](http://user.save)();
        }
        
        return { message: 'Logged out successfully' };
    }
    
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        const user = await User.findOne({ where: { email } });
        
        // Don't reveal if email exists
        if (!user) {
            return { message: 'If your email exists, you will receive a reset link' };
        }
        
        // Generate reset token
        const resetToken = generateSecureToken();
        
        user.passwordResetToken = hashSHA256(resetToken);
        user.passwordResetExpires = dayjs().add(1, 'hour').toDate();
        await [user.save](http://user.save)();
        
        // Send reset email
        await emailService.sendPasswordResetEmail([user.email](http://user.email), resetToken);
        
        return { message: 'If your email exists, you will receive a reset link' };
    }
    
    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        const hashedToken = hashSHA256(token);
        
        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
            },
        });
        
        if (!user) {
            throw new Error('Invalid reset token');
        }
        
        if (dayjs().isAfter(user.passwordResetExpires)) {
            throw new Error('Reset token has expired');
        }
        
        // Update password (will be hashed by model hook)
        user.password = newPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        user.refreshToken = null; // Invalidate all sessions
        await [user.save](http://user.save)();
        
        return { message: 'Password reset successful' };
    }
    
    /**
     * Change password (when logged in)
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findByPk(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Verify current password
        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }
        
        // Update password
        user.password = newPassword;
        user.refreshToken = null; // Invalidate all sessions
        await [user.save](http://user.save)();
        
        return { message: 'Password changed successfully' };
    }
}

module.exports = new AuthService();
```

---

## 3.6 Authentication Controller

**Create `src/controllers/auth.controller.js`:**

```jsx
// src/controllers/auth.controller.js
// The receptionist - handles incoming auth requests

const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/responses');

class AuthController {
    /**
     * POST /api/v1/auth/register
     * Register a new user
     */
    async register(req, res, next) {
        try {
            const { email, phone, password, role } = req.body;
            
            const result = await authService.register({
                email,
                phone,
                password,
                role,
            });
            
            return successResponse(res, 201, 'Registration successful', result);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/verify-email
     * Verify email with token
     */
    async verifyEmail(req, res, next) {
        try {
            const { token } = req.body;
            
            const result = await authService.verifyEmail(token);
            
            return successResponse(res, 200, 'Email verified', result);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/login
     * Login user
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            
            const result = await authService.login({ email, password });
            
            // Set refresh token as HTTP-only cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });
            
            // Don't send refresh token in response body
            delete result.tokens.refreshToken;
            
            return successResponse(res, 200, 'Login successful', result);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/refresh-token
     * Get new access token using refresh token
     */
    async refreshToken(req, res, next) {
        try {
            const refreshToken = req.cookies.refreshToken;
            
            if (!refreshToken) {
                return errorResponse(res, 401, 'Refresh token not found');
            }
            
            const tokens = await authService.refreshToken(refreshToken);
            
            // Set new refresh token
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            
            return successResponse(res, 200, 'Token refreshed', {
                accessToken: tokens.accessToken,
            });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/logout
     * Logout user
     */
    async logout(req, res, next) {
        try {
            await authService.logout([req.user.id](http://req.user.id));
            
            // Clear refresh token cookie
            res.clearCookie('refreshToken');
            
            return successResponse(res, 200, 'Logged out successfully');
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/forgot-password
     * Request password reset
     */
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            
            const result = await authService.forgotPassword(email);
            
            return successResponse(res, 200, result.message);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/reset-password
     * Reset password with token
     */
    async resetPassword(req, res, next) {
        try {
            const { token, password } = req.body;
            
            const result = await authService.resetPassword(token, password);
            
            return successResponse(res, 200, result.message);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * POST /api/v1/auth/change-password
     * Change password (when logged in)
     */
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            
            const result = await authService.changePassword(
                [req.user.id](http://req.user.id),
                currentPassword,
                newPassword
            );
            
            return successResponse(res, 200, result.message);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * GET /api/v1/auth/me
     * Get current user info
     */
    async getMe(req, res, next) {
        try {
            return successResponse(res, 200, 'User info retrieved', {
                user: req.user,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
```

---

## 3.7 Authentication Routes

**Create `src/routes/auth.routes.js`:**

```jsx
// src/routes/auth.routes.js
// The signposts - directing auth requests to the right handlers

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { body } = require('express-validator');

// Validation rules
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('role')
        .isIn(['artist', 'organizer', 'venue'])
        .withMessage('Role must be artist, organizer, or venue'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
];

const passwordValidation = [
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
];

// Public routes (no authentication required)
[router.post](http://router.post)('/register', registerValidation, validate, authController.register);
[router.post](http://router.post)('/verify-email', authController.verifyEmail);
[router.post](http://router.post)('/login', loginValidation, validate, authController.login);
[router.post](http://router.post)('/forgot-password', authController.forgotPassword);
[router.post](http://router.post)('/reset-password', passwordValidation, validate, authController.resetPassword);
[router.post](http://router.post)('/refresh-token', authController.refreshToken);

// Protected routes (authentication required)
router.use(authenticate); // All routes below require authentication

[router.post](http://router.post)('/logout', authController.logout);
[router.post](http://router.post)('/change-password', passwordValidation, validate, authController.changePassword);
router.get('/me', authController.getMe);

module.exports = router;
```

---

## 3.8 Role-Based Access Control (RBAC)

Our platform has multiple user roles with different permissions:

| Role | Description | Permissions |
| --- | --- | --- |
| **artist** | Musicians/DJs | Browse gigs, apply, manage profile, view bookings |
| **organizer** | Event promoters | Post opportunities, review applications, manage bookings |
| **venue** | Clubs/venues | List venue, programming mode, manage calendar |
| **curator** | Platform curators | All of above + curation features |
| **admin** | Administrators | Full system access |

**Create `src/config/permissions.js`:**

```jsx
// src/config/permissions.js
// The rulebook - defining who can do what

const permissions = {
    // Artist permissions
    artist: [
        'profile:read',
        'profile:update',
        'opportunities:browse',
        'opportunities:apply',
        'applications:read:own',
        'applications:withdraw:own',
        'bookings:read:own',
        'contracts:read:own',
        'contracts:sign:own',
        'payments:read:own',
        'calendar:read:own',
        'calendar:update:own',
        'notifications:read:own',
    ],
    
    // Organizer permissions
    organizer: [
        'profile:read',
        'profile:update',
        'opportunities:create',
        'opportunities:read:own',
        'opportunities:update:own',
        'opportunities:delete:own',
        'applications:read:own',
        'applications:respond:own',
        'artists:browse',
        'artists:view',
        'bookings:read:own',
        'bookings:create',
        'contracts:read:own',
        'contracts:sign:own',
        'payments:create:own',
        'payments:read:own',
        'venues:browse',
        'notifications:read:own',
    ],
    
    // Venue permissions
    venue: [
        'profile:read',
        'profile:update',
        'opportunities:create',
        'opportunities:read:own',
        'opportunities:update:own',
        'opportunities:delete:own',
        'applications:read:own',
        'applications:respond:own',
        'artists:browse',
        'artists:view',
        'bookings:read:own',
        'programming:access',
        'programming:manage',
        'calendar:read:own',
        'calendar:update:own',
        'contracts:read:own',
        'contracts:sign:own',
        'payments:create:own',
        'payments:read:own',
        'notifications:read:own',
    ],
    
    // Curator permissions (includes artist viewing + curation)
    curator: [
        'profile:read',
        'profile:update',
        'opportunities:browse',
        'opportunities:create',
        'opportunities:read:all',
        'artists:browse',
        'artists:view',
        'artists:recommend',
        'bookings:read:all',
        'programming:create',
        'programming:manage',
        'analytics:read',
        'notifications:read:own',
    ],
    
    // Admin permissions (full access)
    admin: [
        '*', // Wildcard for all permissions
    ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
    const rolePermissions = permissions[role] || [];
    
    // Admin has all permissions
    if (rolePermissions.includes('*')) {
        return true;
    }
    
    // Check for exact permission
    if (rolePermissions.includes(permission)) {
        return true;
    }
    
    // Check for wildcard permission (e.g., 'bookings:*')
    const [resource, action] = permission.split(':');
    if (rolePermissions.includes(`${resource}:*`)) {
        return true;
    }
    
    return false;
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {array}
 */
const getRolePermissions = (role) => {
    return permissions[role] || [];
};

module.exports = {
    permissions,
    hasPermission,
    getRolePermissions,
};
```

---

<aside>
📖

**The Story So Far:** We've built our authentication system. Now we need to create the protective layers that guard every request—the middleware. Think of middleware as the series of checkpoints between the user's request and your precious data.

</aside>

---

## 4.1 Understanding the Middleware Chain

Every request flows through our middleware like water through filters:

```
User Request
     │
     ▼
┌─────────────────┐
│  Rate Limiter   │  ← "Are you making too many requests?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Request Logger │  ← "Let me record this visit"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Checker   │  ← "Who are you? Show me your token!"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Role Checker   │  ← "Are you allowed to do this?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validator      │  ← "Is your data properly formatted?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │  ← "Finally! Let me process your request"
└─────────────────┘
```

---

## 4.2 Rate Limiting Middleware

**Create `src/middleware/rateLimit.middleware.js`:**

```jsx
// src/middleware/rateLimit.middleware.js
// The traffic controller - preventing abuse and ensuring fair access

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all routes
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
    message: {
        status: 'error',
        code: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain IPs (internal services)
    skip: (req) => {
        const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
        return trustedIPs.includes(req.ip);
    },
    // Custom key generator (can use user ID for logged-in users)
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: {
        status: 'error',
        code: 429,
        message: 'Too many login attempts. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Reset on successful login
    skipSuccessfulRequests: true,
});

/**
 * Moderate limiter for sensitive operations
 * Password reset, email verification, etc.
 */
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per 15 minutes
    message: {
        status: 'error',
        code: 429,
        message: 'Too many attempts. Please try again later.',
    },
});

/**
 * Generous limiter for read operations
 */
const readLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        status: 'error',
        code: 429,
        message: 'Rate limit exceeded.',
    },
});

/**
 * Dynamic rate limiter based on trust score
 * Trusted users get more generous limits
 */
const dynamicLimiter = (baseLimit = 100) => {
    return async (req, res, next) => {
        let limit = baseLimit;
        
        if (req.user) {
            const trustScore = req.user.trustScore?.currentScore || 50;
            
            // Adjust limit based on trust score
            if (trustScore >= 85) limit = baseLimit * 2;      // Premium tier
            else if (trustScore >= 70) limit = baseLimit * 1.5; // Trusted tier
            else if (trustScore <= 30) limit = baseLimit * 0.5; // Critical tier
        }
        
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: Math.floor(limit),
            keyGenerator: (req) => req.user?.id || req.ip,
        });
        
        return limiter(req, res, next);
    };
};

module.exports = {
    rateLimiter: generalLimiter,
    authLimiter,
    sensitiveLimiter,
    readLimiter,
    dynamicLimiter,
};
```

---

## 4.3 Authentication Middleware

**Create `src/middleware/auth.middleware.js`:**

```jsx
// src/middleware/auth.middleware.js
// The identity checker - verifying who you are

const { verifyAccessToken } = require('../utils/jwt');
const { User, Artist, Organizer, Venue, TrustScore } = require('../models');

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Access token is required',
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = verifyAccessToken(token);
        
        // Find user in database
        const user = await User.findByPk([decoded.id](http://decoded.id), {
            attributes: { exclude: ['password', 'refreshToken'] },
        });
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'User not found',
            });
        }
        
        // Check user status
        if (user.status === 'banned') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Your account has been banned',
            });
        }
        
        if (user.status === 'suspended') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Your account is suspended',
            });
        }
        
        // Get trust score
        const trustScore = await TrustScore.findOne({
            where: { userId: [user.id](http://user.id) },
        });
        
        // Attach user and trust score to request
        req.user = user.toJSON();
        req.user.trustScore = trustScore ? trustScore.toJSON() : null;
        
        next();
    } catch (error) {
        if (error.message === 'Token has expired') {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Access token has expired',
                expired: true,
            });
        }
        
        return res.status(401).json({
            status: 'error',
            code: 401,
            message: 'Invalid access token',
        });
    }
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);
        
        const user = await User.findByPk([decoded.id](http://decoded.id), {
            attributes: { exclude: ['password', 'refreshToken'] },
        });
        
        if (user && user.status === 'active') {
            req.user = user.toJSON();
        }
        
        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

/**
 * Load full profile based on user role
 */
const loadProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }
        
        let profile = null;
        
        switch (req.user.role) {
            case 'artist':
                profile = await Artist.findOne({ where: { userId: [req.user.id](http://req.user.id) } });
                break;
            case 'organizer':
                profile = await Organizer.findOne({ where: { userId: [req.user.id](http://req.user.id) } });
                break;
            case 'venue':
                profile = await Venue.findOne({ where: { userId: [req.user.id](http://req.user.id) } });
                break;
        }
        
        req.profile = profile ? profile.toJSON() : null;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    optionalAuth,
    loadProfile,
};
```

---

## 4.4 Role-Based Authorization Middleware

**Create `src/middleware/role.middleware.js`:**

```jsx
// src/middleware/role.middleware.js
// The bouncer - checking if you're allowed in

const { hasPermission } = require('../config/permissions');

/**
 * Check if user has one of the allowed roles
 * @param {array} allowedRoles - Array of allowed roles
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Authentication required',
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'You do not have permission to access this resource',
                requiredRoles: allowedRoles,
                yourRole: req.user.role,
            });
        }
        
        next();
    };
};

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission string to check
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Authentication required',
            });
        }
        
        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'You do not have permission to perform this action',
                requiredPermission: permission,
            });
        }
        
        next();
    };
};

/**
 * Check if user owns the resource or is admin
 * @param {function} getOwnerId - Function to extract owner ID from request
 */
const requireOwnership = (getOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Authentication required',
            });
        }
        
        // Admins bypass ownership check
        if (req.user.role === 'admin') {
            return next();
        }
        
        try {
            const ownerId = await getOwnerId(req);
            
            if (ownerId !== [req.user.id](http://req.user.id)) {
                return res.status(403).json({
                    status: 'error',
                    code: 403,
                    message: 'You can only access your own resources',
                });
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Require verified profile
 */
const requireVerified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            code: 401,
            message: 'Authentication required',
        });
    }
    
    // Check email verification
    if (!req.user.emailVerified) {
        return res.status(403).json({
            status: 'error',
            code: 403,
            message: 'Please verify your email to continue',
            action: 'verify_email',
        });
    }
    
    next();
};

/**
 * Require minimum trust score
 * @param {number} minScore - Minimum required trust score
 */
const requireTrustScore = (minScore) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Authentication required',
            });
        }
        
        const currentScore = req.user.trustScore?.currentScore || 0;
        
        if (currentScore < minScore) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: `Your trust score (${currentScore}) is below the required minimum (${minScore})`,
                currentScore,
                requiredScore: minScore,
            });
        }
        
        next();
    };
};

module.exports = {
    requireRole,
    requirePermission,
    requireOwnership,
    requireVerified,
    requireTrustScore,
};
```

---

## 4.5 Request Validation Middleware

**Create `src/middleware/validation.middleware.js`:**

```jsx
// src/middleware/validation.middleware.js
// The quality control - ensuring data integrity

const { validationResult } = require('express-validator');

/**
 * Process validation errors from express-validator
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value,
        }));
        
        return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'Validation failed',
            errors: formattedErrors,
        });
    }
    
    next();
};

/**
 * Sanitize common XSS vectors from string inputs
 */
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove script tags
                obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                // Remove event handlers
                obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
                // Encode HTML entities
                obj[key] = obj[key]
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };
    
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    
    next();
};

/**
 * Validate UUID format
 */
const validateUUID = (paramName) => {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(uuid)) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: `Invalid ${paramName} format`,
            });
        }
        
        next();
    };
};

module.exports = {
    validate,
    sanitizeInput,
    validateUUID,
};
```

---

## 4.6 Error Handling Middleware

**Create `src/middleware/error.middleware.js`:**

```jsx
// src/middleware/error.middleware.js
// The safety net - catching and handling errors gracefully

const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        user: req.user?.id,
    });
    
    // Sequelize validation errors
    if ([err.name](http://err.name) === 'SequelizeValidationError') {
        const errors = [err.errors.map](http://err.errors.map)(e => ({
            field: e.path,
            message: e.message,
        }));
        
        return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'Validation error',
            errors,
        });
    }
    
    // Sequelize unique constraint errors
    if ([err.name](http://err.name) === 'SequelizeUniqueConstraintError') {
        const field = err.errors[0]?.path || 'field';
        return res.status(409).json({
            status: 'error',
            code: 409,
            message: `${field} already exists`,
        });
    }
    
    // Sequelize foreign key constraint errors
    if ([err.name](http://err.name) === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'Invalid reference. The related resource does not exist.',
        });
    }
    
    // JWT errors
    if ([err.name](http://err.name) === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            code: 401,
            message: 'Invalid token',
        });
    }
    
    if ([err.name](http://err.name) === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            code: 401,
            message: 'Token expired',
            expired: true,
        });
    }
    
    // Custom application errors
    if (err.isOperational) {
        return res.status(err.statusCode || 400).json({
            status: 'error',
            code: err.statusCode || 400,
            message: err.message,
        });
    }
    
    // Default error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message;
    
    res.status(statusCode).json({
        status: 'error',
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    AppError,
};
```

---

## 4.7 Logging Middleware

**Create `src/middleware/logging.middleware.js`:**

```jsx
// src/middleware/logging.middleware.js
// The record keeper - tracking all activities

const fs = require('fs');
const path = require('path');

/**
 * Request logger middleware
 * Logs all incoming requests with relevant details
 */
const requestLogger = (req, res, next) => {
    const startTime = [Date.now](http://Date.now)();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to capture response
    res.end = function(chunk, encoding) {
        res.end = originalEnd;
        res.end(chunk, encoding);
        
        const duration = [Date.now](http://Date.now)() - startTime;
        const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous',
            contentLength: res.get('Content-Length') || 0,
        };
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const color = res.statusCode >= 500 ? '\x1b[31m' : 
                          res.statusCode >= 400 ? '\x1b[33m' : 
                          '\x1b[32m';
            console.log(
                `${color}${logData.method}\x1b[0m ${logData.path} ` +
                `${color}${logData.statusCode}\x1b[0m ${logData.duration}`
            );
        }
        
        // In production, write to log file
        if (process.env.NODE_ENV === 'production') {
            const logLine = JSON.stringify(logData) + '\n';
            const logFile = path.join(__dirname, '../../logs/access.log');
            fs.appendFile(logFile, logLine, (err) => {
                if (err) console.error('Failed to write log:', err);
            });
        }
    };
    
    next();
};

/**
 * Audit logger for sensitive operations
 */
const auditLog = (action) => {
    return (req, res, next) => {
        const auditData = {
            timestamp: new Date().toISOString(),
            action,
            userId: req.user?.id,
            userRole: req.user?.role,
            resourceId: [req.params.id](http://req.params.id),
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        };
        
        // Store audit log (in production, send to dedicated audit service)
        console.log('[AUDIT]', auditData);
        
        // Continue with request
        next();
    };
};

module.exports = {
    requestLogger,
    auditLog,
};
```

---

## 4.8 Standard API Response Utilities

**Create `src/utils/responses.js`:**

```jsx
// src/utils/responses.js
// Standardized API responses for consistency

/**
 * Send a success response
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
        status: 'success',
        code: statusCode,
        message,
    };
    
    if (data !== null) {
        [response.data](http://response.data) = data;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
const errorResponse = (res, statusCode = 400, message = 'Error', errors = null) => {
    const response = {
        status: 'error',
        code: statusCode,
        message,
    };
    
    if (errors !== null) {
        response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 */
const paginatedResponse = (res, data, pagination) => {
    return res.status(200).json({
        status: 'success',
        code: 200,
        data,
        pagination: {
            page: [pagination.page](http://pagination.page),
            limit: pagination.limit,
            total: [pagination.total](http://pagination.total),
            totalPages: Math.ceil([pagination.total](http://pagination.total) / pagination.limit),
            hasMore: [pagination.page](http://pagination.page) < Math.ceil([pagination.total](http://pagination.total) / pagination.limit),
        },
    });
};

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
};
```

---

# Chapters 5-7: Core Feature Implementation

<aside>
📖

**The Story So Far:** We've built our foundation—database, authentication, and middleware. Now it's time to bring our platform to life by implementing the core business features that make our music booking platform actually work.

</aside>

---

# Chapter 5: Gig Discovery & Application System

## 5.1 The Story: How Artists Find Gigs

Imagine you're an artist. You've just finished setting up your profile. Now you're eager to find gigs. Here's the journey:

1. **Artist logs in** → Sees dashboard with key metrics
2. **Clicks "Find Gigs"** → System loads filtered opportunities
3. **Browses opportunities** → Filters automatically applied based on profile
4. **Selects interesting gig** → Views full details
5. **Clicks "Apply"** → Submits application with proposed fee
6. **Waits for response** → Gets notification when organizer responds

---

## 5.2 Opportunity Service

**Create `src/services/opportunity.service.js`:**

```jsx
// src/services/opportunity.service.js
// The marketplace - managing gig opportunities

const { Op } = require('sequelize');
const { Opportunity, Venue, Organizer, Application, Artist } = require('../models');
const { AppError } = require('../middleware/error.middleware');

class OpportunityService {
    /**
     * Create a new opportunity (organizer/venue posting a gig)
     */
    async createOpportunity(creatorId, creatorRole, opportunityData) {
        // Get the creator's profile
        let organizerId = null;
        let venueId = null;
        
        if (creatorRole === 'organizer') {
            const organizer = await Organizer.findOne({ where: { userId: creatorId } });
            if (!organizer) throw new AppError('Organizer profile not found', 404);
            organizerId = [organizer.id](http://organizer.id);
            
            // Venue must be specified
            if (!opportunityData.venueId) {
                throw new AppError('Venue must be specified', 400);
            }
            venueId = opportunityData.venueId;
        } else if (creatorRole === 'venue') {
            const venue = await Venue.findOne({ where: { userId: creatorId } });
            if (!venue) throw new AppError('Venue profile not found', 404);
            venueId = [venue.id](http://venue.id);
        }
        
        // Validate dates
        const eventDate = new Date(opportunityData.eventDate);
        if (eventDate < new Date()) {
            throw new AppError('Event date must be in the future', 400);
        }
        
        // Validate budget
        if (opportunityData.budgetMin > opportunityData.budgetMax) {
            throw new AppError('Minimum budget cannot exceed maximum budget', 400);
        }
        
        // Create opportunity
        const opportunity = await Opportunity.create({
            organizerId,
            venueId,
            title: opportunityData.title,
            description: opportunityData.description,
            eventType: opportunityData.eventType,
            eventDate: opportunityData.eventDate,
            slotStartTime: opportunityData.slotStartTime,
            slotEndTime: opportunityData.slotEndTime,
            slotType: opportunityData.slotType,
            requiredGenres: opportunityData.requiredGenres || [],
            experienceLevelRequired: opportunityData.experienceLevelRequired || 'any',
            performanceDuration: opportunityData.performanceDuration,
            budgetMin: opportunityData.budgetMin,
            budgetMax: opportunityData.budgetMax,
            expectedAudience: opportunityData.expectedAudience,
            specialRequirements: opportunityData.specialRequirements,
            travelIncluded: opportunityData.travelIncluded || false,
            accommodationIncluded: opportunityData.accommodationIncluded || false,
            applicationDeadline: opportunityData.applicationDeadline,
            maxApplications: opportunityData.maxApplications || 50,
            status: 'active',
        });
        
        return opportunity;
    }
    
    /**
     * Get opportunities for artists (filtered by their profile)
     */
    async getOpportunitiesForArtist(artistId, filters = {}) {
        // Get artist profile for smart filtering
        const artist = await Artist.findByPk(artistId);
        if (!artist) throw new AppError('Artist profile not found', 404);
        
        // Build where clause
        const where = {
            status: 'active',
            eventDate: { [Op.gte]: new Date() }, // Future events only
        };
        
        // Budget filter - show opportunities within artist's range
        if (!filters.ignoreBudgetFilter) {
            where.budgetMax = { [Op.gte]: artist.minimumFee || 0 };
        }
        
        // Genre filter
        if (filters.genres && filters.genres.length > 0) {
            where.requiredGenres = { [Op.overlap]: filters.genres };
        } else if (!filters.ignoreGenreFilter) {
            // Default: match artist's genres
            const artistGenres = [artist.primaryGenre, ...(artist.secondaryGenres || [])];
            where.requiredGenres = { [Op.overlap]: artistGenres };
        }
        
        // Location filter
        if ([filters.city](http://filters.city)) {
            where['$[venue.city](http://venue.city)$'] = [filters.city](http://filters.city);
        }
        
        // Date range filter
        if (filters.dateFrom) {
            where.eventDate = { ...where.eventDate, [Op.gte]: new Date(filters.dateFrom) };
        }
        if (filters.dateTo) {
            where.eventDate = { ...where.eventDate, [Op.lte]: new Date(filters.dateTo) };
        }
        
        // Slot type filter
        if (filters.slotType) {
            where.slotType = filters.slotType;
        }
        
        // Pagination
        const page = parseInt([filters.page](http://filters.page)) || 1;
        const limit = parseInt(filters.limit) || 20;
        const offset = (page - 1) * limit;
        
        // Query opportunities
        const { rows: opportunities, count: total } = await Opportunity.findAndCountAll({
            where,
            include: [
                {
                    model: Venue,
                    as: 'venue',
                    attributes: ['id', 'venueName', 'city', 'venueType', 'photos'],
                },
                {
                    model: Organizer,
                    as: 'organizer',
                    attributes: ['id', 'organizationName'],
                },
            ],
            order: [
                ['eventDate', 'ASC'],
                ['createdAt', 'DESC'],
            ],
            limit,
            offset,
        });
        
        // Calculate match score for each opportunity
        const opportunitiesWithScore = [opportunities.map](http://opportunities.map)(opp => {
            const matchScore = this.calculateMatchScore(opp, artist);
            return {
                ...opp.toJSON(),
                matchScore,
            };
        });
        
        // Sort by match score
        opportunitiesWithScore.sort((a, b) => b.matchScore - a.matchScore);
        
        return {
            opportunities: opportunitiesWithScore,
            pagination: { page, limit, total },
        };
    }
    
    /**
     * Calculate how well an opportunity matches an artist
     */
    calculateMatchScore(opportunity, artist) {
        let score = 0;
        const maxScore = 100;
        
        // Genre match (40 points)
        const artistGenres = [artist.primaryGenre, ...(artist.secondaryGenres || [])];
        const oppGenres = opportunity.requiredGenres || [];
        const genreMatches = artistGenres.filter(g => oppGenres.includes(g)).length;
        score += Math.min(40, (genreMatches / Math.max(oppGenres.length, 1)) * 40);
        
        // Budget alignment (30 points)
        const artistFee = artist.standardFee || artist.minimumFee || 0;
        const budgetMid = (opportunity.budgetMin + opportunity.budgetMax) / 2;
        if (artistFee >= opportunity.budgetMin && artistFee <= opportunity.budgetMax) {
            score += 30; // Perfect fit
        } else if (artistFee < opportunity.budgetMin) {
            score += 20; // Under budget (still good)
        } else {
            const overBy = (artistFee - opportunity.budgetMax) / opportunity.budgetMax;
            score += Math.max(0, 20 - (overBy * 50)); // Penalty for over budget
        }
        
        // Experience level match (20 points)
        const expLevels = ['beginner', 'intermediate', 'professional', 'veteran'];
        const artistExp = expLevels.indexOf(artist.experienceLevel);
        const reqExp = expLevels.indexOf(opportunity.experienceLevelRequired);
        if (opportunity.experienceLevelRequired === 'any' || artistExp >= reqExp) {
            score += 20;
        } else {
            score += 10; // Partial match
        }
        
        // Location proximity (10 points) - simplified version
        if ([artist.city](http://artist.city) === opportunity.venue?.city) {
            score += 10;
        } else {
            score += 5; // Different city but still applicable
        }
        
        return Math.round(score);
    }
    
    /**
     * Get single opportunity details
     */
    async getOpportunityById(opportunityId, requesterId = null) {
        const opportunity = await Opportunity.findByPk(opportunityId, {
            include: [
                {
                    model: Venue,
                    as: 'venue',
                    attributes: ['id', 'venueName', 'city', 'state', 'address', 'venueType', 
                                 'standingCapacity', 'photos', 'soundSystem', 'preferredGenres'],
                },
                {
                    model: Organizer,
                    as: 'organizer',
                    attributes: ['id', 'organizationName', 'verificationStatus'],
                    include: [{
                        model: require('../models').User,
                        as: 'user',
                        include: [{
                            model: require('../models').TrustScore,
                            as: 'trustScore',
                            attributes: ['currentScore', 'tier'],
                        }],
                    }],
                },
            ],
        });
        
        if (!opportunity) {
            throw new AppError('Opportunity not found', 404);
        }
        
        // Increment view count
        await opportunity.increment('viewCount');
        
        // Check if requester has already applied
        let hasApplied = false;
        let application = null;
        if (requesterId) {
            const artist = await Artist.findOne({ where: { userId: requesterId } });
            if (artist) {
                application = await Application.findOne({
                    where: { opportunityId, artistId: [artist.id](http://artist.id) },
                });
                hasApplied = !!application;
            }
        }
        
        return {
            ...opportunity.toJSON(),
            hasApplied,
            application: application?.toJSON(),
        };
    }
}

module.exports = new OpportunityService();
```

---

## 5.3 Application Service

**Create `src/services/application.service.js`:**

```jsx
// src/services/application.service.js
// The application system - artists applying for gigs

const { Op } = require('sequelize');
const { Application, Opportunity, Artist, TrustScore, User } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const notificationService = require('./notification.service');
const dayjs = require('dayjs');

class ApplicationService {
    /**
     * Artist applies for an opportunity
     */
    async applyForOpportunity(userId, opportunityId, applicationData) {
        // Get artist profile
        const artist = await Artist.findOne({
            where: { userId },
            include: [{
                model: User,
                as: 'user',
                include: [{ model: TrustScore, as: 'trustScore' }],
            }],
        });
        
        if (!artist) {
            throw new AppError('Artist profile not found', 404);
        }
        
        // Check verification status
        if (artist.verificationStatus !== 'approved') {
            throw new AppError('Your profile must be verified before applying', 403);
        }
        
        // Get opportunity
        const opportunity = await Opportunity.findByPk(opportunityId);
        
        if (!opportunity) {
            throw new AppError('Opportunity not found', 404);
        }
        
        // Check if opportunity is still active
        if (opportunity.status !== 'active') {
            throw new AppError('This opportunity is no longer accepting applications', 400);
        }
        
        // Check if deadline passed
        if (opportunity.applicationDeadline && dayjs().isAfter(opportunity.applicationDeadline)) {
            throw new AppError('Application deadline has passed', 400);
        }
        
        // Check if already applied
        const existingApplication = await Application.findOne({
            where: { opportunityId, artistId: [artist.id](http://artist.id) },
        });
        
        if (existingApplication) {
            throw new AppError('You have already applied for this opportunity', 400);
        }
        
        // Check application limits based on trust score
        const trustScore = artist.user?.trustScore?.currentScore || 50;
        let maxPending;
        if (trustScore < 60) maxPending = 5;
        else if (trustScore < 80) maxPending = 10;
        else maxPending = 20;
        
        const pendingCount = await Application.count({
            where: {
                artistId: [artist.id](http://artist.id),
                status: { [[Op.in](http://Op.in)]: ['pending', 'viewed', 'shortlisted'] },
            },
        });
        
        if (pendingCount >= maxPending) {
            throw new AppError(
                `You have reached your limit of ${maxPending} pending applications. ` +
                'Wait for responses or withdraw existing applications.',
                400
            );
        }
        
        // Check for date conflicts
        const existingBooking = await require('../models').Booking.findOne({
            where: {
                artistId: [artist.id](http://artist.id),
                eventDate: opportunity.eventDate,
                status: { [Op.notIn]: ['cancelled', 'disputed'] },
            },
        });
        
        if (existingBooking) {
            throw new AppError('You already have a booking on this date', 400);
        }
        
        // Calculate match score
        const matchScore = this.calculateMatchScore(opportunity, artist);
        
        // Create application
        const application = await Application.create({
            opportunityId,
            artistId: [artist.id](http://artist.id),
            proposedFee: applicationData.proposedFee,
            willingToNegotiate: applicationData.willingToNegotiate ?? true,
            personalMessage: applicationData.personalMessage,
            preferredSlotTime: applicationData.preferredSlotTime || 'any',
            status: 'pending',
            expiresAt: dayjs().add(48, 'hours').toDate(),
            matchScore,
        });
        
        // Update opportunity application count
        await opportunity.increment('currentApplications');
        
        // Update artist's pending application count
        await artist.increment('pendingApplicationsCount');
        
        // Notify organizer
        await notificationService.sendNotification({
            userId: opportunity.organizer?.userId || opportunity.venue?.userId,
            type: 'new_application',
            title: 'New Application Received',
            message: `${artist.artistName} has applied for "${opportunity.title}"`,
            data: { applicationId: [application.id](http://application.id), opportunityId },
        });
        
        return application;
    }
    
    /**
     * Get applications for an artist
     */
    async getArtistApplications(userId, filters = {}) {
        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) throw new AppError('Artist profile not found', 404);
        
        const where = { artistId: [artist.id](http://artist.id) };
        
        if (filters.status) {
            where.status = filters.status;
        }
        
        const page = parseInt([filters.page](http://filters.page)) || 1;
        const limit = parseInt(filters.limit) || 20;
        const offset = (page - 1) * limit;
        
        const { rows: applications, count: total } = await Application.findAndCountAll({
            where,
            include: [{
                model: Opportunity,
                as: 'opportunity',
                include: [
                    { model: require('../models').Venue, as: 'venue', attributes: ['venueName', 'city'] },
                ],
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
        
        return {
            applications,
            pagination: { page, limit, total },
        };
    }
    
    /**
     * Get applications for an opportunity (organizer view)
     */
    async getOpportunityApplications(userId, opportunityId, filters = {}) {
        // Verify ownership
        const opportunity = await Opportunity.findByPk(opportunityId);
        if (!opportunity) throw new AppError('Opportunity not found', 404);
        
        // Check if user owns this opportunity
        const organizer = await require('../models').Organizer.findOne({ where: { userId } });
        const venue = await require('../models').Venue.findOne({ where: { userId } });
        
        if (opportunity.organizerId !== organizer?.id && opportunity.venueId !== venue?.id) {
            throw new AppError('You do not have access to these applications', 403);
        }
        
        const where = { opportunityId };
        
        if (filters.status) {
            where.status = filters.status;
        }
        
        const applications = await Application.findAll({
            where,
            include: [{
                model: Artist,
                as: 'artist',
                attributes: ['id', 'artistName', 'profilePhoto', 'primaryGenre', 
                           'experienceLevel', 'minimumFee', 'standardFee', 'city',
                           'soundcloudUrl', 'instagramHandle'],
                include: [{
                    model: User,
                    as: 'user',
                    include: [{ model: TrustScore, as: 'trustScore' }],
                }],
            }],
            order: [
                ['matchScore', 'DESC'],
                ['createdAt', 'ASC'],
            ],
        });
        
        return applications;
    }
    
    /**
     * Respond to an application (organizer action)
     */
    async respondToApplication(userId, applicationId, response) {
        const application = await Application.findByPk(applicationId, {
            include: [
                { model: Opportunity, as: 'opportunity' },
                { model: Artist, as: 'artist' },
            ],
        });
        
        if (!application) throw new AppError('Application not found', 404);
        
        // Verify ownership
        const organizer = await require('../models').Organizer.findOne({ where: { userId } });
        const venue = await require('../models').Venue.findOne({ where: { userId } });
        
        if (application.opportunity.organizerId !== organizer?.id && 
            application.opportunity.venueId !== venue?.id) {
            throw new AppError('You do not have permission to respond to this application', 403);
        }
        
        // Check if already responded
        if (!['pending', 'viewed', 'shortlisted'].includes(application.status)) {
            throw new AppError('This application has already been processed', 400);
        }
        
        const { action, counterOffer, message } = response;
        
        switch (action) {
            case 'accept':
                application.status = 'accepted';
                application.respondedAt = new Date();
                application.responseMessage = message;
                
                // This will trigger booking creation flow
                // Handled in booking.service.js
                break;
                
            case 'decline':
                application.status = 'declined';
                application.respondedAt = new Date();
                application.declineReason = message;
                
                // Free up artist's application slot
                await application.artist.decrement('pendingApplicationsCount');
                break;
                
            case 'counter':
                application.status = 'counter_offered';
                application.respondedAt = new Date();
                application.responseMessage = message;
                
                // Create negotiation record
                await require('./negotiation.service').createNegotiation(
                    applicationId,
                    counterOffer
                );
                break;
                
            case 'shortlist':
                application.status = 'shortlisted';
                break;
                
            default:
                throw new AppError('Invalid action', 400);
        }
        
        await [application.save](http://application.save)();
        
        // Notify artist
        await notificationService.sendNotification({
            userId: application.artist.userId,
            type: `application_${action}`,
            title: action === 'accept' ? '🎉 Application Accepted!' :
                   action === 'decline' ? 'Application Update' :
                   action === 'counter' ? 'Counter Offer Received' :
                   'Application Shortlisted',
            message: this.getNotificationMessage(action, application),
            data: { applicationId, opportunityId: application.opportunityId },
        });
        
        return application;
    }
    
    /**
     * Withdraw an application (artist action)
     */
    async withdrawApplication(userId, applicationId) {
        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) throw new AppError('Artist profile not found', 404);
        
        const application = await Application.findOne({
            where: { id: applicationId, artistId: [artist.id](http://artist.id) },
            include: [{ model: Opportunity, as: 'opportunity' }],
        });
        
        if (!application) throw new AppError('Application not found', 404);
        
        if (!['pending', 'viewed', 'shortlisted', 'counter_offered'].includes(application.status)) {
            throw new AppError('Cannot withdraw this application', 400);
        }
        
        application.status = 'withdrawn';
        await [application.save](http://application.save)();
        
        // Free up application slot
        await artist.decrement('pendingApplicationsCount');
        await application.opportunity.decrement('currentApplications');
        
        return { message: 'Application withdrawn successfully' };
    }
    
    getNotificationMessage(action, application) {
        const oppTitle = application.opportunity.title;
        switch (action) {
            case 'accept':
                return `Congratulations! Your application for "${oppTitle}" has been accepted!`;
            case 'decline':
                return `Your application for "${oppTitle}" was not selected.`;
            case 'counter':
                return `The organizer has made a counter offer for "${oppTitle}". Review and respond.`;
            case 'shortlist':
                return `You've been shortlisted for "${oppTitle}"!`;
            default:
                return 'Application status updated';
        }
    }
    
    calculateMatchScore(opportunity, artist) {
        // Reuse from opportunity service
        return require('./opportunity.service').calculateMatchScore(opportunity, artist);
    }
}

module.exports = new ApplicationService();
```

---

# Chapter 6: Negotiation Engine

## 6.1 The Story: How Negotiations Work

When an organizer receives an application, they have options:

1. **Accept** - Move directly to contract
2. **Decline** - Reject the application
3. **Counter Offer** - Start negotiation

Negotiations have strict rules:

- Maximum **3 rounds** of back-and-forth
- **24 hours** to respond to each round
- Only **limited parameters** can be negotiated (fee, slot time, duration)
- Dates are almost never changeable

---

## 6.2 Negotiation Model

**Create `src/models/Negotiation.model.js`:**

```jsx
// src/models/Negotiation.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Negotiation = sequelize.define('Negotiation', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        applicationId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'application_id',
            references: { model: 'applications', key: 'id' },
        },
        // Current round (1-3)
        currentRound: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            field: 'current_round',
            validate: { min: 1, max: 3 },
        },
        maxRounds: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            field: 'max_rounds',
        },
        // Current state
        status: {
            type: DataTypes.ENUM(
                'pending_artist_response',
                'pending_organizer_response',
                'accepted',
                'declined',
                'expired'
            ),
            defaultValue: 'pending_artist_response',
        },
        // Original terms (from application)
        originalTerms: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'original_terms',
        },
        // Current proposed terms
        currentTerms: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'current_terms',
        },
        // History of all offers
        offerHistory: {
            type: DataTypes.JSONB,
            defaultValue: [],
            field: 'offer_history',
        },
        // Deadline for current response
        responseDeadline: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'response_deadline',
        },
        // Who made the last offer
        lastOfferBy: {
            type: DataTypes.ENUM('artist', 'organizer'),
            field: 'last_offer_by',
        },
    }, {
        tableName: 'negotiations',
        indexes: [
            { fields: ['application_id'], unique: true },
            { fields: ['status'] },
            { fields: ['response_deadline'] },
        ],
    });

    return Negotiation;
};
```

---

## 6.3 Negotiation Service

**Create `src/services/negotiation.service.js`:**

```jsx
// src/services/negotiation.service.js
// The negotiation engine - structured back-and-forth

const { Negotiation, Application, Opportunity, Artist, User } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const notificationService = require('./notification.service');
const dayjs = require('dayjs');

class NegotiationService {
    /**
     * Create a negotiation when organizer makes counter offer
     */
    async createNegotiation(applicationId, counterOffer) {
        const application = await Application.findByPk(applicationId, {
            include: [{ model: Opportunity, as: 'opportunity' }],
        });
        
        if (!application) throw new AppError('Application not found', 404);
        
        // Check if negotiation already exists
        const existing = await Negotiation.findOne({ where: { applicationId } });
        if (existing) throw new AppError('Negotiation already exists', 400);
        
        // Validate counter offer parameters
        this.validateCounterOffer(counterOffer, application);
        
        const originalTerms = {
            proposedFee: application.proposedFee,
            slotType: application.preferredSlotTime,
            performanceDuration: application.opportunity.performanceDuration,
        };
        
        const currentTerms = {
            proposedFee: counterOffer.fee || originalTerms.proposedFee,
            slotType: counterOffer.slotType || originalTerms.slotType,
            performanceDuration: counterOffer.duration || originalTerms.performanceDuration,
            message: counterOffer.message,
        };
        
        const negotiation = await Negotiation.create({
            applicationId,
            currentRound: 1,
            status: 'pending_artist_response',
            originalTerms,
            currentTerms,
            offerHistory: [{
                round: 1,
                by: 'organizer',
                terms: currentTerms,
                timestamp: new Date(),
            }],
            responseDeadline: dayjs().add(24, 'hours').toDate(),
            lastOfferBy: 'organizer',
        });
        
        return negotiation;
    }
    
    /**
     * Artist responds to negotiation
     */
    async artistRespond(userId, negotiationId, response) {
        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) throw new AppError('Artist profile not found', 404);
        
        const negotiation = await Negotiation.findByPk(negotiationId, {
            include: [{
                model: Application,
                as: 'application',
                include: [{ model: Opportunity, as: 'opportunity' }],
            }],
        });
        
        if (!negotiation) throw new AppError('Negotiation not found', 404);
        
        // Verify artist owns this application
        if (negotiation.application.artistId !== [artist.id](http://artist.id)) {
            throw new AppError('You do not have access to this negotiation', 403);
        }
        
        // Check if it's artist's turn
        if (negotiation.status !== 'pending_artist_response') {
            throw new AppError('It is not your turn to respond', 400);
        }
        
        // Check deadline
        if (dayjs().isAfter(negotiation.responseDeadline)) {
            negotiation.status = 'expired';
            await [negotiation.save](http://negotiation.save)();
            throw new AppError('Response deadline has passed', 400);
        }
        
        const { action, counterTerms } = response;
        
        switch (action) {
            case 'accept':
                return this.acceptNegotiation(negotiation);
                
            case 'decline':
                return this.declineNegotiation(negotiation, 'artist');
                
            case 'counter':
                return this.makeCounterOffer(negotiation, counterTerms, 'artist');
                
            default:
                throw new AppError('Invalid action', 400);
        }
    }
    
    /**
     * Organizer responds to artist's counter
     */
    async organizerRespond(userId, negotiationId, response) {
        const negotiation = await Negotiation.findByPk(negotiationId, {
            include: [{
                model: Application,
                as: 'application',
                include: [{ model: Opportunity, as: 'opportunity' }],
            }],
        });
        
        if (!negotiation) throw new AppError('Negotiation not found', 404);
        
        // Verify organizer owns this opportunity
        const opportunity = negotiation.application.opportunity;
        const organizer = await require('../models').Organizer.findOne({ where: { userId } });
        const venue = await require('../models').Venue.findOne({ where: { userId } });
        
        if (opportunity.organizerId !== organizer?.id && opportunity.venueId !== venue?.id) {
            throw new AppError('You do not have access to this negotiation', 403);
        }
        
        // Check if it's organizer's turn
        if (negotiation.status !== 'pending_organizer_response') {
            throw new AppError('It is not your turn to respond', 400);
        }
        
        const { action, counterTerms } = response;
        
        switch (action) {
            case 'accept':
                return this.acceptNegotiation(negotiation);
                
            case 'decline':
                return this.declineNegotiation(negotiation, 'organizer');
                
            case 'counter':
                return this.makeCounterOffer(negotiation, counterTerms, 'organizer');
                
            default:
                throw new AppError('Invalid action', 400);
        }
    }
    
    /**
     * Make a counter offer
     */
    async makeCounterOffer(negotiation, counterTerms, by) {
        // Check if max rounds reached
        if (negotiation.currentRound >= negotiation.maxRounds) {
            throw new AppError(
                'Maximum negotiation rounds reached. You must either accept or decline.',
                400
            );
        }
        
        // Validate counter terms
        this.validateCounterTerms(counterTerms, negotiation);
        
        // Update negotiation
        const newTerms = {
            proposedFee: counterTerms.fee || negotiation.currentTerms.proposedFee,
            slotType: counterTerms.slotType || negotiation.currentTerms.slotType,
            performanceDuration: counterTerms.duration || negotiation.currentTerms.performanceDuration,
            message: counterTerms.message,
        };
        
        negotiation.currentRound += 1;
        negotiation.currentTerms = newTerms;
        negotiation.offerHistory = [
            ...negotiation.offerHistory,
            {
                round: negotiation.currentRound,
                by,
                terms: newTerms,
                timestamp: new Date(),
            },
        ];
        negotiation.status = by === 'artist' ? 'pending_organizer_response' : 'pending_artist_response';
        negotiation.responseDeadline = dayjs().add(24, 'hours').toDate();
        negotiation.lastOfferBy = by;
        
        await [negotiation.save](http://negotiation.save)();
        
        // Notify other party
        // ... notification logic
        
        return negotiation;
    }
    
    /**
     * Accept current terms
     */
    async acceptNegotiation(negotiation) {
        negotiation.status = 'accepted';
        await [negotiation.save](http://negotiation.save)();
        
        // Update application status
        await Application.update(
            { status: 'accepted' },
            { where: { id: negotiation.applicationId } }
        );
        
        // Trigger booking creation
        const booking = await require('./booking.service').createBookingFromNegotiation(
            negotiation
        );
        
        return { negotiation, booking };
    }
    
    /**
     * Decline negotiation
     */
    async declineNegotiation(negotiation, by) {
        negotiation.status = 'declined';
        await [negotiation.save](http://negotiation.save)();
        
        // Update application
        await Application.update(
            { status: 'declined', declineReason: `Negotiation declined by ${by}` },
            { where: { id: negotiation.applicationId } }
        );
        
        // Free up artist's application slot
        const application = await Application.findByPk(negotiation.applicationId);
        const artist = await Artist.findByPk(application.artistId);
        await artist.decrement('pendingApplicationsCount');
        
        return negotiation;
    }
    
    /**
     * Validate counter offer parameters
     */
    validateCounterOffer(offer, application) {
        const opp = application.opportunity;
        
        // Fee must be within reasonable range (20% variance)
        if (offer.fee) {
            const originalFee = parseFloat(application.proposedFee);
            const maxVariance = originalFee * 0.2;
            if (Math.abs(offer.fee - originalFee) > maxVariance) {
                throw new AppError(
                    'Counter offer fee cannot vary more than 20% from original',
                    400
                );
            }
        }
        
        // Slot type must be valid
        if (offer.slotType && !['opening', 'mid', 'closing', 'headliner'].includes(offer.slotType)) {
            throw new AppError('Invalid slot type', 400);
        }
    }
    
    validateCounterTerms(terms, negotiation) {
        // Similar validation logic
        // Ensure terms don't deviate too far from original
    }
}

module.exports = new NegotiationService();
```

---

# Chapter 7: Booking Creation & Management

## 7.1 The Story: From Acceptance to Booking

When an application is accepted (directly or through negotiation):

1. **Booking record created** with agreed terms
2. **Contract generation triggered**
3. **Payment schedule initialized**
4. **Calendars updated**
5. **Notifications sent**

---

## 7.2 Booking Service

**Create `src/services/booking.service.js`:**

```jsx
// src/services/booking.service.js
// The booking manager - orchestrating confirmed engagements

const { Booking, Application, Opportunity, Artist, Organizer, Venue, Contract, Payment } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const contractService = require('./contract.service');
const paymentService = require('./payment.service');
const notificationService = require('./notification.service');
const trustScoreService = require('./trustScore.service');

class BookingService {
    /**
     * Create booking from accepted application
     */
    async createBookingFromApplication(application) {
        const opportunity = await Opportunity.findByPk(application.opportunityId, {
            include: [
                { model: Venue, as: 'venue' },
                { model: Organizer, as: 'organizer' },
            ],
        });
        
        const artist = await Artist.findByPk(application.artistId);
        
        // Calculate commission based on trust scores
        const artistTrustScore = await trustScoreService.getScore(artist.userId);
        const commissionPercentage = this.calculateCommission(artistTrustScore);
        const agreedFee = parseFloat(application.proposedFee);
        const platformCommission = agreedFee * (commissionPercentage / 100);
        
        // Create booking
        const booking = await Booking.create({
            opportunityId: [opportunity.id](http://opportunity.id),
            artistId: [artist.id](http://artist.id),
            organizerId: opportunity.organizerId,
            venueId: opportunity.venueId,
            eventDate: opportunity.eventDate,
            slotStartTime: opportunity.slotStartTime,
            slotEndTime: opportunity.slotEndTime,
            slotType: opportunity.slotType,
            performanceDuration: opportunity.performanceDuration,
            agreedFee,
            platformCommission,
            commissionPercentage,
            travelIncluded: opportunity.travelIncluded,
            accommodationIncluded: opportunity.accommodationIncluded,
            status: 'pending_contract',
        });
        
        // Close the opportunity
        await opportunity.update({ status: 'filled' });
        
        // Decline other applications
        await Application.update(
            { status: 'declined', declineReason: 'Opportunity filled with another artist' },
            {
                where: {
                    opportunityId: [opportunity.id](http://opportunity.id),
                    id: { [require('sequelize').[Op.ne](http://Op.ne)]: [application.id](http://application.id) },
                    status: { [require('sequelize').[Op.in](http://Op.in)]: ['pending', 'viewed', 'shortlisted'] },
                },
            }
        );
        
        // Generate contract
        const contract = await contractService.generateContract(booking);
        
        // Update booking status
        await booking.update({ status: 'contract_sent' });
        
        // Notify both parties
        await this.sendBookingNotifications(booking, artist, opportunity);
        
        return booking;
    }
    
    /**
     * Create booking from negotiation acceptance
     */
    async createBookingFromNegotiation(negotiation) {
        const application = await Application.findByPk(negotiation.applicationId, {
            include: [{ model: Opportunity, as: 'opportunity' }],
        });
        
        // Use negotiated terms
        application.proposedFee = negotiation.currentTerms.proposedFee;
        
        return this.createBookingFromApplication(application);
    }
    
    /**
     * Calculate platform commission based on trust score
     */
    calculateCommission(trustScore) {
        const score = trustScore?.currentScore || 50;
        
        if (score >= 86) return 2.0;   // Premium tier
        if (score >= 71) return 2.5;   // Trusted tier
        if (score >= 51) return 3.0;   // Standard tier
        if (score >= 31) return 4.0;   // High risk
        return 5.0;                     // Critical risk
    }
    
    /**
     * Get booking details
     */
    async getBookingById(bookingId, userId) {
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Artist, as: 'artist' },
                { model: Organizer, as: 'organizer' },
                { model: Venue, as: 'venue' },
                { model: Contract, as: 'contract' },
                { model: Payment, as: 'payments' },
            ],
        });
        
        if (!booking) throw new AppError('Booking not found', 404);
        
        // Verify access
        const hasAccess = await this.verifyBookingAccess(booking, userId);
        if (!hasAccess) throw new AppError('You do not have access to this booking', 403);
        
        return booking;
    }
    
    /**
     * Update booking checklist
     */
    async updateChecklist(bookingId, userId, checklistUpdates) {
        const booking = await this.getBookingById(bookingId, userId);
        
        const currentChecklist = booking.checklist || {};
        const updatedChecklist = { ...currentChecklist, ...checklistUpdates };
        
        await booking.update({ checklist: updatedChecklist });
        
        // Check if all checklist items are complete
        const allComplete = Object.values(updatedChecklist).every(v => v === true);
        if (allComplete && booking.status === 'deposit_paid') {
            await booking.update({ status: 'confirmed' });
        }
        
        return booking;
    }
    
    /**
     * Complete a booking (post-event)
     */
    async completeBooking(bookingId, userId, completionData) {
        const booking = await this.getBookingById(bookingId, userId);
        
        if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
            throw new AppError('Booking cannot be completed in current status', 400);
        }
        
        // Both parties must confirm
        const { confirmedBy, rating, feedback } = completionData;
        
        // Store confirmation (would need separate tracking for both parties)
        // For simplicity, we'll just complete it
        await booking.update({
            status: 'completed',
            completedAt: new Date(),
        });
        
        // Update trust scores
        await trustScoreService.updateScoreForCompletedBooking(booking, rating);
        
        // Trigger final payment release
        await paymentService.releaseFinalPayment([booking.id](http://booking.id));
        
        return booking;
    }
    
    async verifyBookingAccess(booking, userId) {
        // Check if user is artist
        const artist = await Artist.findOne({ where: { userId } });
        if (artist && booking.artistId === [artist.id](http://artist.id)) return true;
        
        // Check if user is organizer
        const organizer = await Organizer.findOne({ where: { userId } });
        if (organizer && booking.organizerId === [organizer.id](http://organizer.id)) return true;
        
        // Check if user is venue
        const venue = await Venue.findOne({ where: { userId } });
        if (venue && booking.venueId === [venue.id](http://venue.id)) return true;
        
        return false;
    }
    
    async sendBookingNotifications(booking, artist, opportunity) {
        // Notify artist
        await notificationService.sendNotification({
            userId: artist.userId,
            type: 'booking_created',
            title: '🎉 Booking Confirmed!',
            message: `Your booking for "${opportunity.title}" has been created. Please review and sign the contract.`,
            data: { bookingId: [booking.id](http://booking.id) },
        });
        
        // Notify organizer
        const organizerUserId = opportunity.organizer?.userId || opportunity.venue?.userId;
        await notificationService.sendNotification({
            userId: organizerUserId,
            type: 'booking_created',
            title: 'Booking Created',
            message: `Booking with ${artist.artistName} has been created. Contract sent for signing.`,
            data: { bookingId: [booking.id](http://booking.id) },
        });
    }
}

module.exports = new BookingService();
```

---

# Chapters 8-10: Contract, Payment & Trust Score Systems

<aside>
📖

**The Story So Far:** Bookings are being created! Now we need to handle the critical business layer—contracts that protect both parties, payments that build trust, and a scoring system that rewards good behavior.

</aside>

---

# Chapter 8: Contract Generation & E-Signature

## 8.1 The Story: Why Contracts Matter

In the music industry, handshake deals lead to disputes. Our platform eliminates this with:

- **Auto-generated contracts** from booking terms
- **Standardized clauses** that protect both parties
- **Digital signatures** for legal enforceability
- **Clause library** for customization

---

## 8.2 Contract Model

**Create `src/models/Contract.model.js`:**

```jsx
// src/models/Contract.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Contract = sequelize.define('Contract', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        bookingId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'booking_id',
            references: { model: 'bookings', key: 'id' },
        },
        contractNumber: {
            type: DataTypes.STRING,
            unique: true,
            field: 'contract_number',
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        // Contract content
        templateId: {
            type: DataTypes.STRING,
            field: 'template_id',
        },
        clauses: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        customTerms: {
            type: DataTypes.TEXT,
            field: 'custom_terms',
        },
        // Generated HTML/PDF content
        htmlContent: {
            type: DataTypes.TEXT,
            field: 'html_content',
        },
        pdfUrl: {
            type: DataTypes.STRING,
            field: 'pdf_url',
        },
        // Signature tracking
        status: {
            type: DataTypes.ENUM(
                'draft',
                'pending_artist',
                'pending_organizer',
                'signed',
                'expired',
                'voided'
            ),
            defaultValue: 'draft',
        },
        artistSignature: {
            type: DataTypes.JSONB,
            field: 'artist_signature',
            // { signedAt, ipAddress, signatureImage, legalName }
        },
        organizerSignature: {
            type: DataTypes.JSONB,
            field: 'organizer_signature',
        },
        signatureDeadline: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'signature_deadline',
        },
        fullySignedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'fully_signed_at',
        },
    }, {
        tableName: 'contracts',
        indexes: [
            { fields: ['booking_id'], unique: true },
            { fields: ['contract_number'], unique: true },
            { fields: ['status'] },
        ],
    });

    return Contract;
};
```

---

## 8.3 Contract Service

**Create `src/services/contract.service.js`:**

```jsx
// src/services/contract.service.js
// The legal department - generating and managing contracts

const { Contract, Booking, Artist, Organizer, Venue, User } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const dayjs = require('dayjs');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class ContractService {
    constructor() {
        // Standard clause library
        this.clauseLibrary = {
            performance: {
                id: 'performance',
                title: 'Performance Terms',
                template: `The Artist agrees to perform at venueName on eventDate 
                           from slotStartTime to slotEndTime (performanceDuration minutes). 
                           The performance shall be of the slotType slot category.`,
                required: true,
            },
            compensation: {
                id: 'compensation',
                title: 'Compensation',
                template: `The Organizer agrees to pay the Artist a total fee of currencyagreedFee. 
                           Payment schedule:
                           - Deposit (depositPercentage%): currencydepositAmount due upon signing
                           - Balance (balancePercentage%): currencybalanceAmount due balanceDueTiming`,
                required: true,
            },
            travel: {
                id: 'travel',
                title: 'Travel & Accommodation',
                template: `#if travelIncludedThe Organizer shall provide round-trip travel arrangements 
                           for the Artist.elseTravel arrangements are the responsibility of the Artist./if
                           #if accommodationIncludedThe Organizer shall provide accommodation for 
                           accommodationNights night(s)./if`,
                required: false,
            },
            cancellation: {
                id: 'cancellation',
                title: 'Cancellation Policy',
                template: `Cancellation terms:
                           - Artist cancellation >30 days before event: Full deposit refund
                           - Artist cancellation 15-30 days: 50% deposit retained
                           - Artist cancellation <15 days: Full deposit retained
                           - Organizer cancellation >30 days: Full deposit returned to Artist
                           - Organizer cancellation 15-30 days: Artist keeps 50% of fee
                           - Organizer cancellation <15 days: Artist keeps 100% of fee`,
                required: true,
            },
            technical: {
                id: 'technical',
                title: 'Technical Requirements',
                template: `The Organizer shall provide:
                           - Professional sound system suitable for expectedAudience attendees
                           - #if djEquipmentProvidedDJ equipment (CDJs/Turntables, Mixer)elseArtist to bring own equipment/if
                           - Dedicated monitor system
                           - Technical sound engineer on-site`,
                required: true,
            },
            hospitality: {
                id: 'hospitality',
                title: 'Hospitality',
                template: `The Organizer shall provide:
                           - Private dressing room/green room
                           - Complimentary beverages and refreshments
                           - guestListCount guest list spots for Artist
                           - Secure storage for Artist's equipment`,
                required: false,
            },
            promotion: {
                id: 'promotion',
                title: 'Promotion & Marketing',
                template: `All promotional materials featuring the Artist must be approved prior to release.
                           The Organizer may use the Artist's name, likeness, and approved photos for event promotion.
                           #if recordingAllowedRecording of the performance for promotional purposes is permitted.elseNo audio or video recording without prior written consent./if`,
                required: true,
            },
            confidentiality: {
                id: 'confidentiality',
                title: 'Confidentiality',
                template: `Both parties agree to keep the financial terms of this agreement confidential. 
                           The fee amount shall not be disclosed to third parties without written consent.`,
                required: true,
            },
            forceМajeure: {
                id: 'forceMajeure',
                title: 'Force Majeure',
                template: `Neither party shall be liable for failure to perform due to circumstances beyond 
                           reasonable control, including but not limited to: natural disasters, government 
                           actions, pandemic restrictions, or venue closure. In such cases, both parties 
                           shall negotiate in good faith for rescheduling or refund.`,
                required: true,
            },
        };
    }

    /**
     * Generate contract from booking
     */
    async generateContract(booking) {
        // Load full booking details
        const fullBooking = await Booking.findByPk([booking.id](http://booking.id), {
            include: [
                { 
                    model: Artist, 
                    as: 'artist',
                    include: [{ model: User, as: 'user' }],
                },
                { 
                    model: Organizer, 
                    as: 'organizer',
                    include: [{ model: User, as: 'user' }],
                },
                { model: Venue, as: 'venue' },
            ],
        });

        if (!fullBooking) {
            throw new AppError('Booking not found', 404);
        }

        // Generate contract number
        const contractNumber = this.generateContractNumber();

        // Prepare template data
        const templateData = this.prepareTemplateData(fullBooking);

        // Build clauses
        const clauses = this.buildClauses(templateData, fullBooking);

        // Generate HTML content
        const htmlContent = this.generateHtmlContent(clauses, templateData);

        // Create contract record
        const contract = await Contract.create({
            bookingId: [booking.id](http://booking.id),
            contractNumber,
            templateId: 'standard_v1',
            clauses,
            htmlContent,
            status: 'pending_artist', // Artist signs first
            signatureDeadline: dayjs().add(72, 'hours').toDate(),
        });

        // Generate PDF (async - don't await)
        this.generatePdf([contract.id](http://contract.id), htmlContent).catch(err => {
            console.error('PDF generation failed:', err);
        });

        return contract;
    }

    /**
     * Generate unique contract number
     */
    generateContractNumber() {
        const year = dayjs().format('YYYY');
        const month = dayjs().format('MM');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `CTR-${year}${month}-${random}`;
    }

    /**
     * Prepare data for template rendering
     */
    prepareTemplateData(booking) {
        const depositPercentage = 30;
        const depositAmount = booking.agreedFee * (depositPercentage / 100);
        const balanceAmount = booking.agreedFee - depositAmount;

        return {
            // Parties
            artistName: booking.artist.artistName,
            artistLegalName: booking.artist.user.firstName + ' ' + booking.artist.user.lastName,
            artistEmail: [booking.artist.user.email](http://booking.artist.user.email),
            organizerName: booking.organizer?.organizationName || booking.venue?.venueName,
            organizerLegalName: booking.organizer?.user?.firstName + ' ' + booking.organizer?.user?.lastName,
            organizerEmail: booking.organizer?.user?.email || booking.venue?.user?.email,
            venueName: booking.venue.venueName,
            venueAddress: `${booking.venue.address}, ${[booking.venue.city](http://booking.venue.city)}, ${booking.venue.state}`,
            
            // Event details
            eventDate: dayjs(booking.eventDate).format('MMMM D, YYYY'),
            slotStartTime: booking.slotStartTime,
            slotEndTime: booking.slotEndTime,
            performanceDuration: booking.performanceDuration,
            slotType: booking.slotType,
            expectedAudience: booking.opportunity?.expectedAudience || 'N/A',
            
            // Financial
            currency: '₹', // Configurable
            agreedFee: booking.agreedFee.toLocaleString(),
            depositPercentage,
            depositAmount: depositAmount.toLocaleString(),
            balancePercentage: 100 - depositPercentage,
            balanceAmount: balanceAmount.toLocaleString(),
            balanceDueTiming: '24 hours before the event',
            
            // Logistics
            travelIncluded: booking.travelIncluded,
            accommodationIncluded: booking.accommodationIncluded,
            accommodationNights: booking.accommodationIncluded ? 1 : 0,
            
            // Additional terms
            djEquipmentProvided: true,
            recordingAllowed: false,
            guestListCount: 4,
            
            // Meta
            contractDate: dayjs().format('MMMM D, YYYY'),
            contractNumber: '', // Filled later
        };
    }

    /**
     * Build clause list with rendered content
     */
    buildClauses(templateData, booking) {
        const clauses = [];
        
        for (const [key, clause] of Object.entries(this.clauseLibrary)) {
            // Skip optional clauses based on booking
            if (!clause.required) {
                if (key === 'travel' && !booking.travelIncluded && !booking.accommodationIncluded) {
                    continue;
                }
            }
            
            // Compile and render clause
            const template = Handlebars.compile(clause.template);
            const renderedContent = template(templateData);
            
            clauses.push({
                id: [clause.id](http://clause.id),
                title: clause.title,
                content: renderedContent,
                required: clause.required,
            });
        }
        
        return clauses;
    }

    /**
     * Generate full HTML contract document
     */
    generateHtmlContent(clauses, templateData) {
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; }
        h1 { text-align: center; color: #1a1a2e; }
        h2 { color: #16213e; border-bottom: 2px solid #e94560; padding-bottom: 5px; }
        .header { text-align: center; margin-bottom: 40px; }
        .contract-number { color: #666; font-size: 14px; }
        .parties { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .clause { margin: 25px 0; }
        .clause-title { font-weight: bold; margin-bottom: 10px; }
        .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-line { width: 45%; }
        .signature-line hr { border: none; border-top: 1px solid #000; margin: 40px 0 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PERFORMANCE AGREEMENT</h1>
        <p class="contract-number">Contract #: contractNumber</p>
        <p>Date: contractDate</p>
    </div>
    
    <div class="parties">
        <p><strong>ARTIST:</strong> artistName ("Artist")</p>
        <p>Legal Name: artistLegalName</p>
        <p>Email: artistEmail</p>
        <hr>
        <p><strong>ORGANIZER:</strong> organizerName ("Organizer")</p>
        <p>Legal Name: organizerLegalName</p>
        <p>Email: organizerEmail</p>
        <hr>
        <p><strong>VENUE:</strong> venueName</p>
        <p>Address: venueAddress</p>
    </div>
    
    #each clauses
    <div class="clause">
        <h2>@index. this.title</h2>
        <p>this.content</p>
    </div>
    /each
    
    <div class="signature-block">
        <div class="signature-line">
            <hr>
            <p><strong>Artist Signature</strong></p>
            <p>artistName</p>
            <p>Date: _____________</p>
        </div>
        <div class="signature-line">
            <hr>
            <p><strong>Organizer Signature</strong></p>
            <p>organizerName</p>
            <p>Date: _____________</p>
        </div>
    </div>
</body>
</html>`;
        
        const template = Handlebars.compile(htmlTemplate);
        return template({ ...templateData, clauses });
    }

    /**
     * Generate PDF from HTML
     */
    async generatePdf(contractId, htmlContent) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        });
        
        await browser.close();
        
        // Upload to storage (S3, etc.)
        const pdfUrl = await this.uploadPdf(pdfBuffer, contractId);
        
        // Update contract with PDF URL
        await Contract.update({ pdfUrl }, { where: { id: contractId } });
        
        return pdfUrl;
    }

    /**
     * Sign contract
     */
    async signContract(contractId, userId, signatureData) {
        const contract = await Contract.findByPk(contractId, {
            include: [{
                model: Booking,
                as: 'booking',
                include: [
                    { model: Artist, as: 'artist' },
                    { model: Organizer, as: 'organizer' },
                ],
            }],
        });

        if (!contract) throw new AppError('Contract not found', 404);

        // Check deadline
        if (dayjs().isAfter(contract.signatureDeadline)) {
            await contract.update({ status: 'expired' });
            throw new AppError('Signature deadline has passed', 400);
        }

        // Determine who is signing
        const artist = await Artist.findOne({ where: { userId } });
        const organizer = await require('../models').Organizer.findOne({ where: { userId } });

        const signatureRecord = {
            signedAt: new Date(),
            ipAddress: signatureData.ipAddress,
            signatureImage: signatureData.signatureImage, // Base64 signature
            legalName: signatureData.legalName,
            agreed: true,
        };

        if (artist && [contract.booking](http://contract.booking).artistId === [artist.id](http://artist.id)) {
            if (contract.status !== 'pending_artist') {
                throw new AppError('Not awaiting artist signature', 400);
            }
            contract.artistSignature = signatureRecord;
            contract.status = 'pending_organizer';
        } else if (organizer && [contract.booking](http://contract.booking).organizerId === [organizer.id](http://organizer.id)) {
            if (contract.status !== 'pending_organizer') {
                throw new AppError('Not awaiting organizer signature', 400);
            }
            contract.organizerSignature = signatureRecord;
            contract.status = 'signed';
            contract.fullySignedAt = new Date();
            
            // Trigger payment setup
            await require('./payment.service').setupPaymentSchedule([contract.booking](http://contract.booking));
        } else {
            throw new AppError('You are not authorized to sign this contract', 403);
        }

        await [contract.save](http://contract.save)();
        return contract;
    }

    async uploadPdf(buffer, contractId) {
        // Implement S3 upload or similar
        // For now, return placeholder
        return `https://storage.example.com/contracts/${contractId}.pdf`;
    }
}

module.exports = new ContractService();
```

---

# Chapter 9: Payment Milestone System

## 9.1 The Story: Escrow-Based Payment Flow

Money is sensitive. Our payment system:

1. **Organizer deposits** → Funds held in escrow
2. **Contract signed** → Deposit amount locked
3. **Event completes** → Balance released to artist
4. **Platform commission** → Deducted automatically

---

## 9.2 Payment Model

**Create `src/models/Payment.model.js`:**

```jsx
// src/models/Payment.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        bookingId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'booking_id',
            references: { model: 'bookings', key: 'id' },
        },
        // Payment type
        type: {
            type: DataTypes.ENUM('deposit', 'balance', 'refund', 'commission'),
            allowNull: false,
        },
        // Amount details
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'INR',
        },
        // Payment gateway details
        gatewayProvider: {
            type: DataTypes.STRING,
            field: 'gateway_provider',
        },
        gatewayTransactionId: {
            type: DataTypes.STRING,
            field: 'gateway_transaction_id',
        },
        gatewayResponse: {
            type: DataTypes.JSONB,
            field: 'gateway_response',
        },
        // Status tracking
        status: {
            type: DataTypes.ENUM(
                'pending',
                'processing',
                'completed',
                'failed',
                'refunded',
                'disputed'
            ),
            defaultValue: 'pending',
        },
        // From/To accounts
        fromUserId: {
            type: DataTypes.UUID,
            field: 'from_user_id',
            references: { model: 'users', key: 'id' },
        },
        toUserId: {
            type: DataTypes.UUID,
            field: 'to_user_id',
            references: { model: 'users', key: 'id' },
        },
        // Dates
        dueDate: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'due_date',
        },
        paidAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'paid_at',
        },
        // For escrow
        escrowStatus: {
            type: DataTypes.ENUM('held', 'released', 'returned'),
            field: 'escrow_status',
        },
        escrowReleasedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'escrow_released_at',
        },
    }, {
        tableName: 'payments',
        indexes: [
            { fields: ['booking_id'] },
            { fields: ['status'] },
            { fields: ['type'] },
            { fields: ['due_date'] },
        ],
    });

    return Payment;
};
```

---

## 9.3 Payment Service

**Create `src/services/payment.service.js`:**

```jsx
// src/services/payment.service.js
// The cashier - handling all financial transactions

const { Payment, Booking, Artist, Organizer, User } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const dayjs = require('dayjs');

// Payment gateway integration (Razorpay example)
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
    /**
     * Setup payment schedule when contract is signed
     */
    async setupPaymentSchedule(booking) {
        const depositPercentage = 30;
        const depositAmount = booking.agreedFee * (depositPercentage / 100);
        const balanceAmount = booking.agreedFee - depositAmount;
        
        // Get organizer user ID
        const organizer = await Organizer.findByPk(booking.organizerId);
        const artist = await Artist.findByPk(booking.artistId);
        
        // Create deposit payment record
        const depositPayment = await Payment.create({
            bookingId: [booking.id](http://booking.id),
            type: 'deposit',
            amount: depositAmount,
            currency: 'INR',
            status: 'pending',
            fromUserId: organizer.userId,
            toUserId: artist.userId,
            dueDate: dayjs().add(48, 'hours').toDate(), // 48 hours to pay deposit
        });
        
        // Create balance payment record (due before event)
        const balancePayment = await Payment.create({
            bookingId: [booking.id](http://booking.id),
            type: 'balance',
            amount: balanceAmount,
            currency: 'INR',
            status: 'pending',
            fromUserId: organizer.userId,
            toUserId: artist.userId,
            dueDate: dayjs(booking.eventDate).subtract(24, 'hours').toDate(),
        });
        
        // Create commission record
        const commissionPayment = await Payment.create({
            bookingId: [booking.id](http://booking.id),
            type: 'commission',
            amount: booking.platformCommission,
            currency: 'INR',
            status: 'pending',
            fromUserId: artist.userId,
            // Platform account
        });
        
        // Update booking status
        await booking.update({ status: 'awaiting_deposit' });
        
        return { depositPayment, balancePayment, commissionPayment };
    }
    
    /**
     * Create payment order (Razorpay)
     */
    async createPaymentOrder(paymentId, userId) {
        const payment = await Payment.findByPk(paymentId, {
            include: [{ model: Booking, as: 'booking' }],
        });
        
        if (!payment) throw new AppError('Payment not found', 404);
        
        // Verify user is the payer
        if (payment.fromUserId !== userId) {
            throw new AppError('You are not authorized to make this payment', 403);
        }
        
        // Check if already paid
        if (payment.status === 'completed') {
            throw new AppError('Payment already completed', 400);
        }
        
        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: Math.round(payment.amount * 100), // Razorpay uses paise
            currency: payment.currency,
            receipt: `payment_${[payment.id](http://payment.id)}`,
            notes: {
                paymentId: [payment.id](http://payment.id),
                bookingId: payment.bookingId,
                type: payment.type,
            },
        });
        
        // Update payment with order ID
        await payment.update({
            gatewayProvider: 'razorpay',
            gatewayTransactionId: [order.id](http://order.id),
            status: 'processing',
        });
        
        return {
            orderId: [order.id](http://order.id),
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
        };
    }
    
    /**
     * Verify and complete payment
     */
    async verifyPayment(paymentId, razorpayData) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = razorpayData;
        
        // Verify signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            throw new AppError('Payment verification failed', 400);
        }
        
        const payment = await Payment.findByPk(paymentId, {
            include: [{ model: Booking, as: 'booking' }],
        });
        
        if (!payment) throw new AppError('Payment not found', 404);
        
        // Update payment status
        await payment.update({
            status: 'completed',
            paidAt: new Date(),
            escrowStatus: 'held',
            gatewayResponse: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
            },
        });
        
        // Update booking status based on payment type
        if (payment.type === 'deposit') {
            await [payment.booking](http://payment.booking).update({ status: 'deposit_paid' });
        } else if (payment.type === 'balance') {
            await [payment.booking](http://payment.booking).update({ status: 'fully_paid' });
        }
        
        // Notify artist
        await require('./notification.service').sendNotification({
            userId: payment.toUserId,
            type: 'payment_received',
            title: `${payment.type === 'deposit' ? 'Deposit' : 'Balance'} Payment Received`,
            message: `₹${payment.amount} has been received and held in escrow`,
            data: { paymentId: [payment.id](http://payment.id), bookingId: payment.bookingId },
        });
        
        return payment;
    }
    
    /**
     * Release escrow payment to artist
     */
    async releaseEscrow(paymentId) {
        const payment = await Payment.findByPk(paymentId);
        
        if (!payment) throw new AppError('Payment not found', 404);
        if (payment.escrowStatus !== 'held') {
            throw new AppError('Payment is not in escrow', 400);
        }
        
        // In production: Trigger actual transfer via payment gateway
        // For now, just update status
        
        await payment.update({
            escrowStatus: 'released',
            escrowReleasedAt: new Date(),
        });
        
        return payment;
    }
    
    /**
     * Release final payment after booking completion
     */
    async releaseFinalPayment(bookingId) {
        const payments = await Payment.findAll({
            where: {
                bookingId,
                type: { [require('sequelize').[Op.in](http://Op.in)]: ['deposit', 'balance'] },
                escrowStatus: 'held',
            },
        });
        
        for (const payment of payments) {
            await this.releaseEscrow([payment.id](http://payment.id));
        }
        
        // Process commission
        const commissionPayment = await Payment.findOne({
            where: { bookingId, type: 'commission' },
        });
        
        if (commissionPayment) {
            await commissionPayment.update({ status: 'completed', paidAt: new Date() });
        }
        
        return { released: payments.length };
    }
    
    /**
     * Process refund
     */
    async processRefund(paymentId, refundAmount, reason) {
        const payment = await Payment.findByPk(paymentId);
        
        if (!payment) throw new AppError('Payment not found', 404);
        if (payment.status !== 'completed' || payment.escrowStatus !== 'held') {
            throw new AppError('Payment cannot be refunded', 400);
        }
        
        // Create refund record
        const refund = await Payment.create({
            bookingId: payment.bookingId,
            type: 'refund',
            amount: -refundAmount, // Negative to indicate refund
            currency: payment.currency,
            status: 'pending',
            fromUserId: payment.toUserId,
            toUserId: payment.fromUserId,
            gatewayProvider: payment.gatewayProvider,
        });
        
        // Process via gateway
        // ...
        
        // Update original payment
        await payment.update({ escrowStatus: 'returned' });
        
        return refund;
    }
}

module.exports = new PaymentService();
```

---

# Chapter 10: Trust Score Algorithm

## 10.1 The Story: Rewarding Reliability

Trust scores are the heart of our platform's quality assurance:

- **New users start at 50** (neutral)
- **Completed bookings increase** score
- **Cancellations decrease** score
- **Score affects** commission rates, limits, visibility

---

## 10.2 Trust Score Service

**Create `src/services/trustScore.service.js`:**

```jsx
// src/services/trustScore.service.js
// The reputation engine - building trust through actions

const { TrustScore, User, Booking } = require('../models');
const { Op } = require('sequelize');

class TrustScoreService {
    constructor() {
        // Scoring configuration
        this.config = {
            // Score tiers
            tiers: {
                critical: { min: 0, max: 30, label: 'Critical', color: 'red' },
                risky: { min: 31, max: 50, label: 'Risky', color: 'orange' },
                standard: { min: 51, max: 70, label: 'Standard', color: 'yellow' },
                trusted: { min: 71, max: 85, label: 'Trusted', color: 'green' },
                premium: { min: 86, max: 100, label: 'Premium', color: 'gold' },
            },
            // Score impacts
            impacts: {
                bookingCompleted: +5,
                bookingCompletedWithGoodRating: +8,
                bookingCompletedWithBadRating: +2,
                cancellationByUser: -15,
                cancellationWithinGracePeriod: -5,
                lateCancellation: -25,
                noShow: -40,
                disputeRaised: -10,
                disputeResolved: +5,
                profileVerified: +10,
                firstBookingCompleted: +10,
                tenBookingsCompleted: +15,
                twentyFiveBookingsCompleted: +20,
            },
            // Time decay
            decayRate: 0.5, // Points lost per month of inactivity
            maxDecay: 10, // Maximum decay
        };
    }

    /**
     * Initialize trust score for new user
     */
    async initializeScore(userId) {
        const existingScore = await TrustScore.findOne({ where: { userId } });
        if (existingScore) return existingScore;

        return TrustScore.create({
            userId,
            currentScore: 50,
            tier: 'standard',
            bookingsCompleted: 0,
            bookingsCancelled: 0,
            averageRating: 0,
            history: [{
                timestamp: new Date(),
                action: 'account_created',
                change: 0,
                score: 50,
            }],
        });
    }

    /**
     * Get user's trust score
     */
    async getScore(userId) {
        let score = await TrustScore.findOne({ where: { userId } });
        
        if (!score) {
            score = await this.initializeScore(userId);
        }

        // Apply time decay if needed
        score = await this.applyTimeDecay(score);

        return score;
    }

    /**
     * Update score when booking is completed
     */
    async updateScoreForCompletedBooking(booking, rating = null) {
        const artistScore = await this.getScore(booking.artist.userId);
        const organizerScore = await this.getScore(booking.organizer?.userId || booking.venue?.userId);

        let artistChange = this.config.impacts.bookingCompleted;
        let organizerChange = this.config.impacts.bookingCompleted;

        // Adjust based on rating
        if (rating) {
            if (rating >= 4) {
                artistChange = this.config.impacts.bookingCompletedWithGoodRating;
                organizerChange = this.config.impacts.bookingCompletedWithGoodRating;
            } else if (rating <= 2) {
                artistChange = this.config.impacts.bookingCompletedWithBadRating;
                organizerChange = this.config.impacts.bookingCompletedWithBadRating;
            }
        }

        // Apply milestone bonuses
        const artistBookings = artistScore.bookingsCompleted + 1;
        if (artistBookings === 1) artistChange += this.config.impacts.firstBookingCompleted;
        if (artistBookings === 10) artistChange += this.config.impacts.tenBookingsCompleted;
        if (artistBookings === 25) artistChange += this.config.impacts.twentyFiveBookingsCompleted;

        // Update scores
        await this.updateScore(artistScore, artistChange, 'booking_completed', {
            bookingId: [booking.id](http://booking.id),
            rating,
        });

        await this.updateScore(organizerScore, organizerChange, 'booking_completed', {
            bookingId: [booking.id](http://booking.id),
            rating,
        });

        return { artistScore, organizerScore };
    }

    /**
     * Update score when booking is cancelled
     */
    async updateScoreForCancellation(booking, cancelledByRole, daysBeforeEvent) {
        let cancellerScore;
        let change;

        if (cancelledByRole === 'artist') {
            cancellerScore = await this.getScore(booking.artist.userId);
        } else {
            cancellerScore = await this.getScore(booking.organizer?.userId || booking.venue?.userId);
        }

        // Determine penalty based on timing
        if (daysBeforeEvent >= 30) {
            change = this.config.impacts.cancellationWithinGracePeriod;
        } else if (daysBeforeEvent >= 7) {
            change = this.config.impacts.cancellationByUser;
        } else if (daysBeforeEvent >= 1) {
            change = this.config.impacts.lateCancellation;
        } else {
            change = this.config.impacts.noShow;
        }

        await this.updateScore(cancellerScore, change, 'booking_cancelled', {
            bookingId: [booking.id](http://booking.id),
            daysBeforeEvent,
            cancelledByRole,
        });

        return cancellerScore;
    }

    /**
     * Core score update method
     */
    async updateScore(trustScore, change, action, metadata = {}) {
        const oldScore = trustScore.currentScore;
        let newScore = oldScore + change;

        // Clamp score between 0-100
        newScore = Math.max(0, Math.min(100, newScore));

        // Determine new tier
        const newTier = this.determineTier(newScore);

        // Add to history
        const history = trustScore.history || [];
        history.push({
            timestamp: new Date(),
            action,
            change,
            oldScore,
            score: newScore,
            metadata,
        });

        // Keep history manageable (last 100 entries)
        if (history.length > 100) {
            history.shift();
        }

        // Update counters based on action
        const updates = {
            currentScore: newScore,
            tier: newTier,
            history,
            lastActivityAt: new Date(),
        };

        if (action === 'booking_completed') {
            updates.bookingsCompleted = (trustScore.bookingsCompleted || 0) + 1;
        } else if (action === 'booking_cancelled') {
            updates.bookingsCancelled = (trustScore.bookingsCancelled || 0) + 1;
        }

        // Save
        await trustScore.update(updates);

        // Check for tier change notifications
        if (newTier !== trustScore.tier) {
            await this.notifyTierChange(trustScore.userId, trustScore.tier, newTier);
        }

        return trustScore;
    }

    /**
     * Determine tier from score
     */
    determineTier(score) {
        for (const [tierName, range] of Object.entries(this.config.tiers)) {
            if (score >= range.min && score <= range.max) {
                return tierName;
            }
        }
        return 'standard';
    }

    /**
     * Apply time decay for inactive users
     */
    async applyTimeDecay(trustScore) {
        if (!trustScore.lastActivityAt) return trustScore;

        const monthsInactive = Math.floor(
            ([Date.now](http://Date.now)() - new Date(trustScore.lastActivityAt).getTime()) / 
            (30 * 24 * 60 * 60 * 1000)
        );

        if (monthsInactive > 0) {
            const decay = Math.min(
                monthsInactive * this.config.decayRate,
                this.config.maxDecay
            );

            if (decay > 0) {
                await this.updateScore(trustScore, -decay, 'time_decay', {
                    monthsInactive,
                });
            }
        }

        return trustScore;
    }

    /**
     * Get commission rate based on trust score
     */
    getCommissionRate(trustScore) {
        const score = trustScore?.currentScore || 50;
        
        if (score >= 86) return 2.0;   // Premium
        if (score >= 71) return 2.5;   // Trusted
        if (score >= 51) return 3.0;   // Standard
        if (score >= 31) return 4.0;   // Risky
        return 5.0;                     // Critical
    }

    /**
     * Get application limits based on trust score
     */
    getApplicationLimits(trustScore) {
        const score = trustScore?.currentScore || 50;
        
        if (score >= 86) return { pending: 20, perDay: 10 };
        if (score >= 71) return { pending: 15, perDay: 7 };
        if (score >= 51) return { pending: 10, perDay: 5 };
        if (score >= 31) return { pending: 5, perDay: 3 };
        return { pending: 3, perDay: 1 };
    }

    async notifyTierChange(userId, oldTier, newTier) {
        const isPromotion = this.config.tiers[newTier].min > this.config.tiers[oldTier].min;
        
        await require('./notification.service').sendNotification({
            userId,
            type: isPromotion ? 'tier_promotion' : 'tier_demotion',
            title: isPromotion ? '🎉 Trust Tier Upgraded!' : '⚠️ Trust Tier Changed',
            message: isPromotion
                ? `Congratulations! You've reached ${newTier} tier status.`
                : `Your trust tier has changed to ${newTier}. Complete more bookings to improve.`,
        });
    }
}

module.exports = new TrustScoreService();
```

---

# Chapters 11-14: Venue Programming, Calendar, Notifications & Cancellation

<aside>
📖

**The Story So Far:** We've built the core booking flow. Now let's tackle the advanced features that make our platform truly powerful—long-term venue programming, smart calendars, real-time notifications, and graceful cancellation handling.

</aside>

---

# Chapter 11: Venue Programming Mode

## 11.1 The Story: 3-6 Month Calendar Curation

Venue Programming is our **secret weapon**—it's where the real value lies:

1. **Venue signs up** for programming package
2. **Provides budget + audience** definition
3. **Algorithm generates** optimized calendar
4. **Platform handles** all artist bookings
5. **Consistent crowds** through curated programming

This is NOT just booking—it's **strategic curation**.

---

## 11.2 Programming Package Model

**Create `src/models/ProgrammingPackage.model.js`:**

```jsx
// src/models/ProgrammingPackage.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProgrammingPackage = sequelize.define('ProgrammingPackage', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        venueId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'venue_id',
            references: { model: 'venues', key: 'id' },
        },
        // Package details
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
        },
        // Duration
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'start_date',
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'end_date',
        },
        durationMonths: {
            type: DataTypes.INTEGER,
            field: 'duration_months',
        },
        // Budget allocation
        totalBudget: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            field: 'total_budget',
        },
        weeklyBudget: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'weekly_budget',
        },
        budgetBreakdown: {
            type: DataTypes.JSONB,
            field: 'budget_breakdown',
            // { headliners: 40%, support: 35%, emerging: 25% }
        },
        // Programming preferences
        eventDays: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'event_days',
            // ['friday', 'saturday']
        },
        eventsPerWeek: {
            type: DataTypes.INTEGER,
            field: 'events_per_week',
        },
        // Target audience
        targetAudience: {
            type: DataTypes.JSONB,
            field: 'target_audience',
            // { ageRange: [21, 35], genres: [...], vibe: 'underground' }
        },
        preferredGenres: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'preferred_genres',
        },
        excludedGenres: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            field: 'excluded_genres',
        },
        // Programming constraints
        constraints: {
            type: DataTypes.JSONB,
            // { noRepeatArtistWithin: 8, // weeks
            //   minHeadlinerPerMonth: 2,
            //   localVsTouring: { local: 60, touring: 40 } }
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'draft',
                'intake_complete',
                'generating',
                'review',
                'approved',
                'active',
                'paused',
                'completed'
            ),
            defaultValue: 'draft',
        },
        // Generated calendar
        generatedCalendar: {
            type: DataTypes.JSONB,
            field: 'generated_calendar',
        },
        // Approval tracking
        approvedAt: {
            type: [DataTypes.DATE](http://DataTypes.DATE),
            field: 'approved_at',
        },
        approvedBy: {
            type: DataTypes.UUID,
            field: 'approved_by',
        },
        // Pricing
        monthlyRetainer: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'monthly_retainer',
        },
        platformFeePercentage: {
            type: DataTypes.DECIMAL(4, 2),
            field: 'platform_fee_percentage',
            defaultValue: 3.00,
        },
    }, {
        tableName: 'programming_packages',
        indexes: [
            { fields: ['venue_id'] },
            { fields: ['status'] },
            { fields: ['start_date', 'end_date'] },
        ],
    });

    return ProgrammingPackage;
};
```

---

## 11.3 Programming Algorithm Service

**Create `src/services/programming.service.js`:**

```jsx
// src/services/programming.service.js
// The brain - algorithmic calendar generation
// THIS IS WHERE THE PATENT IS

const { ProgrammingPackage, Venue, Artist, Booking, TrustScore } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { AppError } = require('../middleware/error.middleware');

class ProgrammingService {
    /**
     * Create new programming package for venue
     */
    async createPackage(venueId, packageData) {
        const venue = await Venue.findByPk(venueId);
        if (!venue) throw new AppError('Venue not found', 404);
        
        // Validate dates
        const startDate = dayjs(packageData.startDate);
        const endDate = dayjs(packageData.endDate);
        const durationMonths = endDate.diff(startDate, 'month');
        
        if (durationMonths < 3 || durationMonths > 6) {
            throw new AppError('Programming packages must be 3-6 months', 400);
        }
        
        // Calculate weekly budget
        const weeks = endDate.diff(startDate, 'week');
        const weeklyBudget = packageData.totalBudget / weeks;
        
        const pkg = await ProgrammingPackage.create({
            venueId,
            name: [packageData.name](http://packageData.name) || `${venue.venueName} - ${startDate.format('MMM YYYY')}`,
            startDate: packageData.startDate,
            endDate: packageData.endDate,
            durationMonths,
            totalBudget: packageData.totalBudget,
            weeklyBudget,
            budgetBreakdown: packageData.budgetBreakdown || {
                headliner: 40,
                support: 35,
                emerging: 25,
            },
            eventDays: packageData.eventDays || ['friday', 'saturday'],
            eventsPerWeek: packageData.eventsPerWeek || 2,
            targetAudience: packageData.targetAudience,
            preferredGenres: packageData.preferredGenres || venue.preferredGenres,
            excludedGenres: packageData.excludedGenres || [],
            constraints: {
                noRepeatArtistWithin: 8, // weeks
                minHeadlinerPerMonth: 2,
                localVsTouring: { local: 60, touring: 40 },
                ...packageData.constraints,
            },
            monthlyRetainer: this.calculateRetainer(packageData.totalBudget, durationMonths),
            status: 'intake_complete',
        });
        
        return pkg;
    }
    
    /**
     * Generate optimized calendar - THE CORE ALGORITHM
     */
    async generateCalendar(packageId) {
        const pkg = await ProgrammingPackage.findByPk(packageId, {
            include: [{ model: Venue, as: 'venue' }],
        });
        
        if (!pkg) throw new AppError('Package not found', 404);
        
        await pkg.update({ status: 'generating' });
        
        try {
            // Get available artists matching criteria
            const availableArtists = await this.getMatchingArtists(pkg);
            
            // Generate event slots
            const slots = this.generateSlots(pkg);
            
            // Allocate artists to slots using optimization
            const calendar = await this.optimizeCalendar(slots, availableArtists, pkg);
            
            // Calculate metrics
            const metrics = this.calculateCalendarMetrics(calendar, pkg);
            
            await pkg.update({
                generatedCalendar: {
                    events: calendar,
                    metrics,
                    generatedAt: new Date(),
                    version: 1,
                },
                status: 'review',
            });
            
            return pkg;
        } catch (error) {
            await pkg.update({ status: 'intake_complete' });
            throw error;
        }
    }
    
    /**
     * Get artists matching programming criteria
     */
    async getMatchingArtists(pkg) {
        const where = {
            verificationStatus: 'approved',
            isActive: true,
        };
        
        // Genre filtering
        if (pkg.preferredGenres?.length > 0) {
            where[Op.or] = [
                { primaryGenre: { [[Op.in](http://Op.in)]: pkg.preferredGenres } },
                { secondaryGenres: { [Op.overlap]: pkg.preferredGenres } },
            ];
        }
        
        // Exclude genres
        if (pkg.excludedGenres?.length > 0) {
            where.primaryGenre = { [Op.notIn]: pkg.excludedGenres };
        }
        
        // Budget range
        const maxFee = pkg.weeklyBudget * 0.6; // Max 60% of weekly budget for single artist
        where.minimumFee = { [Op.lte]: maxFee };
        
        const artists = await Artist.findAll({
            where,
            include: [{
                model: require('../models').User,
                as: 'user',
                include: [{ model: TrustScore, as: 'trustScore' }],
            }],
            order: [['standardFee', 'DESC']],
        });
        
        // Score and categorize artists
        return [artists.map](http://artists.map)(artist => ({
            ...artist.toJSON(),
            category: this.categorizeArtist(artist, pkg),
            matchScore: this.calculateArtistMatch(artist, pkg),
        })).sort((a, b) => b.matchScore - a.matchScore);
    }
    
    /**
     * Categorize artist tier
     */
    categorizeArtist(artist, pkg) {
        const fee = artist.standardFee || artist.minimumFee;
        const weeklyBudget = parseFloat(pkg.weeklyBudget);
        
        if (fee >= weeklyBudget * 0.4) return 'headliner';
        if (fee >= weeklyBudget * 0.2) return 'support';
        return 'emerging';
    }
    
    /**
     * Calculate artist-venue match score
     */
    calculateArtistMatch(artist, pkg) {
        let score = 0;
        
        // Genre match (40 points)
        const artistGenres = [artist.primaryGenre, ...(artist.secondaryGenres || [])];
        const matchingGenres = artistGenres.filter(g => 
            pkg.preferredGenres?.includes(g)
        ).length;
        score += (matchingGenres / Math.max(pkg.preferredGenres?.length || 1, 1)) * 40;
        
        // Trust score (30 points)
        const trustScore = artist.user?.trustScore?.currentScore || 50;
        score += (trustScore / 100) * 30;
        
        // Location proximity (15 points)
        if ([artist.city](http://artist.city) === pkg.venue?.city) {
            score += 15;
        } else if (artist.state === pkg.venue?.state) {
            score += 8;
        }
        
        // Availability history (15 points)
        // More reliable artists get bonus
        const cancelRate = artist.user?.trustScore?.bookingsCancelled / 
                          Math.max(artist.user?.trustScore?.bookingsCompleted || 1, 1);
        score += Math.max(0, 15 - (cancelRate * 50));
        
        return Math.round(score);
    }
    
    /**
     * Generate event slots for the programming period
     */
    generateSlots(pkg) {
        const slots = [];
        let currentDate = dayjs(pkg.startDate);
        const endDate = dayjs(pkg.endDate);
        
        while (currentDate.isBefore(endDate)) {
            const dayOfWeek = currentDate.format('dddd').toLowerCase();
            
            if (pkg.eventDays.includes(dayOfWeek)) {
                slots.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    dayOfWeek,
                    week: currentDate.diff(dayjs(pkg.startDate), 'week') + 1,
                    slotType: this.determineSlotType(currentDate, pkg),
                    budgetAllocation: this.calculateSlotBudget(currentDate, pkg),
                    artist: null, // To be filled
                    status: 'unassigned',
                });
            }
            
            currentDate = currentDate.add(1, 'day');
        }
        
        return slots;
    }
    
    /**
     * Determine slot type based on date
     */
    determineSlotType(date, pkg) {
        const dayOfWeek = date.format('dddd').toLowerCase();
        const isWeekend = ['friday', 'saturday'].includes(dayOfWeek);
        const isMonthEnd = [date.date](http://date.date)() >= 25;
        
        if (isWeekend && isMonthEnd) return 'flagship';
        if (dayOfWeek === 'saturday') return 'premium';
        if (dayOfWeek === 'friday') return 'standard';
        return 'weekday';
    }
    
    /**
     * Optimize calendar assignment - CONSTRAINT SATISFACTION
     */
    async optimizeCalendar(slots, artists, pkg) {
        const calendar = [];
        const artistHistory = new Map(); // Track when each artist was last booked
        const constraints = pkg.constraints;
        
        // Group artists by category
        const artistsByCategory = {
            headliner: artists.filter(a => a.category === 'headliner'),
            support: artists.filter(a => a.category === 'support'),
            emerging: artists.filter(a => a.category === 'emerging'),
        };
        
        // Budget tracking
        let monthlyHeadliners = 0;
        let currentMonth = null;
        
        for (const slot of slots) {
            const slotMonth = dayjs([slot.date](http://slot.date)).format('YYYY-MM');
            
            // Reset monthly counters
            if (currentMonth !== slotMonth) {
                currentMonth = slotMonth;
                monthlyHeadliners = 0;
            }
            
            // Determine required category for this slot
            let targetCategory = this.getTargetCategory(slot, monthlyHeadliners, constraints);
            
            // Find best available artist
            const selectedArtist = this.selectBestArtist(
                artistsByCategory[targetCategory],
                slot,
                artistHistory,
                constraints,
                pkg
            );
            
            if (selectedArtist) {
                calendar.push({
                    ...slot,
                    artist: {
                        id: [selectedArtist.id](http://selectedArtist.id),
                        name: selectedArtist.artistName,
                        genre: selectedArtist.primaryGenre,
                        fee: selectedArtist.standardFee,
                        category: selectedArtist.category,
                        matchScore: selectedArtist.matchScore,
                    },
                    status: 'assigned',
                });
                
                // Update tracking
                artistHistory.set([selectedArtist.id](http://selectedArtist.id), [slot.date](http://slot.date));
                if (targetCategory === 'headliner') monthlyHeadliners++;
            } else {
                // No suitable artist found - mark for manual assignment
                calendar.push({
                    ...slot,
                    status: 'needs_manual',
                    note: `No ${targetCategory} artist available`,
                });
            }
        }
        
        return calendar;
    }
    
    /**
     * Select best artist for a slot
     */
    selectBestArtist(candidates, slot, artistHistory, constraints, pkg) {
        const validCandidates = candidates.filter(artist => {
            // Check repeat constraint
            const lastBooked = artistHistory.get([artist.id](http://artist.id));
            if (lastBooked) {
                const weeksSince = dayjs([slot.date](http://slot.date)).diff(dayjs(lastBooked), 'week');
                if (weeksSince < constraints.noRepeatArtistWithin) {
                    return false;
                }
            }
            
            // Check budget
            if (artist.standardFee > slot.budgetAllocation) {
                return false;
            }
            
            return true;
        });
        
        if (validCandidates.length === 0) return null;
        
        // Sort by match score and pick best
        validCandidates.sort((a, b) => b.matchScore - a.matchScore);
        return validCandidates[0];
    }
    
    /**
     * Approve and activate programming calendar
     */
    async approveCalendar(packageId, userId) {
        const pkg = await ProgrammingPackage.findByPk(packageId);
        
        if (!pkg) throw new AppError('Package not found', 404);
        if (pkg.status !== 'review') {
            throw new AppError('Package is not in review status', 400);
        }
        
        // Create bookings for all assigned slots
        const bookings = [];
        for (const event of [pkg.generatedCalendar.events](http://pkg.generatedCalendar.events)) {
            if (event.status === 'assigned' && event.artist) {
                // Create opportunity and auto-book
                const booking = await this.createProgrammedBooking(pkg, event);
                bookings.push(booking);
            }
        }
        
        await pkg.update({
            status: 'active',
            approvedAt: new Date(),
            approvedBy: userId,
        });
        
        return { package: pkg, bookings };
    }
    
    /**
     * Create booking from programmed slot
     */
    async createProgrammedBooking(pkg, event) {
        // Direct booking flow - no application needed
        // Artist receives offer and can accept/decline
        
        const opportunity = await require('../models').Opportunity.create({
            venueId: pkg.venueId,
            title: `${pkg.venue?.venueName} - ${[event.date](http://event.date)}`,
            eventDate: [event.date](http://event.date),
            slotType: event.slotType,
            budgetMin: event.artist.fee * 0.9,
            budgetMax: event.artist.fee * 1.1,
            status: 'programmed', // Special status
            isProgrammed: true,
            programmingPackageId: [pkg.id](http://pkg.id),
        });
        
        // Send direct offer to artist
        await require('./notification.service').sendNotification({
            userId: event.artist.userId,
            type: 'programming_offer',
            title: '🎶 Programming Offer',
            message: `You've been selected for ${pkg.venue?.venueName} on ${[event.date](http://event.date)}`,
            data: { opportunityId: [opportunity.id](http://opportunity.id), fee: event.artist.fee },
        });
        
        return opportunity;
    }
    
    calculateRetainer(totalBudget, months) {
        // 8% of total budget as monthly retainer
        return (totalBudget * 0.08) / months;
    }
    
    calculateSlotBudget(date, pkg) {
        const slotType = this.determineSlotType(date, pkg);
        const weeklyBudget = parseFloat(pkg.weeklyBudget);
        
        switch (slotType) {
            case 'flagship': return weeklyBudget * 0.6;
            case 'premium': return weeklyBudget * 0.45;
            case 'standard': return weeklyBudget * 0.35;
            default: return weeklyBudget * 0.25;
        }
    }
    
    getTargetCategory(slot, monthlyHeadliners, constraints) {
        if (slot.slotType === 'flagship') return 'headliner';
        if (slot.slotType === 'premium' && monthlyHeadliners < constraints.minHeadlinerPerMonth) {
            return 'headliner';
        }
        if (slot.slotType === 'standard') return 'support';
        return 'emerging';
    }
    
    calculateCalendarMetrics(calendar, pkg) {
        const totalEvents = calendar.length;
        const assignedEvents = calendar.filter(e => e.status === 'assigned').length;
        const totalSpend = calendar
            .filter(e => e.artist)
            .reduce((sum, e) => sum + parseFloat(e.artist.fee || 0), 0);
        
        const genreDistribution = {};
        calendar.forEach(e => {
            if (e.artist?.genre) {
                genreDistribution[e.artist.genre] = (genreDistribution[e.artist.genre] || 0) + 1;
            }
        });
        
        return {
            totalEvents,
            assignedEvents,
            fillRate: Math.round((assignedEvents / totalEvents) * 100),
            totalSpend,
            budgetUtilization: Math.round((totalSpend / parseFloat(pkg.totalBudget)) * 100),
            genreDistribution,
            averageFee: totalSpend / assignedEvents,
        };
    }
}

module.exports = new ProgrammingService();
```

---

# Chapter 12: Calendar & Scheduling System

## 12.1 The Story: Unified Calendar View

Every user needs a calendar that shows:

- **Artists**: All their bookings and available dates
- **Organizers**: Events they're organizing
- **Venues**: Their full programming schedule

---

## 12.2 Calendar Service

**Create `src/services/calendar.service.js`:**

```jsx
// src/services/calendar.service.js
// The scheduler - managing availability and bookings

const { Booking, Opportunity, Artist, Organizer, Venue, User } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class CalendarService {
    /**
     * Get calendar events for a user
     */
    async getUserCalendar(userId, startDate, endDate, role) {
        const start = dayjs(startDate).startOf('day').toDate();
        const end = dayjs(endDate).endOf('day').toDate();
        
        let events = [];
        
        switch (role) {
            case 'artist':
                events = await this.getArtistCalendar(userId, start, end);
                break;
            case 'organizer':
                events = await this.getOrganizerCalendar(userId, start, end);
                break;
            case 'venue':
                events = await this.getVenueCalendar(userId, start, end);
                break;
        }
        
        return this.formatCalendarEvents(events);
    }
    
    /**
     * Artist calendar - their bookings
     */
    async getArtistCalendar(userId, start, end) {
        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) return [];
        
        const bookings = await Booking.findAll({
            where: {
                artistId: [artist.id](http://artist.id),
                eventDate: { [Op.between]: [start, end] },
                status: { [Op.notIn]: ['cancelled', 'declined'] },
            },
            include: [
                { model: Venue, as: 'venue', attributes: ['venueName', 'city'] },
                { model: Organizer, as: 'organizer', attributes: ['organizationName'] },
            ],
        });
        
        return [bookings.map](http://bookings.map)(booking => ({
            id: [booking.id](http://booking.id),
            type: 'booking',
            title: booking.venue?.venueName || 'TBD',
            subtitle: booking.organizer?.organizationName,
            date: booking.eventDate,
            startTime: booking.slotStartTime,
            endTime: booking.slotEndTime,
            status: booking.status,
            fee: booking.agreedFee,
            location: booking.venue?.city,
            color: this.getStatusColor(booking.status),
        }));
    }
    
    /**
     * Organizer calendar
     */
    async getOrganizerCalendar(userId, start, end) {
        const organizer = await Organizer.findOne({ where: { userId } });
        if (!organizer) return [];
        
        const bookings = await Booking.findAll({
            where: {
                organizerId: [organizer.id](http://organizer.id),
                eventDate: { [Op.between]: [start, end] },
            },
            include: [
                { model: Artist, as: 'artist', attributes: ['artistName', 'profilePhoto'] },
                { model: Venue, as: 'venue', attributes: ['venueName', 'city'] },
            ],
        });
        
        // Also get opportunities without bookings yet
        const opportunities = await Opportunity.findAll({
            where: {
                organizerId: [organizer.id](http://organizer.id),
                eventDate: { [Op.between]: [start, end] },
                status: 'active',
            },
            include: [
                { model: Venue, as: 'venue', attributes: ['venueName'] },
            ],
        });
        
        const events = [
            ...[bookings.map](http://bookings.map)(b => ({
                id: [b.id](http://b.id),
                type: 'booking',
                title: b.artist?.artistName || 'Confirmed',
                subtitle: b.venue?.venueName,
                date: b.eventDate,
                status: b.status,
                color: this.getStatusColor(b.status),
            })),
            ...[opportunities.map](http://opportunities.map)(o => ({
                id: [o.id](http://o.id),
                type: 'opportunity',
                title: o.title,
                subtitle: `${o.currentApplications} applications`,
                date: o.eventDate,
                status: 'seeking',
                color: '#FFA500',
            })),
        ];
        
        return events;
    }
    
    /**
     * Venue calendar
     */
    async getVenueCalendar(userId, start, end) {
        const venue = await Venue.findOne({ where: { userId } });
        if (!venue) return [];
        
        const bookings = await Booking.findAll({
            where: {
                venueId: [venue.id](http://venue.id),
                eventDate: { [Op.between]: [start, end] },
            },
            include: [
                { model: Artist, as: 'artist', attributes: ['artistName'] },
            ],
        });
        
        return [bookings.map](http://bookings.map)(b => ({
            id: [b.id](http://b.id),
            type: 'booking',
            title: b.artist?.artistName || 'Event',
            date: b.eventDate,
            startTime: b.slotStartTime,
            endTime: b.slotEndTime,
            status: b.status,
            color: this.getStatusColor(b.status),
        }));
    }
    
    /**
     * Check availability for a date
     */
    async checkAvailability(userId, role, date) {
        let entityId;
        let field;
        
        if (role === 'artist') {
            const artist = await Artist.findOne({ where: { userId } });
            entityId = artist?.id;
            field = 'artistId';
        } else if (role === 'venue') {
            const venue = await Venue.findOne({ where: { userId } });
            entityId = venue?.id;
            field = 'venueId';
        }
        
        if (!entityId) return { available: true };
        
        const existingBooking = await Booking.findOne({
            where: {
                [field]: entityId,
                eventDate: date,
                status: { [Op.notIn]: ['cancelled', 'declined'] },
            },
        });
        
        return {
            available: !existingBooking,
            conflictingBooking: existingBooking?.id,
        };
    }
    
    /**
     * Block dates (artist feature)
     */
    async blockDates(artistId, dates, reason) {
        // Store blocked dates in artist preferences
        const artist = await Artist.findByPk(artistId);
        if (!artist) throw new Error('Artist not found');
        
        const blockedDates = artist.blockedDates || [];
        
        for (const date of dates) {
            blockedDates.push({
                date,
                reason,
                blockedAt: new Date(),
            });
        }
        
        await artist.update({ blockedDates });
        return blockedDates;
    }
    
    getStatusColor(status) {
        const colors = {
            pending_contract: '#FFA500',
            contract_sent: '#FFD700',
            awaiting_deposit: '#87CEEB',
            deposit_paid: '#90EE90',
            confirmed: '#32CD32',
            completed: '#228B22',
            cancelled: '#DC143C',
        };
        return colors[status] || '#808080';
    }
    
    formatCalendarEvents(events) {
        // Group by date for calendar view
        const grouped = {};
        
        events.forEach(event => {
            const dateKey = dayjs([event.date](http://event.date)).format('YYYY-MM-DD');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });
        
        return {
            events,
            byDate: grouped,
            total: events.length,
        };
    }
}

module.exports = new CalendarService();
```

---

# Chapter 13: Notification & Communication Engine

## 13.1 The Story: Real-Time Updates

Users need to know:

- When applications are received/responded to
- When payments are due/received
- When contracts need signing
- When trust scores change

---

## 13.2 Notification Service

**Create `src/services/notification.service.js`:**

```jsx
// src/services/notification.service.js
// The messenger - keeping everyone informed

const { Notification, User } = require('../models');
const { Op } = require('sequelize');

// WebSocket for real-time (using [Socket.io](http://Socket.io))
let io = null;

class NotificationService {
    setSocketIO(socketIO) {
        io = socketIO;
    }
    
    /**
     * Send notification to user
     */
    async sendNotification({ userId, type, title, message, data = {}, priority = 'normal' }) {
        // Create notification record
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data,
            priority,
            status: 'unread',
        });
        
        // Send real-time via WebSocket
        if (io) {
            [io.to](http://io.to)(`user_${userId}`).emit('notification', {
                id: [notification.id](http://notification.id),
                type,
                title,
                message,
                data,
                createdAt: notification.createdAt,
            });
        }
        
        // Send push notification for high priority
        if (priority === 'high') {
            await this.sendPushNotification(userId, { title, message, data });
        }
        
        // Send email for certain types
        if (this.shouldSendEmail(type)) {
            await this.sendEmailNotification(userId, { type, title, message, data });
        }
        
        return notification;
    }
    
    /**
     * Get user's notifications
     */
    async getNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
        const where = { userId };
        if (unreadOnly) {
            where.status = 'unread';
        }
        
        const { rows: notifications, count: total } = await Notification.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
        });
        
        const unreadCount = await Notification.count({
            where: { userId, status: 'unread' },
        });
        
        return {
            notifications,
            pagination: { page, limit, total },
            unreadCount,
        };
    }
    
    /**
     * Mark notifications as read
     */
    async markAsRead(userId, notificationIds) {
        await Notification.update(
            { status: 'read', readAt: new Date() },
            {
                where: {
                    id: { [[Op.in](http://Op.in)]: notificationIds },
                    userId,
                },
            }
        );
        
        return { marked: notificationIds.length };
    }
    
    /**
     * Mark all as read
     */
    async markAllAsRead(userId) {
        const result = await Notification.update(
            { status: 'read', readAt: new Date() },
            { where: { userId, status: 'unread' } }
        );
        
        return { marked: result[0] };
    }
    
    /**
     * Determine if email should be sent
     */
    shouldSendEmail(type) {
        const emailTypes = [
            'application_accepted',
            'booking_created',
            'contract_ready',
            'payment_received',
            'payment_due',
            'booking_cancelled',
            'tier_promotion',
        ];
        return emailTypes.includes(type);
    }
    
    /**
     * Send push notification
     */
    async sendPushNotification(userId, { title, message, data }) {
        // Get user's push tokens
        const user = await User.findByPk(userId);
        if (!user?.pushTokens?.length) return;
        
        // Use Firebase Cloud Messaging or similar
        // Implementation depends on mobile app setup
        console.log('Push notification:', { userId, title });
    }
    
    /**
     * Send email notification
     */
    async sendEmailNotification(userId, { type, title, message, data }) {
        const user = await User.findByPk(userId);
        if (!user?.email) return;
        
        // Use email service (SendGrid, etc.)
        const emailService = require('./email.service');
        await emailService.sendTransactional({
            to: [user.email](http://user.email),
            template: `notification_${type}`,
            subject: title,
            data: { message, ...data },
        });
    }
    
    /**
     * Scheduled notification reminders
     */
    async sendPaymentReminders() {
        const { Payment } = require('../models');
        const dayjs = require('dayjs');
        
        // Find payments due in 24 hours
        const dueSoon = await Payment.findAll({
            where: {
                status: 'pending',
                dueDate: {
                    [Op.between]: [
                        dayjs().toDate(),
                        dayjs().add(24, 'hours').toDate(),
                    ],
                },
            },
        });
        
        for (const payment of dueSoon) {
            await this.sendNotification({
                userId: payment.fromUserId,
                type: 'payment_reminder',
                title: '⏰ Payment Due Soon',
                message: `Your ${payment.type} payment of ₹${payment.amount} is due in 24 hours`,
                data: { paymentId: [payment.id](http://payment.id) },
                priority: 'high',
            });
        }
    }
}

module.exports = new NotificationService();
```

---

# Chapter 14: Cancellation & Refund Workflow

## 14.1 The Story: Graceful Cancellations

Cancellations happen. We handle them fairly:

- **Different penalties** based on timing
- **Automatic refund** calculations
- **Trust score impacts**
- **Slot reopening** for rebooking

---

## 14.2 Cancellation Service

**Create `src/services/cancellation.service.js`:**

```jsx
// src/services/cancellation.service.js
// The mediator - handling cancellations fairly

const { Booking, Payment, Artist, Organizer, Contract, TrustScore } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const trustScoreService = require('./trustScore.service');
const paymentService = require('./payment.service');
const notificationService = require('./notification.service');
const dayjs = require('dayjs');

class CancellationService {
    constructor() {
        // Cancellation policy tiers
        this.policies = {
            gracePeriod: { // >30 days
                artistRefund: 100,
                organizerRefund: 100,
                trustImpact: -5,
            },
            standard: { // 15-30 days
                artistRefund: 50,
                organizerRefund: 50,
                trustImpact: -15,
            },
            late: { // 7-14 days
                artistRefund: 25,
                organizerRefund: 0,
                trustImpact: -25,
            },
            veryLate: { // <7 days
                artistRefund: 0,
                organizerRefund: 0,
                trustImpact: -40,
            },
        };
    }
    
    /**
     * Process cancellation request
     */
    async requestCancellation(bookingId, userId, reason) {
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Artist, as: 'artist' },
                { model: Organizer, as: 'organizer' },
                { model: Contract, as: 'contract' },
                { model: Payment, as: 'payments' },
            ],
        });
        
        if (!booking) throw new AppError('Booking not found', 404);
        
        // Check if user can cancel
        const cancellerRole = await this.determineCancellerRole(booking, userId);
        if (!cancellerRole) {
            throw new AppError('You cannot cancel this booking', 403);
        }
        
        // Check if booking can be cancelled
        const nonCancellableStatuses = ['cancelled', 'completed', 'disputed'];
        if (nonCancellableStatuses.includes(booking.status)) {
            throw new AppError(`Booking cannot be cancelled (status: ${booking.status})`, 400);
        }
        
        // Calculate days until event
        const daysUntilEvent = dayjs(booking.eventDate).diff(dayjs(), 'day');
        
        // Determine policy tier
        const policyTier = this.getPolicyTier(daysUntilEvent);
        const policy = this.policies[policyTier];
        
        // Calculate refunds
        const refundBreakdown = await this.calculateRefunds(
            booking,
            cancellerRole,
            policy
        );
        
        // Create cancellation record
        const cancellation = {
            bookingId,
            cancelledBy: cancellerRole,
            cancelledByUserId: userId,
            reason,
            daysUntilEvent,
            policyTier,
            refundBreakdown,
            requestedAt: new Date(),
        };
        
        // Update booking
        await booking.update({
            status: 'cancelled',
            cancellation,
            cancelledAt: new Date(),
        });
        
        // Void contract
        if (booking.contract) {
            await booking.contract.update({ status: 'voided' });
        }
        
        // Process refunds
        await this.processRefunds(booking, refundBreakdown);
        
        // Update trust scores
        await trustScoreService.updateScoreForCancellation(
            booking,
            cancellerRole,
            daysUntilEvent
        );
        
        // Notify other party
        await this.sendCancellationNotifications(booking, cancellerRole, refundBreakdown);
        
        // Reopen slot if applicable
        await this.reopenSlot(booking);
        
        return {
            booking,
            cancellation,
            refundBreakdown,
        };
    }
    
    /**
     * Determine who is cancelling
     */
    async determineCancellerRole(booking, userId) {
        const artist = await Artist.findOne({ where: { userId } });
        if (artist && booking.artistId === [artist.id](http://artist.id)) return 'artist';
        
        const organizer = await Organizer.findOne({ where: { userId } });
        if (organizer && booking.organizerId === [organizer.id](http://organizer.id)) return 'organizer';
        
        return null;
    }
    
    /**
     * Get policy tier based on days until event
     */
    getPolicyTier(daysUntilEvent) {
        if (daysUntilEvent > 30) return 'gracePeriod';
        if (daysUntilEvent > 14) return 'standard';
        if (daysUntilEvent > 7) return 'late';
        return 'veryLate';
    }
    
    /**
     * Calculate refund amounts
     */
    async calculateRefunds(booking, cancellerRole, policy) {
        const payments = booking.payments || [];
        const depositPayment = payments.find(p => p.type === 'deposit' && p.status === 'completed');
        const balancePayment = payments.find(p => p.type === 'balance' && p.status === 'completed');
        
        const breakdown = {
            depositPaid: parseFloat(depositPayment?.amount || 0),
            balancePaid: parseFloat(balancePayment?.amount || 0),
            totalPaid: 0,
            artistReceives: 0,
            organizerRefund: 0,
            platformRetains: 0,
        };
        
        breakdown.totalPaid = breakdown.depositPaid + breakdown.balancePaid;
        
        if (cancellerRole === 'artist') {
            // Artist cancels - organizer gets refund based on policy
            breakdown.organizerRefund = breakdown.totalPaid * (policy.organizerRefund / 100);
            breakdown.artistReceives = 0;
            breakdown.platformRetains = breakdown.totalPaid - breakdown.organizerRefund;
        } else {
            // Organizer cancels - artist keeps portion based on policy
            const artistKeeps = 100 - policy.artistRefund;
            breakdown.artistReceives = breakdown.totalPaid * (artistKeeps / 100);
            breakdown.organizerRefund = breakdown.totalPaid * (policy.artistRefund / 100);
            breakdown.platformRetains = 0;
        }
        
        return breakdown;
    }
    
    /**
     * Process calculated refunds
     */
    async processRefunds(booking, breakdown) {
        const { Payment } = require('../models');
        
        // Refund to organizer if applicable
        if (breakdown.organizerRefund > 0) {
            const organizer = await Organizer.findByPk(booking.organizerId);
            await Payment.create({
                bookingId: [booking.id](http://booking.id),
                type: 'refund',
                amount: breakdown.organizerRefund,
                status: 'pending',
                toUserId: organizer.userId,
                gatewayProvider: 'razorpay',
            });
            
            // Trigger actual refund via gateway
            // await paymentService.processRefund(...);
        }
        
        // Pay artist if applicable
        if (breakdown.artistReceives > 0) {
            const artist = await Artist.findByPk(booking.artistId);
            await Payment.create({
                bookingId: [booking.id](http://booking.id),
                type: 'refund',
                amount: breakdown.artistReceives,
                status: 'pending',
                toUserId: artist.userId,
            });
        }
    }
    
    /**
     * Send cancellation notifications
     */
    async sendCancellationNotifications(booking, cancellerRole, breakdown) {
        const artist = await Artist.findByPk(booking.artistId);
        const organizer = await Organizer.findByPk(booking.organizerId);
        
        const otherPartyUserId = cancellerRole === 'artist' 
            ? organizer.userId 
            : artist.userId;
        
        await notificationService.sendNotification({
            userId: otherPartyUserId,
            type: 'booking_cancelled',
            title: '❌ Booking Cancelled',
            message: `The booking for ${dayjs(booking.eventDate).format('MMM D, YYYY')} has been cancelled by the ${cancellerRole}.`,
            data: {
                bookingId: [booking.id](http://booking.id),
                cancelledBy: cancellerRole,
                refundAmount: cancellerRole === 'artist' 
                    ? breakdown.organizerRefund 
                    : breakdown.artistReceives,
            },
            priority: 'high',
        });
    }
    
    /**
     * Reopen slot for new bookings
     */
    async reopenSlot(booking) {
        const { Opportunity } = require('../models');
        
        // If this was from a programmed slot, reopen it
        if (booking.opportunityId) {
            const opportunity = await Opportunity.findByPk(booking.opportunityId);
            if (opportunity && opportunity.isProgrammed) {
                await opportunity.update({
                    status: 'active',
                    currentApplications: 0,
                });
                
                // Notify venue about reopened slot
                await notificationService.sendNotification({
                    userId: booking.venue?.userId,
                    type: 'slot_reopened',
                    title: '📅 Slot Available',
                    message: `The ${dayjs(booking.eventDate).format('MMM D')} slot is available for rebooking`,
                    data: { opportunityId: [opportunity.id](http://opportunity.id) },
                });
            }
        }
    }
}

module.exports = new CancellationService();
```

---

# Chapters 15-18: Admin Dashboard, Testing & Deployment

<aside>
📖

**The Final Stretch:** We've built all the features. Now it's time to add the control center, ensure quality through testing, and deploy our platform to production. This is where it all comes together.

</aside>

---

# Chapter 15: Admin Dashboard

## 15.1 The Story: Platform Control Center

Admins need visibility into:

- **User management** – verify, suspend, ban users
- **Booking oversight** – monitor disputes, cancellations
- **Financial reporting** – commissions, refunds, payouts
- **Platform health** – metrics, alerts, system status

---

## 15.2 Admin Service

**Create `src/services/admin.service.js`:**

```jsx
// src/services/admin.service.js
// The control tower - platform management

const { User, Artist, Organizer, Venue, Booking, Payment, TrustScore } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const dayjs = require('dayjs');

class AdminService {
    /**
     * Get dashboard overview metrics
     */
    async getDashboardMetrics(dateRange = 30) {
        const startDate = dayjs().subtract(dateRange, 'days').toDate();
        
        // User metrics
        const userMetrics = await this.getUserMetrics(startDate);
        
        // Booking metrics
        const bookingMetrics = await this.getBookingMetrics(startDate);
        
        // Financial metrics
        const financialMetrics = await this.getFinancialMetrics(startDate);
        
        // Platform health
        const healthMetrics = await this.getHealthMetrics();
        
        return {
            users: userMetrics,
            bookings: bookingMetrics,
            financial: financialMetrics,
            health: healthMetrics,
            generatedAt: new Date(),
        };
    }
    
    /**
     * User metrics
     */
    async getUserMetrics(since) {
        const totalUsers = await User.count();
        const newUsers = await User.count({
            where: { createdAt: { [Op.gte]: since } },
        });
        
        const byRole = await User.findAll({
            attributes: [
                'role',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['role'],
        });
        
        const pendingVerifications = await Promise.all([
            Artist.count({ where: { verificationStatus: 'pending' } }),
            Organizer.count({ where: { verificationStatus: 'pending' } }),
            Venue.count({ where: { verificationStatus: 'pending' } }),
        ]);
        
        return {
            total: totalUsers,
            new: newUsers,
            byRole: byRole.reduce((acc, r) => {
                acc[r.role] = parseInt(r.dataValues.count);
                return acc;
            }, {}),
            pendingVerifications: pendingVerifications.reduce((a, b) => a + b, 0),
        };
    }
    
    /**
     * Booking metrics
     */
    async getBookingMetrics(since) {
        const total = await Booking.count();
        const recent = await Booking.count({
            where: { createdAt: { [Op.gte]: since } },
        });
        
        const byStatus = await Booking.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            where: { createdAt: { [Op.gte]: since } },
            group: ['status'],
        });
        
        const completionRate = await this.calculateCompletionRate(since);
        const cancellationRate = await this.calculateCancellationRate(since);
        
        return {
            total,
            recent,
            byStatus: byStatus.reduce((acc, s) => {
                acc[s.status] = parseInt(s.dataValues.count);
                return acc;
            }, {}),
            completionRate,
            cancellationRate,
        };
    }
    
    /**
     * Financial metrics
     */
    async getFinancialMetrics(since) {
        const totalGMV = await Payment.sum('amount', {
            where: {
                status: 'completed',
                type: { [[Op.in](http://Op.in)]: ['deposit', 'balance'] },
                createdAt: { [Op.gte]: since },
            },
        });
        
        const totalCommissions = await Payment.sum('amount', {
            where: {
                status: 'completed',
                type: 'commission',
                createdAt: { [Op.gte]: since },
            },
        });
        
        const totalRefunds = await Payment.sum('amount', {
            where: {
                status: 'completed',
                type: 'refund',
                createdAt: { [Op.gte]: since },
            },
        });
        
        const pendingPayouts = await Payment.sum('amount', {
            where: {
                status: 'completed',
                escrowStatus: 'held',
            },
        });
        
        return {
            gmv: parseFloat(totalGMV || 0),
            commissions: parseFloat(totalCommissions || 0),
            refunds: parseFloat(Math.abs(totalRefunds || 0)),
            pendingPayouts: parseFloat(pendingPayouts || 0),
            currency: 'INR',
        };
    }
    
    /**
     * Platform health metrics
     */
    async getHealthMetrics() {
        // Average trust score
        const avgTrustScore = await TrustScore.findOne({
            attributes: [[sequelize.fn('AVG', sequelize.col('current_score')), 'avg']],
        });
        
        // Users at risk (low trust scores)
        const atRiskUsers = await TrustScore.count({
            where: { currentScore: { [[Op.lt](http://Op.lt)]: 40 } },
        });
        
        // Active disputes
        const activeDisputes = await Booking.count({
            where: { status: 'disputed' },
        });
        
        return {
            averageTrustScore: parseFloat(avgTrustScore?.dataValues?.avg || 50).toFixed(1),
            atRiskUsers,
            activeDisputes,
            systemStatus: 'healthy',
        };
    }
    
    /**
     * User management - get users with filters
     */
    async getUsers({ page = 1, limit = 50, role, status, search, sortBy = 'createdAt' }) {
        const where = {};
        
        if (role) where.role = role;
        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { email: { [Op.iLike]: `%${search}%` } },
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
            ];
        }
        
        const { rows: users, count: total } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password', 'refreshToken'] },
            include: [{ model: TrustScore, as: 'trustScore' }],
            order: [[sortBy, 'DESC']],
            limit,
            offset: (page - 1) * limit,
        });
        
        return { users, pagination: { page, limit, total } };
    }
    
    /**
     * Update user status
     */
    async updateUserStatus(userId, action, reason) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error('User not found');
        
        const statusMap = {
            activate: 'active',
            suspend: 'suspended',
            ban: 'banned',
        };
        
        const newStatus = statusMap[action];
        if (!newStatus) throw new Error('Invalid action');
        
        await user.update({
            status: newStatus,
            statusReason: reason,
            statusUpdatedAt: new Date(),
        });
        
        // Notify user
        await require('./notification.service').sendNotification({
            userId,
            type: `account_${action}`,
            title: action === 'activate' ? 'Account Activated' :
                   action === 'suspend' ? 'Account Suspended' : 'Account Banned',
            message: reason,
            priority: 'high',
        });
        
        return user;
    }
    
    /**
     * Verify user profile
     */
    async verifyProfile(profileType, profileId, decision, notes) {
        let model;
        switch (profileType) {
            case 'artist': model = Artist; break;
            case 'organizer': model = Organizer; break;
            case 'venue': model = Venue; break;
            default: throw new Error('Invalid profile type');
        }
        
        const profile = await model.findByPk(profileId, {
            include: [{ model: User, as: 'user' }],
        });
        
        if (!profile) throw new Error('Profile not found');
        
        const newStatus = decision === 'approve' ? 'approved' : 'rejected';
        
        await profile.update({
            verificationStatus: newStatus,
            verificationNotes: notes,
            verifiedAt: decision === 'approve' ? new Date() : null,
        });
        
        // Update trust score for verification
        if (decision === 'approve') {
            const trustScoreService = require('./trustScore.service');
            await trustScoreService.updateScore(
                await TrustScore.findOne({ where: { userId: [profile.user.id](http://profile.user.id) } }),
                10,
                'profile_verified',
                { profileType, profileId }
            );
        }
        
        // Notify user
        await require('./notification.service').sendNotification({
            userId: [profile.user.id](http://profile.user.id),
            type: `verification_${decision}`,
            title: decision === 'approve' ? '✅ Profile Verified!' : '❌ Verification Declined',
            message: decision === 'approve'
                ? 'Your profile has been verified. You can now access all platform features.'
                : `Your profile verification was declined. Reason: ${notes}`,
            priority: 'high',
        });
        
        return profile;
    }
    
    /**
     * Handle dispute
     */
    async resolveDispute(bookingId, resolution, notes) {
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Artist, as: 'artist' },
                { model: Organizer, as: 'organizer' },
                { model: Payment, as: 'payments' },
            ],
        });
        
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'disputed') throw new Error('Booking is not in dispute');
        
        const { favoredParty, refundPercentage } = resolution;
        
        // Process resolution
        await booking.update({
            status: 'dispute_resolved',
            disputeResolution: {
                favoredParty,
                refundPercentage,
                notes,
                resolvedAt: new Date(),
            },
        });
        
        // Handle financial resolution
        if (refundPercentage > 0) {
            const totalPaid = booking.payments
                .filter(p => ['deposit', 'balance'].includes(p.type) && p.status === 'completed')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0);
            
            const refundAmount = totalPaid * (refundPercentage / 100);
            
            const paymentService = require('./payment.service');
            // Process refund to appropriate party
        }
        
        // Update trust scores
        const trustScoreService = require('./trustScore.service');
        // Penalize the party not favored
        
        return booking;
    }
    
    async calculateCompletionRate(since) {
        const completed = await Booking.count({
            where: { status: 'completed', createdAt: { [Op.gte]: since } },
        });
        const total = await Booking.count({
            where: {
                status: { [Op.notIn]: ['pending_contract', 'cancelled'] },
                createdAt: { [Op.gte]: since },
            },
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
    
    async calculateCancellationRate(since) {
        const cancelled = await Booking.count({
            where: { status: 'cancelled', createdAt: { [Op.gte]: since } },
        });
        const total = await Booking.count({
            where: { createdAt: { [Op.gte]: since } },
        });
        return total > 0 ? Math.round((cancelled / total) * 100) : 0;
    }
}

module.exports = new AdminService();
```

---

## 15.3 Admin Routes

**Create `src/routes/admin.routes.js`:**

```jsx
// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminService = require('../services/admin.service');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/logging.middleware');

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

// Dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const metrics = await adminService.getDashboardMetrics(
            parseInt(req.query.days) || 30
        );
        res.json({ status: 'success', data: metrics });
    } catch (error) {
        next(error);
    }
});

// Users management
router.get('/users', async (req, res, next) => {
    try {
        const result = await adminService.getUsers(req.query);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.patch('/users/:userId/status',
    auditLog('user_status_change'),
    async (req, res, next) => {
        try {
            const { action, reason } = req.body;
            const user = await adminService.updateUserStatus(
                req.params.userId,
                action,
                reason
            );
            res.json({ status: 'success', data: user });
        } catch (error) {
            next(error);
        }
    }
);

// Verification
[router.post](http://router.post)('/verify/:type/:profileId',
    auditLog('profile_verification'),
    async (req, res, next) => {
        try {
            const { decision, notes } = req.body;
            const profile = await adminService.verifyProfile(
                req.params.type,
                req.params.profileId,
                decision,
                notes
            );
            res.json({ status: 'success', data: profile });
        } catch (error) {
            next(error);
        }
    }
);

// Disputes
[router.post](http://router.post)('/disputes/:bookingId/resolve',
    auditLog('dispute_resolution'),
    async (req, res, next) => {
        try {
            const booking = await adminService.resolveDispute(
                req.params.bookingId,
                req.body.resolution,
                req.body.notes
            );
            res.json({ status: 'success', data: booking });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
```

---

# Chapter 16: Testing Strategy

## 16.1 The Story: Confidence Through Tests

We need:

- **Unit tests** for services and utilities
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows

---

## 16.2 Test Configuration

**Create `jest.config.js`:**

```jsx
// jest.config.js
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/app.js',
        '!src/server.js',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
};
```

**Create `tests/setup.js`:**

```jsx
// tests/setup.js
const { sequelize } = require('../src/config/database');

beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();
    // Sync models (use force: true only in test)
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});

// Global test helpers
global.testHelpers = {
    createTestUser: async (overrides = {}) => {
        const { User } = require('../src/models');
        return User.create({
            email: `test-${[Date.now](http://Date.now)()}@[example.com](http://example.com)`,
            password: 'hashedpassword',
            firstName: 'Test',
            lastName: 'User',
            role: 'artist',
            status: 'active',
            ...overrides,
        });
    },
    
    createTestArtist: async (userId, overrides = {}) => {
        const { Artist } = require('../src/models');
        return Artist.create({
            userId,
            artistName: 'Test Artist',
            primaryGenre: 'house',
            minimumFee: 5000,
            standardFee: 10000,
            verificationStatus: 'approved',
            ...overrides,
        });
    },
    
    generateAuthToken: (user) => {
        const { generateAccessToken } = require('../src/utils/jwt');
        return generateAccessToken(user);
    },
};
```

---

## 16.3 Unit Tests

**Create `tests/unit/trustScore.test.js`:**

```jsx
// tests/unit/trustScore.test.js
const trustScoreService = require('../../src/services/trustScore.service');

describe('TrustScoreService', () => {
    describe('determineTier', () => {
        it('should return critical for score 0-30', () => {
            expect(trustScoreService.determineTier(0)).toBe('critical');
            expect(trustScoreService.determineTier(15)).toBe('critical');
            expect(trustScoreService.determineTier(30)).toBe('critical');
        });
        
        it('should return risky for score 31-50', () => {
            expect(trustScoreService.determineTier(31)).toBe('risky');
            expect(trustScoreService.determineTier(40)).toBe('risky');
            expect(trustScoreService.determineTier(50)).toBe('risky');
        });
        
        it('should return standard for score 51-70', () => {
            expect(trustScoreService.determineTier(51)).toBe('standard');
            expect(trustScoreService.determineTier(60)).toBe('standard');
            expect(trustScoreService.determineTier(70)).toBe('standard');
        });
        
        it('should return trusted for score 71-85', () => {
            expect(trustScoreService.determineTier(71)).toBe('trusted');
            expect(trustScoreService.determineTier(80)).toBe('trusted');
            expect(trustScoreService.determineTier(85)).toBe('trusted');
        });
        
        it('should return premium for score 86-100', () => {
            expect(trustScoreService.determineTier(86)).toBe('premium');
            expect(trustScoreService.determineTier(90)).toBe('premium');
            expect(trustScoreService.determineTier(100)).toBe('premium');
        });
    });
    
    describe('getCommissionRate', () => {
        it('should return correct commission for each tier', () => {
            expect(trustScoreService.getCommissionRate({ currentScore: 90 })).toBe(2.0);
            expect(trustScoreService.getCommissionRate({ currentScore: 75 })).toBe(2.5);
            expect(trustScoreService.getCommissionRate({ currentScore: 60 })).toBe(3.0);
            expect(trustScoreService.getCommissionRate({ currentScore: 40 })).toBe(4.0);
            expect(trustScoreService.getCommissionRate({ currentScore: 20 })).toBe(5.0);
        });
        
        it('should return standard rate for null trust score', () => {
            expect(trustScoreService.getCommissionRate(null)).toBe(3.0);
        });
    });
    
    describe('getApplicationLimits', () => {
        it('should return higher limits for higher scores', () => {
            const premium = trustScoreService.getApplicationLimits({ currentScore: 90 });
            const standard = trustScoreService.getApplicationLimits({ currentScore: 60 });
            
            expect(premium.pending).toBeGreaterThan(standard.pending);
            expect(premium.perDay).toBeGreaterThan(standard.perDay);
        });
    });
});
```

---

## 16.4 Integration Tests

**Create `tests/integration/auth.test.js`:**

```jsx
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: '[newuser@example.com](mailto:newuser@example.com)',
                    password: 'SecurePass123!',
                    firstName: 'New',
                    lastName: 'User',
                    role: 'artist',
                });
            
            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect([response.body.data.user.email](http://response.body.data.user.email)).toBe('[newuser@example.com](mailto:newuser@example.com)');
            expect([response.body.data](http://response.body.data).accessToken).toBeDefined();
        });
        
        it('should reject duplicate email', async () => {
            // Create user first
            await global.testHelpers.createTestUser({ email: '[duplicate@example.com](mailto:duplicate@example.com)' });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: '[duplicate@example.com](mailto:duplicate@example.com)',
                    password: 'SecurePass123!',
                    firstName: 'Dup',
                    lastName: 'User',
                    role: 'artist',
                });
            
            expect(response.status).toBe(409);
        });
        
        it('should reject weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: '[weak@example.com](mailto:weak@example.com)',
                    password: '123',
                    firstName: 'Weak',
                    lastName: 'Pass',
                    role: 'artist',
                });
            
            expect(response.status).toBe(400);
        });
    });
    
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create test user with known password
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('TestPass123!', 10);
            await User.create({
                email: '[login@example.com](mailto:login@example.com)',
                password: hashedPassword,
                firstName: 'Login',
                lastName: 'Test',
                role: 'artist',
                status: 'active',
            });
        });
        
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: '[login@example.com](mailto:login@example.com)',
                    password: 'TestPass123!',
                });
            
            expect(response.status).toBe(200);
            expect([response.body.data](http://response.body.data).accessToken).toBeDefined();
        });
        
        it('should reject invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: '[login@example.com](mailto:login@example.com)',
                    password: 'WrongPassword',
                });
            
            expect(response.status).toBe(401);
        });
    });
});
```

**Create `tests/integration/booking.test.js`:**

```jsx
// tests/integration/booking.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Opportunity, Artist, Organizer, Venue } = require('../../src/models');

describe('Booking Flow API', () => {
    let artistUser, organizerUser, artistProfile, organizerProfile, venueProfile;
    let artistToken, organizerToken;
    let opportunity;
    
    beforeEach(async () => {
        // Setup test users and profiles
        artistUser = await global.testHelpers.createTestUser({ role: 'artist' });
        organizerUser = await global.testHelpers.createTestUser({ role: 'organizer' });
        
        artistProfile = await global.testHelpers.createTestArtist([artistUser.id](http://artistUser.id));
        
        organizerProfile = await Organizer.create({
            userId: [organizerUser.id](http://organizerUser.id),
            organizationName: 'Test Events',
            verificationStatus: 'approved',
        });
        
        venueProfile = await Venue.create({
            userId: [organizerUser.id](http://organizerUser.id),
            venueName: 'Test Club',
            city: 'Mumbai',
            standingCapacity: 500,
            verificationStatus: 'approved',
        });
        
        // Generate tokens
        artistToken = global.testHelpers.generateAuthToken(artistUser);
        organizerToken = global.testHelpers.generateAuthToken(organizerUser);
        
        // Create opportunity
        opportunity = await Opportunity.create({
            organizerId: [organizerProfile.id](http://organizerProfile.id),
            venueId: [venueProfile.id](http://venueProfile.id),
            title: 'Test Event',
            eventDate: new Date([Date.now](http://Date.now)() + 30 * 24 * 60 * 60 * 1000), // 30 days
            slotType: 'headliner',
            budgetMin: 8000,
            budgetMax: 15000,
            status: 'active',
            requiredGenres: ['house', 'techno'],
        });
    });
    
    describe('GET /api/opportunities', () => {
        it('should return opportunities for artist', async () => {
            const response = await request(app)
                .get('/api/opportunities')
                .set('Authorization', `Bearer ${artistToken}`);
            
            expect(response.status).toBe(200);
            expect([response.body.data](http://response.body.data).opportunities).toBeDefined();
            expect([response.body.data](http://response.body.data).opportunities.length).toBeGreaterThan(0);
        });
        
        it('should include match scores', async () => {
            const response = await request(app)
                .get('/api/opportunities')
                .set('Authorization', `Bearer ${artistToken}`);
            
            const opp = [response.body.data](http://response.body.data).opportunities[0];
            expect(opp.matchScore).toBeDefined();
            expect(opp.matchScore).toBeGreaterThanOrEqual(0);
            expect(opp.matchScore).toBeLessThanOrEqual(100);
        });
    });
    
    describe('POST /api/applications', () => {
        it('should allow artist to apply', async () => {
            const response = await request(app)
                .post('/api/applications')
                .set('Authorization', `Bearer ${artistToken}`)
                .send({
                    opportunityId: [opportunity.id](http://opportunity.id),
                    proposedFee: 10000,
                    personalMessage: 'I would love to play here!',
                });
            
            expect(response.status).toBe(201);
            expect([response.body.data](http://response.body.data).status).toBe('pending');
        });
        
        it('should prevent duplicate applications', async () => {
            // First application
            await request(app)
                .post('/api/applications')
                .set('Authorization', `Bearer ${artistToken}`)
                .send({ opportunityId: [opportunity.id](http://opportunity.id), proposedFee: 10000 });
            
            // Second application
            const response = await request(app)
                .post('/api/applications')
                .set('Authorization', `Bearer ${artistToken}`)
                .send({ opportunityId: [opportunity.id](http://opportunity.id), proposedFee: 10000 });
            
            expect(response.status).toBe(400);
        });
    });
});
```

---

# Chapter 17: Deployment Configuration

## 17.1 The Story: Going Live

We deploy with:

- **Docker** for containerization
- **GitHub Actions** for CI/CD
- **AWS/GCP** for cloud hosting
- **PM2** for process management

---

## 17.2 Docker Configuration

**Create `Dockerfile`:**

```docker
# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "server.js"]
```

**Create `docker-compose.yml`:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/musicplatform
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=musicplatform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

---

## 17.3 GitHub Actions CI/CD

**Create `.github/workflows/ci.yml`:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: postgres://test:[test@localhost:5432](mailto:test@localhost:5432)/test_db
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: [ghcr.io](http://ghcr.io)
          username: $ [github.actor](http://github.actor) 
          password: $ secrets.GITHUB_TOKEN 
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: [ghcr.io/$](http://ghcr.io/$) github.repository :latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: $ [secrets.PROD](http://secrets.PROD)_HOST 
          username: $ [secrets.PROD](http://secrets.PROD)_USER 
          key: $ [secrets.PROD](http://secrets.PROD)_SSH_KEY 
          script: |
            cd /app
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

# Chapter 18: Production Checklist & Monitoring

## 18.1 Pre-Launch Checklist

```markdown
## Security
- [ ] All environment variables secured (not in code)
- [ ] HTTPS enforced everywhere
- [ ] Rate limiting configured
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization, CSP headers)
- [ ] CORS configured properly
- [ ] Sensitive data encrypted at rest
- [ ] Password policy enforced
- [ ] JWT tokens with reasonable expiry

## Database
- [ ] Indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Automated backups enabled
- [ ] Migration scripts tested
- [ ] Read replicas for scaling (if needed)

## Performance
- [ ] Response times < 200ms for key endpoints
- [ ] Database query optimization complete
- [ ] Caching implemented (Redis)
- [ ] Static assets served via CDN
- [ ] Gzip compression enabled

## Monitoring
- [ ] Application logging (structured JSON)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Performance monitoring (APM)
- [ ] Database monitoring
- [ ] Alerting configured

## Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policies defined
- [ ] User data export functionality

## Operations
- [ ] Runbook documented
- [ ] Incident response plan
- [ ] On-call rotation established
- [ ] Rollback procedure tested
- [ ] Load testing completed
```

---

## 18.2 Monitoring Setup

**Create `src/utils/monitoring.js`:**

```jsx
// src/utils/monitoring.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        integrations: [
            new ProfilingIntegration(),
        ],
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
    });
}

// Custom metrics
class Metrics {
    constructor() {
        this.counters = {};
        this.timings = {};
    }
    
    increment(metric, value = 1, tags = {}) {
        const key = this.buildKey(metric, tags);
        this.counters[key] = (this.counters[key] || 0) + value;
        
        // Send to monitoring service
        this.send('counter', metric, value, tags);
    }
    
    timing(metric, value, tags = {}) {
        this.send('timing', metric, value, tags);
    }
    
    gauge(metric, value, tags = {}) {
        this.send('gauge', metric, value, tags);
    }
    
    startTimer() {
        return [Date.now](http://Date.now)();
    }
    
    endTimer(start, metric, tags = {}) {
        const duration = [Date.now](http://Date.now)() - start;
        this.timing(metric, duration, tags);
        return duration;
    }
    
    buildKey(metric, tags) {
        const tagStr = Object.entries(tags)
            .map(([k, v]) => `${k}:${v}`)
            .join(',');
        return `${metric}|${tagStr}`;
    }
    
    send(type, metric, value, tags) {
        // Integration with DataDog, Prometheus, etc.
        if (process.env.DD_API_KEY) {
            // Send to DataDog
        }
        
        // Log for local development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[METRIC] ${type}: ${metric} = ${value}`, tags);
        }
    }
}

const metrics = new Metrics();

// Health check endpoint data
const healthCheck = async () => {
    const checks = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {},
    };
    
    // Database check
    try {
        const { sequelize } = require('../config/database');
        await sequelize.authenticate();
        [checks.services](http://checks.services).database = { status: 'healthy' };
    } catch (error) {
        [checks.services](http://checks.services).database = { status: 'unhealthy', error: error.message };
        checks.status = 'degraded';
    }
    
    // Redis check
    try {
        const redis = require('../config/redis');
        await [redis.ping](http://redis.ping)();
        [checks.services](http://checks.services).redis = { status: 'healthy' };
    } catch (error) {
        [checks.services](http://checks.services).redis = { status: 'unhealthy', error: error.message };
        checks.status = 'degraded';
    }
    
    return checks;
};

module.exports = {
    Sentry,
    metrics,
    healthCheck,
};
```

---

## 18.3 Final Words

<aside>
🎉

**Congratulations!** You've built a complete Music Artist Management Platform from scratch. This guide covered:

- ✅ Project setup and architecture
- ✅ Database design with 10+ models
- ✅ Authentication with JWT and RBAC
- ✅ Security middleware layers
- ✅ Gig discovery and applications
- ✅ Negotiation engine (3-round system)
- ✅ Booking management
- ✅ Contract generation with e-signatures
- ✅ Payment milestones with escrow
- ✅ Trust score algorithm (5 tiers)
- ✅ Venue programming (3-6 month calendars)
- ✅ Calendar and scheduling
- ✅ Real-time notifications
- ✅ Cancellation workflows
- ✅ Admin dashboard
- ✅ Testing strategy
- ✅ Docker deployment
- ✅ CI/CD pipeline
- ✅ Production monitoring

