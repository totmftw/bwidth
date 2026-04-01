# Admin Workflow Fix Task List

## Phase 1: Backend API Namespace Update
- [ ] **Task 1.1**: Open `server/routes/admin.ts`.
- [ ] **Task 1.2**: Update the middleware mount point from `router.use("/admin", isAdmin)` to `router.use("/api/admin", isAdmin)`.
- [ ] **Task 1.3**: Update the user endpoints:
  - Change `router.get("/admin/users", ...)` to `router.get("/api/admin/users", ...)`
  - Change `router.patch("/admin/users/:id/status", ...)` to `router.patch("/api/admin/users/:id/status", ...)`
  - Change `router.patch("/admin/users/:id/role", ...)` to `router.patch("/api/admin/users/:id/role", ...)`
- [ ] **Task 1.4**: Update the contract endpoints:
  - Change `router.get("/admin/contracts/pending", ...)` to `router.get("/api/admin/contracts/pending", ...)`
  - Change `router.post("/admin/contracts/:id/review", ...)` to `router.post("/api/admin/contracts/:id/review", ...)`
- [ ] **Task 1.5**: Update the conversation endpoints:
  - Change `router.get("/admin/conversations", ...)` to `router.get("/api/admin/conversations", ...)`
  - Change `router.get("/admin/conversations/:id/messages", ...)` to `router.get("/api/admin/conversations/:id/messages", ...)`
- [ ] **Task 1.6**: Update the settings endpoints:
  - Change `router.get("/admin/settings", ...)` to `router.get("/api/admin/settings", ...)`
  - Change `router.post("/admin/settings", ...)` to `router.post("/api/admin/settings", ...)`

## Phase 2: Frontend Admin Pages Update
- [ ] **Task 2.1**: Open `client/src/pages/admin/AdminUsers.tsx`.
  - Update `queryKey: ["/admin/users"]` to `queryKey: ["/api/admin/users"]`.
  - Update `apiRequest("GET", "/admin/users")` to `apiRequest("GET", "/api/admin/users")`.
  - Update `apiRequest("PATCH", \`/admin/users/${id}/status\`)` to `apiRequest("PATCH", \`/api/admin/users/${id}/status\`)`.
  - Update `apiRequest("PATCH", \`/admin/users/${id}/role\`)` to `apiRequest("PATCH", \`/api/admin/users/${id}/role\`)`.
  - Update all `queryClient.invalidateQueries` calls to use `["/api/admin/users"]`.
- [ ] **Task 2.2**: Open `client/src/pages/admin/AdminContracts.tsx`.
  - Update `queryKey: ["/admin/contracts/pending"]` to `queryKey: ["/api/admin/contracts/pending"]`.
  - Update `apiRequest("GET", "/admin/contracts/pending")` to `apiRequest("GET", "/api/admin/contracts/pending")`.
- [ ] **Task 2.3**: Open `client/src/pages/admin/AdminDashboard.tsx`.
  - Update `queryKey: ["/admin/contracts/pending"]` to `queryKey: ["/api/admin/contracts/pending"]`.
  - Update `apiRequest("GET", "/admin/contracts/pending")` to `apiRequest("GET", "/api/admin/contracts/pending")`.
- [ ] **Task 2.4**: Open `client/src/pages/admin/AdminConversations.tsx`.
  - Update `queryKey: ["/admin/conversations"]` to `queryKey: ["/api/admin/conversations"]`.
  - Update `apiRequest("GET", "/admin/conversations")` to `apiRequest("GET", "/api/admin/conversations")`.
  - Update `queryKey: ["/admin/conversations", conversation?.id, "messages"]` to `queryKey: ["/api/admin/conversations", conversation?.id, "messages"]`.
  - Update `apiRequest("GET", \`/admin/conversations/${conversation.id}/messages\`)` to `apiRequest("GET", \`/api/admin/conversations/${conversation.id}/messages\`)`.

## Phase 3: Frontend Contract Components Update
- [ ] **Task 3.1**: Open `client/src/pages/contract/ContractPage.tsx`.
  - Locate `adminReviewContract` mutation.
  - Update `fetch(\`/admin/contracts/${contract.id}/review\`)` to `fetch(\`/api/admin/contracts/${contract.id}/review\`)`.
  - Update `queryClient.invalidateQueries({ queryKey: ["/admin/contracts/pending"] })` to `queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts/pending"] })`.
- [ ] **Task 3.2**: Open `client/src/components/booking/ContractViewer.tsx`.
  - Locate `adminReviewContract` mutation.
  - Update `fetch(\`/admin/contracts/${contract.id}/review\`)` to `fetch(\`/api/admin/contracts/${contract.id}/review\`)`.
  - Update `queryClient.invalidateQueries({ queryKey: ["/admin/contracts/pending"] })` to `queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts/pending"] })`.

## Phase 4: Validation
- [ ] **Task 4.1**: Build/Run the application and test the `/admin` URL directly in the browser while logged out to verify the `401 Unauthorized` JSON is no longer returned, and the React app loads correctly.