# 📡 API Documentation - Music Artist Management Platform

## Overview

This document provides comprehensive API documentation for the Music Artist Management Platform. All APIs follow REST principles and return JSON responses.

**Base URL**: `https://api.musicplatform.com/api/v1`  
**Authentication**: Session-based (cookie)  
**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Artist Profiles](#3-artist-profiles)
4. [Venue Management](#4-venue-management)
5. [Opportunities & Applications](#5-opportunities--applications)
6. [Bookings](#6-bookings)
7. [Negotiations](#7-negotiations)
8. [Contracts](#8-contracts)
9. [Payments](#9-payments)
10. [Search & Discovery](#10-search--discovery)
11. [Notifications](#11-notifications)
12. [Analytics](#12-analytics)

---

## 1. Authentication

### 1.1 Register User

Register a new user account.

**Endpoint**: `POST /api/auth/register`  
**Auth Required**: No

**Request Body**:
```json
{
  "email": "artist@example.com",
  "password": "SecurePass123!",
  "phone": "+919876543210",
  "role": "artist",
  "firstName": "John",
  "lastName": "Doe",
  "agreeToTerms": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "artist@example.com",
    "status": "pending_verification"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Email or phone already exists

---

### 1.2 Login

Authenticate user and create session.

**Endpoint**: `POST /api/auth/login`  
**Auth Required**: No

**Request Body**:
```json
{
  "email": "artist@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "artist@example.com",
      "displayName": "John Doe",
      "roles": ["artist"],
      "status": "active"
    },
    "session": {
      "expiresAt": "2026-02-10T13:56:47+05:30"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing credentials
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Email not verified

---

### 1.3 Get Current User

Retrieve currently authenticated user.

**Endpoint**: `GET /api/auth/me`  
**Auth Required**: Yes

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "artist@example.com",
    "displayName": "John Doe",
    "roles": ["artist"],
    "status": "active",
    "profile": {
      "artistId": "660e8400-e29b-41d4-a716-446655440000",
      "artistName": "DJ Shadow",
      "trustScore": 75.5,
      "isVerified": true
    }
  }
}
```

---

### 1.4 Logout

End user session.

**Endpoint**: `POST /api/auth/logout`  
**Auth Required**: Yes

**Response** (204 No Content)

---

### 1.5 Verify Email

Verify user email address.

**Endpoint**: `POST /api/auth/verify-email`  
**Auth Required**: No

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "redirectUrl": "/login"
  }
}
```

---

### 1.6 Request Password Reset

Request password reset email.

**Endpoint**: `POST /api/auth/forgot-password`  
**Auth Required**: No

**Request Body**:
```json
{
  "email": "artist@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

---

### 1.7 Reset Password

Reset user password with token.

**Endpoint**: `POST /api/auth/reset-password`  
**Auth Required**: No

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with new password."
}
```

---

## 2. User Management

### 2.1 List Users

List all users (admin only).

**Endpoint**: `GET /api/users`  
**Auth Required**: Yes (Admin only)

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by user status
- `role` (string): Filter by role
- `search` (string): Search by name or email

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "artist@example.com",
      "displayName": "John Doe",
      "roles": ["artist"],
      "status": "active",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
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

---

### 2.2 Get User by ID

Get specific user details.

**Endpoint**: `GET /api/users/:id`  
**Auth Required**: Yes (Self or Admin)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "artist@example.com",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+919876543210",
    "roles": ["artist"],
    "status": "active",
    "locale": "en-IN",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-01T14:20:00Z"
  }
}
```

---

### 2.3 Update User

Update user profile.

**Endpoint**: `PATCH /api/users/:id`  
**Auth Required**: Yes (Self or Admin)

**Request Body**:
```json
{
  "displayName": "John 'The Shadow' Doe",
  "phone": "+919876543210",
  "locale": "en-IN",
  "timezone": "Asia/Kolkata"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { /* updated user object */ }
}
```

---

## 3. Artist Profiles

### 3.1 Create Artist Profile

Create a new artist profile.

**Endpoint**: `POST /api/artists`  
**Auth Required**: Yes (Artist role required)

**Request Body**:
```json
{
  "artistName": "DJ Shadow",
  "bio": "Professional DJ with 10+ years experience in techno and house music.",
  "yearsExperience": 10,
  "genres": ["techno", "house", "electronic"],
  "budgetMin": 10000,
  "budgetStandard": 20000,
  "budgetPremium": 35000,
  "location": {
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India"
  },
  "socialLinks": {
    "soundcloud": "https://soundcloud.com/djshadow",
    "instagram": "https://instagram.com/djshadow",
    "facebook": "https://facebook.com/djshadow"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Artist profile created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "artistName": "DJ Shadow",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "trustScore": 50.0,
    "isVerified": false,
    "createdAt": "2026-02-03T13:56:47+05:30"
  }
}
```

---

### 3.2 List Artists

Browse artist profiles with filters.

**Endpoint**: `GET /api/artists`  
**Auth Required**: No (public endpoint)

**Query Parameters**:
- `page`, `pageSize`: Pagination
- `genre`: Filter by genre
- `budgetMin`, `budgetMax`: Budget range filter
- `city`: Filter by city
- `minTrustScore`: Minimum trust score
- `verified`: Show only verified artists (boolean)
- `sortBy`: Sort field (trustScore, budget, experience)
- `sortOrder`: asc or desc

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "artistName": "DJ Shadow",
      "bio": "Professional DJ with 10+ years experience...",
      "genres": ["techno", "house", "electronic"],
      "budgetRange": {
        "min": 10000,
        "standard": 20000,
        "premium": 35000
      },
      "trustScore": 75.5,
      "isVerified": true,
      "yearsExperience": 10,
      "location": {
        "city": "Bangalore",
        "state": "Karnataka"
      },
      "profilePhoto": "https://cdn.example.com/photos/artist-123.jpg",
      "totalBookings": 45
    }
  ],
  "pagination": { /* pagination object */ }
}
```

---

### 3.3 Get Artist Profile

Get detailed artist profile.

**Endpoint**: `GET /api/artists/:id`  
**Auth Required**: No (public endpoint)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "artistName": "DJ Shadow",
    "bio": "Professional DJ with 10+ years experience in techno and house music.",
    "genres": ["techno", "house", "electronic"],
    "budgetRange": {
      "min": 10000,
      "standard": 20000,
      "premium": 35000,
      "currency": "INR"
    },
    "trustScore": 75.5,
    "isVerified": true,
    "yearsExperience": 10,
    "location": {
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India"
    },
    "socialLinks": {
      "soundcloud": "https://soundcloud.com/djshadow",
      "instagram": "https://instagram.com/djshadow"
    },
    "portfolio": [
      {
        "id": "photo-1",
        "type": "image",
        "url": "https://cdn.example.com/portfolio/1.jpg",
        "caption": "Sunburn Festival 2025"
      }
    ],
    "stats": {
      "totalBookings": 45,
      "completedBookings": 42,
      "cancelledBookings": 1,
      "averageRating": 4.7,
      "totalEarnings": 850000
    },
    "achievements": [
      "Performed at Sunburn Festival 2025",
      "Resident DJ at High Ultra Lounge"
    ],
    "technicalRider": {
      "url": "https://cdn.example.com/riders/djshadow.pdf",
      "updatedAt": "2026-01-20T10:00:00Z"
    }
  }
}
```

---

### 3.4 Update Artist Profile

Update artist profile information.

**Endpoint**: `PATCH /api/artists/:id`  
**Auth Required**: Yes (Artist owner or Admin)

**Request Body**:
```json
{
  "bio": "Updated bio with new achievements...",
  "budgetStandard": 25000,
  "genres": ["techno", "house", "electronic", "progressive"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Artist profile updated successfully",
  "data": { /* updated artist profile */ }
}
```

---

### 3.5 Upload Portfolio Item

Add item to artist portfolio.

**Endpoint**: `POST /api/artists/:id/portfolio`  
**Auth Required**: Yes (Artist owner)  
**Content-Type**: `multipart/form-data`

**Request Body** (form-data):
- `file`: Image file (max 5MB, jpg/png)
- `caption`: Description text
- `type`: "image" | "video" | "audio"

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Portfolio item uploaded successfully",
  "data": {
    "id": "photo-5",
    "type": "image",
    "url": "https://cdn.example.com/portfolio/photo-5.jpg",
    "caption": "NH7 Weekender Performance",
    "uploadedAt": "2026-02-03T14:00:00Z"
  }
}
```

---

### 3.6 Get Artist Bookings

Get all bookings for an artist.

**Endpoint**: `GET /api/artists/:id/bookings`  
**Auth Required**: Yes (Artist owner or Admin)

**Query Parameters**:
- `status`: Filter by booking status
- `from`, `to`: Date range filter
- `page`, `pageSize`: Pagination

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-1",
      "eventDate": "2026-03-15",
      "venueName": "High Ultra Lounge",
      "city": "Bangalore",
      "slotTime": "closing",
      "duration": 120,
      "status": "confirmed",
      "budget": 25000,
      "currency": "INR",
      "organizerName": "XYZ Events"
    }
  ],
  "pagination": { /* pagination */ }
}
```

---

### 3.7 Get Artist Earnings

Get earnings statistics for an artist.

**Endpoint**: `GET /api/artists/:id/earnings`  
**Auth Required**: Yes (Artist owner or Admin)

**Query Parameters**:
- `period`: "month" | "quarter" | "year" | "all"
- `year`: Specific year
- `month`: Specific month (1-12)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total": 850000,
    "currency": "INR",
    "breakdown": {
      "received": 800000,
      "pending": 50000,
      "upcoming": 150000
    },
    "byMonth": [
      { "month": "2026-01", "amount": 180000 },
      { "month": "2026-02", "amount": 250000 }
    ],
    "avgPerBooking": 20000,
    "topVenues": [
      { "venueName": "High Ultra Lounge", "totalEarnings": 300000 }
    ]
  }
}
```

---

## 4. Venue Management

### 4.1 Create Venue

Create a new venue profile.

**Endpoint**: `POST /api/venues`  
**Auth Required**: Yes (Venue Manager role)

**Request Body**:
```json
{
  "name": "High Ultra Lounge",
  "description": "Premium nightclub with world-class sound system",
  "venueType": "nightclub",
  "capacity": 800,
  "location": {
    "address": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001",
    "coordinates": {
      "lat": 12.9716,
      "lng": 77.5946
    }
  },
  "amenities": ["premium_sound", "vip_area", "parking", "valet"],
  "technicalSpecs": {
    "soundSystem": "Pioneer",
    "mixerModel": "DJM-900NXS2",
    "cdjs": 4,
    "backlineAvailable": true
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Venue created successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "High Ultra Lounge",
    "trustScore": 50.0,
    "isVerified": false,
    "createdAt": "2026-02-03T14:10:00Z"
  }
}
```

---

### 4.2 List Venues

Browse venues with filters.

**Endpoint**: `GET /api/venues`  
**Auth Required**: No (public endpoint)

**Query Parameters**:
- `city`, `state`: Location filters
- `capacity`: Minimum capacity
- `venueType`: Filter by type
- `amenities`: Filter by amenities (comma-separated)
- `verified`: Show only verified venues

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "High Ultra Lounge",
      "venueType": "nightclub",
      "capacity": 800,
      "city": "Bangalore",
      "trustScore": 85.5,
      "isVerified": true,
      "photos": [
        "https://cdn.example.com/venues/high-1.jpg"
      ],
      "totalEvents": 120
    }
  ],
  "pagination": { /* pagination */ }
}
```

---

### 4.3 Get Venue Details

Get detailed venue information.

**Endpoint**: `GET /api/venues/:id`  
**Auth Required**: No (public endpoint)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "High Ultra Lounge",
    "description": "Premium nightclub with world-class sound system",
    "venueType": "nightclub",
    "capacity": 800,
    "location": {
      "address": "123 MG Road",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "coordinates": { "lat": 12.9716, "lng": 77.5946 }
    },
    "amenities": ["premium_sound", "vip_area", "parking"],
    "technicalSpecs": {
      "soundSystem": "Pioneer",
      "mixerModel": "DJM-900NXS2"
    },
    "photos": [
      { "url": "https://cdn.example.com/venues/high-1.jpg" }
    ],
    "trustScore": 85.5,
    "isVerified": true,
    "stats": {
      "totalEvents": 120,
      "upcomingEvents": 8,
      "averageRating": 4.6
    },
    "pastArtists": [
      { "artistName": "DJ Shadow", "eventDate": "2025-12-25" }
    ]
  }
}
```

