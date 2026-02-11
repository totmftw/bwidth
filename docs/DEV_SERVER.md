# Development Server Information

## How `npm run dev` Works

When you run `npm run dev`, the system starts a **single integrated server** that handles both:

1. **Backend API** (Express.js)
2. **Frontend** (React + Vite)

### Architecture

```
┌─────────────────────────────────────────────────┐
│          Express Server (Port 5000)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐      ┌──────────────────┐   │
│  │   API Routes │      │  Vite Middleware │   │
│  │  /api/*      │      │  (Dev only)      │   │
│  └──────────────┘      └──────────────────┘   │
│                                                 │
│  /api/auth/login  ────▶  API Handler           │
│  /                ────▶  React App (Vite HMR)  │
│  /dashboard       ────▶  React App (Vite HMR)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### What Happens in Development

```bash
npm run dev
# Executes: NODE_ENV=development tsx server/index.ts
```

**Step by step:**

1. ✅ Express server starts
2. ✅ API routes are registered
3. ✅ Vite dev server is set up as middleware (see `server/vite.ts`)
4. ✅ Vite provides:
   - Hot Module Replacement (HMR)
   - Fast refresh for React components
   - TypeScript compilation
   - Asset serving
5. ✅ Server listens on port 5000

### Access Points

- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **HMR WebSocket**: ws://localhost:5000/vite-hmr

### Benefits of This Approach

✅ **Single Port**: No CORS issues  
✅ **Integrated**: Backend and frontend in one process  
✅ **Fast HMR**: Vite's lightning-fast hot module replacement  
✅ **Simple**: One command to start everything  
✅ **Production-Ready**: Same server serves built static files in production  

### Code Location

- **Server setup**: `server/index.ts` (lines 62-102)
- **Vite integration**: `server/vite.ts`
- **Vite config**: `vite.config.ts`

### Development Workflow

```bash
# Start development server (frontend + backend)
npm run dev

# The console will show:
# - Express route registrations
# - Vite server ready
# - serving on port 5000

# Open browser
# http://localhost:5000

# Make changes to:
# - client/src/* files → HMR updates instantly
# - server/* files → Server restarts automatically (tsx watch)
```

### Environment-Specific Behavior

**Development (NODE_ENV=development):**
- Vite middleware is active
- HMR enabled
- Source maps available
- Dev-friendly error pages

**Production (NODE_ENV=production):**
- Serves pre-built static files from `dist/`
- No Vite middleware
- Optimized and minified assets
- Production error handling

### Troubleshooting

**Issue**: Port 5000 already in use

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env
PORT=3000
```

**Issue**: HMR not working

```bash
# Check firewall settings
# Ensure WebSocket connections are allowed on port 5000
```

**Issue**: Changes not reflecting

```bash
# Hard refresh: Ctrl + Shift + R (Windows)
# Or clear Vite cache:
rm -rf node_modules/.vite
```

### Alternative: Separate Processes (Not Recommended)

If you really need to run frontend and backend separately, you could:

```bash
# Terminal 1 - Backend only
cd server
tsx index.ts

# Terminal 2 - Frontend only  
cd client
npm run dev

# But this requires:
# - CORS configuration
# - Proxy setup
# - More complex setup
```

**We don't recommend this** because the integrated approach is simpler and production-ready.

---

## Summary

✅ `npm run dev` already starts both frontend and backend  
✅ Single command, single port, zero configuration  
✅ Vite HMR for instant updates  
✅ Production-ready architecture  

**Just run: `npm run dev`** and everything works! 🚀
