# BreachAlert Final Completion TODO

## Approved Plan Breakdown (Confirmed by User)

### Phase 1: Privacy Compliance Fixes
- [x] 1. Update backend/app/models.py: Remove raw_details, add hashed_breach_id (SHA256), data_classes_count (int), expires_at (90 days auto-purge).
- [x] 2. Update backend/app/crud.py: Modify create_breach_event (hash name, count classes, set expires_at), add purge_expired_breaches().
- [x] 3. Update backend/app/schemas.py: BreachEvent schemas without raw_details.
- [x] 4. Update backend/app/services/scan_engine.py: Save hashed data only.
- [x] 5. Update backend/app/api/routes.py fallback scan.

### Phase 2: API Integration Guide
- [x] 5. Create API_INTEGRATION.md: Document HIBP auth (API key), rate limiting (1.6s), caching (Redis 12h TTL), fallback.

### Phase 3: Deployment Setup
- [x] 6. Create Procfile, railway.json, setup.sh: Railway deploy config (backend + frontend + PostgreSQL + Redis).
- [x] 7. Update README.md: Add deploy instructions, privacy policy, live URL placeholder.
- [x] 8. Update PROJECT_STATUS.md: Mark deployed.

### Phase 4: GitHub Repo & Live App
- [ ] 9. Git status/commit/push (check if remote exists).
- [ ] 10. Check/install gh CLI, create repo, PR.
- [ ] 11. Deploy to Railway, test live app.
- [ ] 12. attempt_completion with repo URL + live URL.

**Progress will be tracked here. Next: Phase 3 README/PROJECT_STATUS + Phase 4 GitHub/Deploy.**