---

## 5. Opportunities & Applications

### 5.1 Browse Opportunities

Get list of available booking opportunities.

**Endpoint**: `GET /api/opportunities`  
**Auth Required**: Yes (Artist role)

**Query Parameters**:
- `budgetMin`, `budgetMax`: Budget range
- `genre`: Filter by genre
- `city`: Location filter
- `dateFrom`, `dateTo`: Event date range
- `slotTime`: opening|mid|closing
- `sortBy`: date|budget|match_score

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "opp-1",
      "eventDate": "2026-04-15",
      "venueName": "High Ultra Lounge",
      "venueId": "770e8400-e29b-41d4-a716-446655440000",
      "city": "Bangalore",
      "budgetOffered": 25000,
      "currency": "INR",
      "slotTime": "closing",
      "duration": 120,
      "genresPreferred": ["techno", "house"],
      "matchScore": 92,
      "applicationsCount": 3,
      "status": "open",
      "deadline": "2026-03-15T23:59:59Z"
    }
  ],
  "pagination": { /* pagination */ }
}
```

---

### 5.2 Get Opportunity Details

Get full details of an opportunity.

**Endpoint**: `GET /api/opportunities/:id`  
**Auth Required**: Yes (Artist role)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "opp-1",
    "eventName": "Friday Night Techno",
    "eventDate": "2026-04-15",
    "venue": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "High Ultra Lounge",
      "capacity": 800,
      "city": "Bangalore",
      "trustScore": 85.5
    },
    "organizer": {
      "id": "org-1",
      "name": "XYZ Events",
      "trustScore": 78.0
    },
    "budgetOffered": 25000,
    "currency": "INR",
    "slotTime": "closing",
    "performanceStart": "23:00",
    "duration": 120,
    "genresPreferred": ["techno", "house", "electronic"],
    "expectedCrowd": 600,
    "technicalRequirements": {
      "soundCheckTime": "21:00",
      "equipmentProvided": true
    },
    "matchScore": 92,
    "matchReasons": [
      "Genre match: 100%",
      "Budget in your range",
      "Similar past performances"
    ],
    "applicationsCount": 3,
    "deadline": "2026-03-15T23:59:59Z",
    "status": "open"
  }
}
```

