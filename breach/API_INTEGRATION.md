# HIBP API Integration Guide

## Authentication
- **API Key**: Required for production (`HIBP_API_KEY` env var). Free tier limited; paid $3.50/1000 queries.
- **User-Agent**: Custom `"BreachAlertService/1.0"` header for identification.
- **Headers**: `Accept: application/json`, `hibp-api-key` (if set).

## Rate Limiting Strategy
- **HIBP Limit**: 1500ms between requests (paid), 1 per 1500ms.
- **Implementation**: Fixed `time.sleep(1.6)` after each `fetch_breaches()` > 1500ms safe.
- **Queueing**: Redis LPUSH/RPOP processes serially, respecting sleep.

## Caching & Data Retention (Privacy-First)
- **Redis Cache**: `hibp:{email.lower()}` key, 12h TTL (`ex=43200`). `repr()/eval()` serialization.
- **Breach Storage**:
  | Field | Privacy Treatment | Retention |
  |-------|-------------------|-----------|
  | `breach_name` | SHA256(breach_name + breached_on) → `hashed_breach_id` | 90 days |
  | `data_classes` | Count only (`len()`) → `data_classes_count` | 90 days |
  | `raw_details`/`Description` | **NOT stored** | N/A |
  | `breached_on` | Timestamp only | 90 days |
- **Auto-Purge**: `purge_expired_breaches()` called post-scan (`expires_at < now()`).

## Fallback (No API Key)
- Simulated breaches for `test*/example@*` emails (e.g., "ExampleCorp" with passwords).

## Error Handling
- 404: No breaches → `[]`.
- 429+: `raise_for_status()`.
- Graceful Redis absence (direct scan).

**Privacy Policy**: No plain-text breach data persisted. Anonymized metadata only, auto-deleted 90 days. Cached queries 12h.

**Endpoints**:
- `/emails/{id}/breaches`: Returns anonymized list.
- `/scan/manual/{id}`: Triggers immediate scan.

