# Admin Workflow Fix Checklist

### Backend Updates
- [ ] `server/routes/admin.ts`: Middleware updated to `router.use("/api/admin", isAdmin)`.
- [ ] `server/routes/admin.ts`: User endpoints updated to `/api/admin/...`.
- [ ] `server/routes/admin.ts`: Contract endpoints updated to `/api/admin/...`.
- [ ] `server/routes/admin.ts`: Conversation endpoints updated to `/api/admin/...`.
- [ ] `server/routes/admin.ts`: Settings endpoints updated to `/api/admin/...`.

### Frontend Updates
- [ ] `client/src/pages/admin/AdminUsers.tsx`: Updated `queryKey` arrays and `apiRequest` URLs.
- [ ] `client/src/pages/admin/AdminContracts.tsx`: Updated `queryKey` arrays and `apiRequest` URLs.
- [ ] `client/src/pages/admin/AdminDashboard.tsx`: Updated `queryKey` arrays and `apiRequest` URLs.
- [ ] `client/src/pages/admin/AdminConversations.tsx`: Updated `queryKey` arrays and `apiRequest` URLs.
- [ ] `client/src/pages/contract/ContractPage.tsx`: Updated `adminReviewContract` fetch URL and `invalidateQueries` array.
- [ ] `client/src/components/booking/ContractViewer.tsx`: Updated `adminReviewContract` fetch URL and `invalidateQueries` array.

### Testing & Validation
- [ ] Tested `http://localhost:5000/admin` in browser (logged out) -> Should load React App / Auth redirect, NOT raw JSON `401`.
- [ ] Logged in as Admin and tested User Management (view, update status, update role).
- [ ] Tested Admin Dashboard (quick stats load successfully).
- [ ] Tested Admin Contract Review (load pending contracts, review modal).
- [ ] Tested Chat Oversight (load conversations, load messages).
- [ ] Tested Workflow Toggles / Settings (read settings, toggle values).