---

### 5.3 Create Opportunity

Create a new booking opportunity (organizers only).

**Endpoint**: `POST /api/opportunities`  
**Auth Required**: Yes (Organizer/Venue Manager role)

**Request Body**:
```json
{
  "eventName": "Friday Night Techno",
  "eventDate": "2026-04-15",
  "venueId": "770e8400-e29b-41d4-a716-446655440000",
  "budgetOffered": 25000,
  "currency": "INR",
  "slotTime": "closing",
  "performanceStart": "23:00",
  "duration": 120,
  "genresPreferred": ["techno", "house"],
  "description": "Looking for a techno DJ for our Friday night event",
  "technicalRequirements": {
    "soundCheckTime": "21:00",
    "equipmentProvided": true
  },
  "applicationDeadline": "2026-03-15T23:59:59Z"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Opportunity created successfully",
  "data": {
    "id": "opp-2",
    "status": "open",
    "createdAt": "2026-02-03T14:30:00Z"
  }
}
```

---

### 5.4 Apply to Opportunity

Submit application for an opportunity.

**Endpoint**: `POST /api/applications`  
**Auth Required**: Yes (Artist role)

**Request Body**:
```json
{
  "opportunityId": "opp-1",
  "proposedFee": 28000,
  "willingToNegotiate": true,
  "message": "I've performed at similar venues and would love to bring my unique techno sound to your event.",
  "confirmAvailability": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "app-1",
    "opportunityId": "opp-1",
    "artistId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "pending_review",
    "submittedAt": "2026-02-03T14:45:00Z",
    "responseDeadline": "2026-02-05T14:45:00Z"
  }
}
```

