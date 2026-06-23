# Redis Caching Analysis Report

## 1) Project Structure Analysis

### Backend architecture
- **Entry points**: `server.js` -> `src/app.js` -> `src/routes/index.js`
- **Framework**: Express + Mongoose + Socket.IO
- **Persistence**: MongoDB (single primary data store)
- **Real-time**: Socket namespaces (`/`, `/chat`, `/notifications`, `/rooms`)
- **Background jobs**: `node-cron` (`src/jobs/index.js`)
- **External providers**:
  - Paymob (payments)
  - Cloudinary (media/document storage)
  - GROQ LLM API (AI summaries / digital twin / brief generation)
  - AssemblyAI (speech-to-text)
  - Pinecone (vector retrieval for prior visits)

### Backend modules actually mounted under `/api/v1`
- `auth`, `profile`, `patients`, `doctors`, `appointments`, `payments`, `ai-voice`, `medical-records`, `digital-twin`, `chat`, `therapy-rooms`

### Unused/inactive module scaffolds (currently not wired)
- `Prescription`, `admin`, `notifications` (files exist but routes are not effectively mounted/implemented)

## 2) Data Flow Analysis

### HTTP request flow
1. Express middleware (helmet/cors/auth/validation/rate limit)
2. Route controller
3. Service layer
4. Mongoose queries/aggregations/populates
5. Optional external API calls
6. API response wrapper

### Real-time flow
1. Socket auth middleware validates user
2. In-memory runtime registries/maps track presence, rooms, counters
3. Events emitted through Socket.IO namespaces
4. Persistent room state still read/written in MongoDB for therapy rooms

### Important write side-effects
- Saving medical records triggers **digital twin update** (`post('save')`)
- Appointment/payment actions trigger multi-document updates
- Chat read/delivery updates trigger frequent DB writes

## 3) Performance Bottlenecks (Observed)

1. **Heavy aggregations**: appointment stats/count + doctor my-patients pipeline.
2. **Frequent list endpoints**: appointments/doctors/medical-records with pagination and population.
3. **Expensive AI calls**: patient brief, digital twin what-if, AI voice summarization.
4. **Slot calculation path**: appointment availability reads + overlap checks under concurrency.
5. **In-memory state only for real-time**: presence/room/rate limit are not horizontally scalable.
6. **No Redis layer today**: repeated reads hit MongoDB and external APIs directly.

## 4) Recommended Redis Key Design Standard

Use namespaced, versioned keys:

- `sahtak:{env}:v1:{domain}:{entity}:{id}`
- For query-based endpoints: `...:q:{sha1(normalizedQuery)}`
- For pagination: `...:page:{page}:limit:{limit}`
- For user-scoped data: `...:user:{userId}`

Examples:
- `sahtak:prod:v1:doctor:public:{doctorId}`
- `sahtak:prod:v1:doctor:browse:q:{hash}:page:1:limit:10`
- `sahtak:prod:v1:appointment:slots:doctor:{doctorId}:date:{yyyy-mm-dd}:clinic:{clinicId}:tele:{0|1}`
- `sahtak:prod:v1:medical-records:patient:{patientId}:page:{page}:limit:{limit}`

---

## 5) Caching Candidates (STRICT FORMAT)

### APIs (GET endpoints)

