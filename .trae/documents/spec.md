# Admin Authentication & Workflow Specification

## 1. Overview

The current platform experiences a namespace collision where the backend Express API mounted at `/admin` intercepts frontend React Router requests to `http://localhost:5000/admin`. This results in unauthenticated users receiving a raw JSON `401 Unauthorized` response instead of the frontend application loading and handling the authentication state gracefully.

This specification details the structural changes required to move the backend admin APIs to the `/api/admin` namespace, ensuring the frontend router can successfully handle `/admin` page requests.

## 2. Goals

* Resolve the `401 Unauthorized` block on the frontend `/admin` route.

* Move all backend admin endpoints from `/admin/*` to `/api/admin/*`.

* Update all frontend React components, TanStack Query hooks, and API fetch calls to use the new `/api/admin/*` endpoints.

* Ensure the Admin Workflow (Users, Contracts, Conversations, Settings) functions flawlessly after the migration.

## 3. Architecture & Data Flow

* **Frontend (React)**:

  * Routes like `/admin`, `/admin/users`, `/admin/contracts` are managed by `wouter`.

  * The `AdminLayout.tsx` component protects these routes by checking `useAuth()`. If a user is not an admin, it renders an "Access Denied" screen.

* **Backend (Express)**:

  * The `isAdmin` middleware in `server/routes/admin.ts` will be applied strictly to `/api/admin`.

  * This ensures that API calls are protected, but browser navigation requests fall through to the Vite/static server, which serves the `index.html` file.

## 4. Scope of Changes

### 4.1 Backend Route Namespace Migration

* **Target File**: `server/routes/admin.ts`

* **Changes**:

  * Update the middleware mount: `router.use("/api/admin", isAdmin);`

  * Update all endpoint definitions to use `/api/admin/...`:

    * `GET /api/admin/users`

    * `PATCH /api/admin/users/:id/status`

    * `PATCH /api/admin/users/:id/role`

    * `GET /api/admin/contracts/pending`

    * `POST /api/admin/contracts/:id/review`

    * `GET /api/admin/conversations`

    * `GET /api/admin/conversations/:id/messages`

    * `GET /api/admin/settings`

    * `POST /api/admin/settings`

### 4.2 Frontend Component Updates

* **Target Files**:

  * `client/src/pages/admin/AdminUsers.tsx`

  * `client/src/pages/admin/AdminContracts.tsx`

  * `client/src/pages/admin/AdminDashboard.tsx`

  * `client/src/pages/admin/AdminConversations.tsx`

  * `client/src/pages/contract/ContractPage.tsx`

  * `client/src/components/booking/ContractViewer.tsx`

* **Changes**:

  * Replace all string literals of `"/admin/..."` with `"/api/admin/..."` inside `apiRequest` and `fetch` calls.

  * Update the React Query `queryKey` arrays to match the new endpoints (e.g., `["/api/admin/users"]`) to maintain cache consistency.

  * Update any `queryClient.invalidateQueries` calls to use the new query keys.

## 5. Security & Error Handling

* The `isAdmin` backend middleware will continue to return `401` for unauthenticated requests and `403` for non-admin users attempting to access `/api/admin/*`.

* The frontend `queryClient` is configured to throw on `401`, which will be caught by the React Query error handlers and displayed via toast notifications if an API call fails.

* The frontend `AdminLayout` will continue to handle unauthorized page navigation locally.

## 6. Assumptions

* There is no separate admin login page. Admins authenticate via the standard `/auth` route and then navigate to `/admin`.

* `AdminSettings.tsx` is already querying `/api/admin/settings`, which was previously failing with a 404 because the backend was mounted at `/admin/settings`. This update will naturally fix the settings page.