---

### 5.5 Get Application Details

Get application status and details.

**Endpoint**: `GET /api/applications/:id`  
**Auth Required**: Yes (Application owner or opportunity creator)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "app-1",
    "opportunity": {
      "id": "opp-1",
      "eventName": "Friday Night Techno",
      "eventDate": "2026-04-15",
      "venueName": "High Ultra Lounge"
    },
    "artist": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "artistName": "DJ Shadow",
      "trustScore": 75.5
    },
    "proposedFee": 28000,
    "willingToNegotiate": true,
    "message": "I've performed at similar venues...",
    "status": "pending_review",
    "submittedAt": "2026-02-03T14:45:00Z",
    "responseDeadline": "2026-02-05T14:45:00Z",
    "viewedByOrganizer": true,
    "viewedAt": "2026-02-03T15:00:00Z"
  }
}
```

---

### 5.6 Withdraw Application

Withdraw a pending application.

**Endpoint**: `DELETE /api/applications/:id`  
**Auth Required**: Yes (Application owner)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Application withdrawn successfully"
}
```

---

## 6. Bookings

### 6.1 Create Booking

Create a confirmed booking.

**Endpoint**: `POST /api/bookings`  
**Auth Required**: Yes (Organizer role)

**Request Body**:
```json
{
  "artistId": "660e8400-e29b-41d4-a716-446655440000",
  "venueId": "770e8400-e29b-41d4-a716-446655440000",
  "eventDate": "2026-04-15",
  "slotTime": "closing",
  "performanceStart": "23:00",
  "performanceDuration": 120,
  "budget": 28000,
  "currency": "INR",
  "eventDetails": {
    "name": "Friday Night Techno",
    "expectedCrowd": 600,
    "genre": "techno"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking-1",
    "status": "confirmed",
    "createdAt": "2026-02-03T15:00:00Z",
    "nextSteps": [
      "Contract will be generated within 24 hours",
      "Both parties must sign within 48 hours"
    ]
  }
}
```