- **Endpoint / Service:** `GET /` and `GET /keep-alive`
- **Cache:** No
- **Reason:** Health/ping endpoints; negligible DB/load impact.
- **Strategy:** Cache Aside (Not needed)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Middleware
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/auth/google` and `GET /api/v1/auth/google/callback`
- **Cache:** No
- **Reason:** OAuth handshake/redirect flow is request-specific and security-sensitive.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Middleware
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/doctors`
- **Cache:** Yes
- **Reason:** High read volume public listing with repeated filters/sorting and expensive `find + count`.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:doctor:browse:q:{hash}:page:{page}:limit:{limit}:sort:{sortBy}:{sortOrder}`
- **TTL:** 180s
- **Invalidation:** On doctor profile/professional/clinic/telemedicine updates; doctor verification/status changes.
- **Implementation Layer:** Middleware
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/doctors/:id`
- **Cache:** Yes
- **Reason:** Frequently re-opened profile page, mostly read-heavy.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:doctor:public:{doctorId}`
- **TTL:** 300s
- **Invalidation:** Any doctor profile mutation.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/doctors/my-patients`
- **Cache:** Yes
- **Reason:** Aggregation pipeline with `$lookup/$facet/$group` is expensive and repeatedly queried.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:doctor:{doctorId}:patients:q:{hash}`
- **TTL:** 60s
- **Invalidation:** Appointment create/reschedule/cancel/status change for that doctor.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/doctors/me/basic-info`
- **Cache:** Yes
- **Reason:** Common self-profile read with low write frequency.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:doctor:{doctorId}:basic-info`
- **TTL:** 300s
- **Invalidation:** On doctor basic info update/profile image update.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/doctors/me/professional-info`
- **Cache:** Yes
- **Reason:** Read-heavy profile section, expensive when documents are large.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:doctor:{doctorId}:professional-info`
- **TTL:** 300s
- **Invalidation:** Any professional info / awards / certificates / memberships mutation.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/doctors/me/clinic-info`
- **Cache:** Yes
- **Reason:** Frequently reused in booking/scheduling flows.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:doctor:{doctorId}:clinic-info`
- **TTL:** 180s
- **Invalidation:** Clinic add/update/delete.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/doctors/me/telemedicine`
- **Cache:** Yes
- **Reason:** Reused by appointment slot/telemedicine UX.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:doctor:{doctorId}:telemedicine`
- **TTL:** 120s
- **Invalidation:** Toggle/update telemedicine settings.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/appointments/available-slots/:doctorId`
- **Cache:** Yes
- **Reason:** Slot calculation repeats heavily per date/doctor and causes hot-path reads.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:slots:doctor:{doctorId}:date:{date}:clinic:{clinicId}:tele:{0|1}`
- **TTL:** 20s
- **Invalidation:** Any appointment create/reschedule/cancel/status transition affecting that doctor/date/clinic.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/appointments`
- **Cache:** Yes
- **Reason:** Frequent list endpoint with dynamic filters and populate.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:list:user:{userId}:role:{role}:q:{hash}`
- **TTL:** 30s
- **Invalidation:** Any appointment mutation for that scoped user (doctor/patient).
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/appointments/count`
- **Cache:** Yes
- **Reason:** Aggregation endpoint often polled in dashboards.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:count:user:{userId}:role:{role}`
- **TTL:** 60s
- **Invalidation:** On appointment create/cancel/reschedule/status updates.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/appointments/statistics`
- **Cache:** Yes
- **Reason:** Heavy aggregation by period and status/type/revenue.
- **Strategy:** Write Behind (for pre-aggregated metrics)  
- **Key:** `sahtak:{env}:v1:appointment:stats:user:{userId}:role:{role}:period:{period}`
- **TTL:** 300s (if still computed on read) / persistent counters if write-behind
- **Invalidation:** Event-driven updates from appointment writes into aggregated counters.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/appointments/today`
- **Cache:** Yes
- **Reason:** Doctor dashboard polling with repeated same-day grouped result.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:today:doctor:{doctorId}`
- **TTL:** 20s
- **Invalidation:** Appointment status/check-in/completion/cancel events for today.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/appointments/upcoming`
- **Cache:** Yes
- **Reason:** Repeated dashboard/list access; predictable query window.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:upcoming:user:{userId}:role:{role}:q:{hash}`
- **TTL:** 30s
- **Invalidation:** Appointment write affecting future windows.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/appointments/past`
- **Cache:** Yes
- **Reason:** Mostly historical reads; lower churn than upcoming.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:past:user:{userId}:role:{role}:q:{hash}`
- **TTL:** 120s
- **Invalidation:** New completion/cancellation can affect latest pages.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/appointments/search`
- **Cache:** Yes (short TTL)
- **Reason:** Regex search can be expensive; repeated same search terms by users.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:appointment:search:user:{userId}:q:{hash}`
- **TTL:** 30s
- **Invalidation:** Appointment number/status changes.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/appointments/:appointmentId/patient-brief`
- **Cache:** Yes
- **Reason:** Calls LLM + multiple reads; very expensive.
- **Strategy:** Write Through (store generated brief immediately after generation)
- **Key:** `sahtak:{env}:v1:appointment:brief:{appointmentId}:doctor:{doctorId}:version:{fingerprint}`
- **TTL:** 900s
- **Invalidation:** Visit info changes, new medical record, appointment status leaves check-in/in-progress.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/medical-records/my-records`
- **Cache:** Yes
- **Reason:** Paginated populated reads frequently revisited.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:medical-records:mine:patient:{patientId}:page:{page}:limit:{limit}`
- **TTL:** 120s
- **Invalidation:** New/updated medical records visible to patient.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/medical-records/:recordId`
- **Cache:** Yes
- **Reason:** Record detail can be read multiple times by doctor/patient.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:medical-record:{recordId}:viewer:{userId}`
- **TTL:** 300s
- **Invalidation:** Record updates/visibility changes.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/medical-records/patient/:patientId`
- **Cache:** Yes
- **Reason:** Historical list with populates for doctors.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:medical-records:patient:{patientId}:doctor:{doctorId}:page:{page}:limit:{limit}`
- **TTL:** 120s
- **Invalidation:** New medical record for patient.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/digital-twin/my-twin`
- **Cache:** Yes
- **Reason:** Twin is read repeatedly; updates are event-based, not per request.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:digital-twin:patient:{patientId}`
- **TTL:** 300s
- **Invalidation:** On `updateDigitalTwinFromMedicalRecord` completion.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/digital-twin/:patientId`
- **Cache:** Yes
- **Reason:** Same twin data consumed by doctor side.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:digital-twin:patient:{patientId}`
- **TTL:** 300s
- **Invalidation:** Same as above.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `GET /api/v1/patients/me/basic-info`
- **Cache:** Yes
- **Reason:** User profile section is read often with low write frequency.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:patient:{patientId}:basic-info`
- **TTL:** 300s
- **Invalidation:** On basic info/profile image updates.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/patients/me/medical-profile`
- **Cache:** Yes
- **Reason:** Read-heavy in profile and clinical context.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:patient:{patientId}:medical-profile`
- **TTL:** 180s
- **Invalidation:** Any chronic/allergy/surgery/family history/medication mutation.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/patients/me/completeness`
- **Cache:** Yes
- **Reason:** Derived from profile data and frequently requested in onboarding flow.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:patient:{patientId}:profile-completeness`
- **TTL:** 120s
- **Invalidation:** Any patient basic/medical profile update.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/patients/me/emergency-contacts`
- **Cache:** Yes
- **Reason:** Re-read frequently, low mutation.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:patient:{patientId}:emergency-contacts`
- **TTL:** 300s
- **Invalidation:** Add/update/delete emergency contact.
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/profile/me`
- **Cache:** Yes
- **Reason:** Commonly requested user object; moderate change frequency.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:profile:user:{userId}`
- **TTL:** 120s
- **Invalidation:** Any user profile mutation / soft delete.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/profile/me/sessions`
- **Cache:** No
- **Reason:** Security-sensitive and must reflect near-real-time token/session changes.
- **Strategy:** Cache Aside (Not recommended here)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/chat/conversations`
- **Cache:** No
- **Reason:** Very dynamic unread/delivery state; stale data harms UX.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/chat/conversations/:conversationId/messages`
- **Cache:** No
- **Reason:** Message status transitions (sent->delivered->read) are real-time.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/chat/conversations/search`
- **Cache:** No
- **Reason:** High-cardinality full-text result sets + fast data churn.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/therapy-rooms`
- **Cache:** Yes (very short)
- **Reason:** Public list endpoint with frequent reads and acceptable micro-staleness.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:therapy-rooms:active`
- **TTL:** 5s
- **Invalidation:** Room create/join/leave/end/system cleanup events.
- **Implementation Layer:** Middleware
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `GET /api/v1/therapy-rooms/:roomId`
- **Cache:** No
- **Reason:** Participant/mic/hand state is highly real-time.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/therapy-rooms/join/:code`
- **Cache:** No
- **Reason:** This endpoint mutates room participants and issues Agora token.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Service-level logic
- **Priority:** Low Impact

- **Endpoint / Service:** `GET /api/v1/payments/success`
- **Cache:** No
- **Reason:** Redirect/flow endpoint with request-specific semantics.
- **Strategy:** Cache Aside (Not recommended)
- **Key:** N/A
- **TTL:** N/A
- **Invalidation:** N/A
- **Implementation Layer:** Middleware
- **Priority:** Low Impact

### Services / Expensive operations / repeated tasks

- **Endpoint / Service:** `DigitalTwinService.simulateWhatIf`
- **Cache:** Yes
- **Reason:** Expensive LLM call; repeated scenario prompts are common.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:digital-twin:what-if:patient:{patientId}:scenario:{hash}`
- **TTL:** 900s
- **Invalidation:** On digital twin updates or patient medical-profile changes.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `AiVoiceService.getPreviousVisits (Pinecone retrieval)`
- **Cache:** Yes
- **Reason:** Repeated RAG retrieval per patient in close time windows.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:ai-voice:previous-visits:patient:{patientId}`
- **TTL:** 600s
- **Invalidation:** On new medical visit vector upsert.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `PaymobService.authenticate token fetch`
- **Cache:** Yes
- **Reason:** Avoid repetitive auth roundtrips to payment gateway.
- **Strategy:** Cache Aside
- **Key:** `sahtak:{env}:v1:paymob:auth-token`
- **TTL:** 3000s (or provider token expiry minus safety margin)
- **Invalidation:** On token expiry or payment auth failure.
- **Implementation Layer:** Service-level logic
- **Priority:** Medium Impact ⚡

- **Endpoint / Service:** `Express + Socket rate limiting counters`
- **Cache:** Yes
- **Reason:** Current in-memory counters fail in multi-instance deployments.
- **Strategy:** Write Through
- **Key:** `sahtak:{env}:v1:ratelimit:{scope}:{id}:{window}`
- **TTL:** Per limiter window
- **Invalidation:** Natural TTL expiration.
- **Implementation Layer:** Middleware
- **Priority:** High Impact 🔥

- **Endpoint / Service:** `Socket presence/registry/room runtime state`
- **Cache:** Yes (as distributed state store)
- **Reason:** Current `Map/Set` state is node-local; breaks horizontal scaling.
- **Strategy:** Write Through
- **Key:** 
  - `sahtak:{env}:v1:presence:user:{userId}`
  - `sahtak:{env}:v1:socket:user:{userId}:sockets`
  - `sahtak:{env}:v1:room:{roomId}:participants`
- **TTL:** 30-120s heartbeat-based renewal
- **Invalidation:** On disconnect/leave/end-room/heartbeat timeout.
- **Implementation Layer:** Service-level logic
- **Priority:** High Impact 🔥

---

## 6) Middleware vs Service Decision Summary

### Prefer **Middleware** caching for:
- Public, deterministic GET responses with straightforward keying:
  - `GET /api/v1/doctors`
  - `GET /api/v1/therapy-rooms`

### Prefer **Service-level** caching for:
- Auth-scoped/user-scoped responses and complex invalidation:
  - Appointments, medical records, digital twin, patient/profile data
  - AI-generated outputs (brief/what-if/voice summary)
  - Anything requiring permission checks before keying

## 7) Advanced Redis Suggestions

1. **Redis Pub/Sub + Socket.IO Redis adapter**
   - Use for cross-instance presence updates, room events, chat delivery/read events.
2. **Rate limiting via Redis**
   - Replace in-memory `express-rate-limit` store and socket counters with Redis-backed counters.
3. **Session support**
   - Keep authoritative refresh tokens in MongoDB (audit/security), but use Redis for short-lived token/session lookups and revocation checks.
4. **Queue system (BullMQ)**
   - Offload AI-heavy tasks (`patient brief`, `what-if`, `transcribe+summarize`, `digital twin update`) to workers and return job IDs for async polling/websocket completion.

## 8) Architecture Improvements (Caching Placement Optimization)

1. Add a dedicated cache module (`src\config\redis.js` + cache utility with `getOrSet`, key helpers, tag-based invalidation).
2. Introduce **event-driven invalidation** on domain events (`appointment.updated`, `doctor.updated`, `medicalRecord.created`, `room.changed`).
3. Implement key tagging sets (reverse index) for safe multi-key invalidation by entity.
4. Replace node-local real-time state (`Map`/`Set`) with Redis-backed shared state for horizontal scale.
5. Move expensive dashboard metrics to write-behind/materialized counters.
6. Fix current patient-brief logic to avoid unnecessary regeneration (`appointment.patientBrief` is being reset before use).