---

### 6.2 Get Booking Details

Get detailed booking information.

**Endpoint**: `GET /api/bookings/:id`  
**Auth Required**: Yes (Booking participant or Admin)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "booking-1",
    "artist": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "artistName": "DJ Shadow",
      "phone": "+919876543210"
    },
    "organizer": {
      "id": "org-1",
      "name": "XYZ Events",
      "contactPerson": "Rahul Kumar"
    },
    "venue": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "High Ultra Lounge",
      "address": "123 MG Road, Bangalore"
    },
    "eventDate": "2026-04-15",
    "slotTime": "closing",
    "performanceStart": "23:00",
    "performanceDuration": 120,
    "budget": 28000,
    "currency": "INR",
    "status": "confirmed",
    "contract": {
      "id": "contract-1",
      "status": "pending_signatures",
      "pdfUrl": "https://cdn.example.com/contracts/contract-1.pdf"
    },
    "payments": [
      {
        "id": "pay-1",
        "type": "deposit",
        "amount": 8400,
        "status": "pending"
      }
    ],
    "checklist": {
      "contractSigned": false,
      "depositPaid": false,
      "travelArranged": false,
      "technicalRiderConfirmed": false
    }
  }
}
```

---

### 6.3 Update Booking

Update booking details (limited fields).

**Endpoint**: `PATCH /api/bookings/:id`  
**Auth Required**: Yes (Organizer or Admin)

**Request Body**:
```json
{
  "performanceStart": "23:30",
  "notes": "Adjusted start time for headliner slot"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": { /* updated booking */ }
}
```

---

### 6.4 Cancel Booking

Cancel a booking.

**Endpoint**: `DELETE /api/bookings/:id`  
**Auth Required**: Yes (Booking participant)

**Request Body**:
```json
{
  "reason": "Artist unavailable due to health issues",
  "cancellationType": "artist_cancellation"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Booking cancelled. Refund/penalty processing initiated.",
  "data": {
    "cancellationId": "cancel-1",
    "refundAmount": 8400,
    "penaltyAmount": 0,
    "processingTime": "3-5 business days"
  }
}
```

---

## 7. Negotiations

### 7.1 Start Negotiation

Initiate negotiation on an application.

**Endpoint**: `POST /api/negotiations`  
**Auth Required**: Yes (Organizer role)

**Request Body**:
```json
{
  "applicationId": "app-1",
  "counterOffer": {
    "budget": 22000,
    "slotTime": "mid",
    "duration": 90,
    "message": "We'd like to offer you a mid-slot with adjusted budget"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Negotiation initiated",
  "data": {
    "id": "neg-1",
    "applicationId": "app-1",
    "round": 1,
    "maxRounds": 3,
    "status": "pending_artist_response",
    "responseDeadline": "2026-02-05T15:00:00Z"
  }
}
```

---

### 7.2 Get Negotiation Thread

Get negotiation history and current state.

**Endpoint**: `GET /api/negotiations/:id`  
**Auth Required**: Yes (Negotiation participant)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "neg-1",
    "applicationId": "app-1",
    "currentRound": 2,
    "maxRounds": 3,
    "status": "pending_organizer_response",
    "timeline": [
      {
        "round": 1,
        "actor": "organizer",
        "action": "counter_offer",
        "offer": {
          "budget": 22000,
          "slotTime": "mid",
          "duration": 90
        },
        "message": "We'd like to offer you a mid-slot...",
        "timestamp": "2026-02-04T10:00:00Z"
      },
      {
        "round": 2,
        "actor": "artist",
        "action": "counter_offer",
        "offer": {
          "budget": 25000,
          "slotTime": "mid",
          "duration": 90
        },
        "message": "I can accept mid-slot for 25k",
        "timestamp": "2026-02-04T14:00:00Z"
      }
    ],
    "currentOffer": {
      "budget": 25000,
      "slotTime": "mid",
      "duration": 90
    },
    "responseDeadline": "2026-02-06T14:00:00Z"
  }
}
```

---

### 7.3 Make Counter Offer

Respond with a counter offer.

**Endpoint**: `POST /api/negotiations/:id/offer`  
**Auth Required**: Yes (Negotiation participant)

**Request Body**:
```json
{
  "offer": {
    "budget": 25000,
    "slotTime": "mid",
    "duration": 90
  },
  "message": "I can accept mid-slot for 25k"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Counter offer sent",
  "data": {
    "negotiationId": "neg-1",
    "round": 2,
    "status": "pending_organizer_response",
    "responseDeadline": "2026-02-06T14:00:00Z"
  }
}
```

---

### 7.4 Accept Offer

Accept the current offer and close negotiation.

**Endpoint**: `POST /api/negotiations/:id/accept`  
**Auth Required**: Yes (Negotiation participant)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Offer accepted. Proceeding to contract generation.",
  "data": {
    "negotiationId": "neg-1",
    "finalTerms": {
      "budget": 25000,
      "slotTime": "mid",
      "duration": 90
    },
    "nextSteps": [
      "Contract will be generated",
      "Both parties must sign within 48 hours"
    ]
  }
}
```

---

### 7.5 Decline Offer

Decline offer and end negotiation.

**Endpoint**: `POST /api/negotiations/:id/decline`  
**Auth Required**: Yes (Negotiation participant)

**Request Body**:
```json
{
  "reason": "Terms don't align with requirements"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Negotiation declined and closed"
}
```

---

## 8. Contracts

### 8.1 Get Contract

Retrieve contract details.

**Endpoint**: `GET /api/contracts/:id`  
**Auth Required**: Yes (Contract party)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "contract-1",
    "bookingId": "booking-1",
    "contractType": "local_booking",
    "status": "pending_signatures",
    "terms": {
      "artistFee": 25000,
      "currency": "INR",
      "paymentSchedule": [
        { "type": "deposit", "percentage": 30, "amount": 7500 },
        { "type": "preEvent", "percentage": 40, "amount": 10000 },
        { "type": "final", "percentage": 30, "amount": 7500 }
      ],
      "cancellationPolicy": {
        "artistCancellation": "90 days notice required",
        "organizerCancellation": "Penalties apply based on timeline"
      }
    },
    "artistSignature": null,
    "organizerSignature": null,
    "pdfUrl": "https://cdn.example.com/contracts/contract-1.pdf",
    "createdAt": "2026-02-04T10:00:00Z",
    "signingDeadline": "2026-02-06T10:00:00Z"
  }
}
```

---

### 8.2 Sign Contract

Digitally sign the contract.

**Endpoint**: `POST /api/contracts/:id/sign`  
**Auth Required**: Yes (Contract party)

**Request Body**:
```json
{
  "agreed": true,
  "signature": "data:image/png;base64,iVBORw0KGgo...",
  "verificationMethod": "password",
  "verificationValue": "myPassword123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Contract signed successfully",
  "data": {
    "contractId": "contract-1",
    "signedBy": "artist",
    "signedAt": "2026-02-04T12:00:00Z",
    "status": "signed_by_artist",
    "nextStep": "Awaiting organizer signature"
  }
}
```

---

### 8.3 Download Contract PDF

Download signed contract PDF.

**Endpoint**: `GET /api/contracts/:id/pdf`  
**Auth Required**: Yes (Contract party)

**Response**: Binary PDF file

---

## 9. Payments

### 9.1 Initiate Payment

Initiate a payment for booking.

**Endpoint**: `POST /api/payments`  
**Auth Required**: Yes (Organizer role)

**Request Body**:
```json
{
  "bookingId": "booking-1",
  "amount": 7500,
  "currency": "INR",
  "paymentType": "deposit",
  "paymentMethod": "razorpay"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "paymentId": "pay-1",
    "amount": 7500,
    "currency": "INR",
    "status": "initiated",
    "gateway": "razorpay",
    "orderId": "order_123456",
    "checkoutUrl": "https://razorpay.com/checkout/xyz"
  }
}
```

---

### 9.2 Get Payment Status

Check payment status.

**Endpoint**: `GET /api/payments/:id`  
**Auth Required**: Yes (Payment participant)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "pay-1",
    "bookingId": "booking-1",
    "amount": 7500,
    "currency": "INR",
    "paymentType": "deposit",
    "status": "captured",
    "gateway": "razorpay",
    "gatewayTransactionId": "pay_ABC123",
    "payer": {
      "id": "org-1",
      "name": "XYZ Events"
    },
    "payee": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "artistName": "DJ Shadow"
    },
    "initiatedAt": "2026-02-04T13:00:00Z",
    "completedAt": "2026-02-04T13:05:00Z"
  }
}
```

---

### 9.3 Webhook Handler

Receive payment gateway webhooks.

**Endpoint**: `POST /api/payments/webhooks/:gateway`  
**Auth Required**: No (verified via signature)

**Request Body**: (Gateway-specific payload)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## 10. Search & Discovery

### 10.1 Global Search

Search across all entities.

**Endpoint**: `GET /api/search`  
**Auth Required**: Optional

**Query Parameters**:
- `q`: Search query
- `type`: Entity type filter (artist|venue|event)
- `page`, `pageSize`: Pagination

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "artists": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "artistName": "DJ Shadow",
        "matchScore": 95
      }
    ],
    "venues": [],
    "events": []
  },
  "totalResults": 1
}
```

---

## 11. Notifications

### 11.1 Get Notifications

Get user notifications.

**Endpoint**: `GET /api/notifications`  
**Auth Required**: Yes

**Query Parameters**:
- `unreadOnly` (boolean): Show only unread
- `type`: Filter by notification type
- `page`, `pageSize`: Pagination

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-1",
      "type": "application_response",
      "title": "Application Accepted!",
      "body": "Your application for Friday Night Techno has been accepted",
      "read": false,
      "createdAt": "2026-02-04T10:00:00Z",
      "relatedEntity": {
        "type": "application",
        "id": "app-1"
      }
    }
  ],
  "unreadCount": 5,
  "pagination": { /* pagination */ }
}
```

---

### 11.2 Mark as Read

Mark notification(s) as read.

**Endpoint**: `PATCH /api/notifications/:id/read`  
**Auth Required**: Yes

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 12. Analytics

### 12.1 Get Platform Stats

Get platform-wide statistics (admin only).

**Endpoint**: `GET /api/analytics/platform`  
**Auth Required**: Yes (Admin only)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "artists": 450,
      "organizers": 180,
      "venues": 65
    },
    "bookings": {
      "total": 890,
      "thisMonth": 85,
      "avgPerMonth": 74
    },
    "revenue": {
      "total": 4500000,
      "thisMonth": 380000,
      "currency": "INR"
    },
    "trustScores": {
      "avgArtist": 68.5,
      "avgOrganizer": 72.3,
      "avgVenue": 75.8
    }
  }
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists or conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | 503 | Third-party service unavailable |

---

## Rate Limiting

All endpoints are rate-limited:

- **Public endpoints**: 1000 requests/hour per IP
- **Authenticated endpoints**: 100 requests/15 minutes per user
- **Login endpoint**: 5 attempts/15 minutes per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642145947
```

---

**Last Updated**: February 3, 2026  
**API Version**: v1  
**Support**: api-support@musicplatform.com
