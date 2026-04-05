# Negotiation Agent — Expanded Technical Specification
### Volume II: Contract Schema · Admin Panel Data Model · Research Prefill Logic

> Companion to: `negotiation-chat-ui-spec.md`
> All three modules are independent and can be built/deployed separately.

---

---

# MODULE A — CONTRACT SCHEMA

---

## A.1 Philosophy

The contract is not a document — it is a structured data record that renders
into a document. Every field is typed, validated, and versioned independently.
This means contracts can be queried, diffed, audited, and regenerated at any
time without touching a static PDF.

The PDF is a read-only export. The source of truth is always the database record.

---

## A.2 Core Database Schema (PostgreSQL) - modify existing to suit the workflow.

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contracts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID          NOT NULL REFERENCES bookings(id),
  negotiation_id      UUID          NOT NULL REFERENCES negotiations(id),
  version             INTEGER       NOT NULL DEFAULT 1,
  status              TEXT          NOT NULL DEFAULT 'draft'
                                    CHECK (status IN (
                                      'draft',
                                      'pending_review',
                                      'amendment_requested',
                                      'pending_signatures',
                                      'partially_signed',
                                      'executed',
                                      'cancelled',
                                      'expired'
                                    )),
  workflow_type       TEXT          NOT NULL
                                    CHECK (workflow_type IN (
                                      'artist_application',
                                      'organizer_hire',
                                      'venue_direct'
                                    )),
  governing_law       TEXT          NOT NULL DEFAULT 'Laws of India',
  jurisdiction        TEXT          NOT NULL DEFAULT 'Mumbai, Maharashtra',
  facilitating_agent  TEXT          NOT NULL DEFAULT '[App Name]',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  executed_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT PARTIES
-- Three possible party roles per contract.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_parties (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID    NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  role            TEXT    NOT NULL
                          CHECK (role IN ('artist', 'organizer', 'venue', 'agent')),
  entity_type     TEXT    NOT NULL CHECK (entity_type IN ('individual', 'company')),
  legal_name      TEXT    NOT NULL,
  display_name    TEXT,
  user_id         UUID    REFERENCES users(id),
  org_id          UUID    REFERENCES organizations(id),
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  country         TEXT    NOT NULL DEFAULT 'India',
  pan_number      TEXT,                     -- for Indian tax compliance
  gst_number      TEXT,                     -- if GST-registered
  bank_name       TEXT,
  bank_account    TEXT,                     -- encrypted at rest
  bank_ifsc       TEXT,
  signatory_name  TEXT,
  signatory_title TEXT,
  signed_at       TIMESTAMPTZ,
  signature_hash  TEXT,                     -- SHA-256 of signed payload
  ip_at_signing   INET,
  ua_at_signing   TEXT,
  UNIQUE (contract_id, role)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT FINANCIAL TERMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_financial_terms (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           UUID          NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,

  -- Fee structure
  base_fee              NUMERIC(12,2) NOT NULL,
  currency              CHAR(3)       NOT NULL DEFAULT 'INR',
  fee_type              TEXT          NOT NULL
                                      CHECK (fee_type IN (
                                        'flat', 'per_head', 'revenue_share', 'hybrid'
                                      )),
  revenue_share_pct     NUMERIC(5,2),         -- only if fee_type = 'revenue_share' or 'hybrid'
  minimum_guarantee     NUMERIC(12,2),         -- floor for revenue_share

  -- Tax
  tds_applicable        BOOLEAN       NOT NULL DEFAULT TRUE,
  tds_rate_pct          NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
  gst_applicable        BOOLEAN       NOT NULL DEFAULT FALSE,
  gst_rate_pct          NUMERIC(5,2),
  amount_after_tds      NUMERIC(12,2) GENERATED ALWAYS AS
                          (base_fee - (base_fee * tds_rate_pct / 100)) STORED,

  -- Payment schedule
  advance_pct           NUMERIC(5,2)  NOT NULL DEFAULT 30.00,
  advance_due_days      INTEGER       NOT NULL DEFAULT 7,   -- days before event
  balance_pct           NUMERIC(5,2)  NOT NULL DEFAULT 70.00,
  balance_due_trigger   TEXT          NOT NULL
                                      CHECK (balance_due_trigger IN (
                                        'post_performance',
                                        'on_day',
                                        'pre_performance'
                                      )),
  balance_due_days      INTEGER       NOT NULL DEFAULT 3,   -- days after trigger

  -- Penalties
  late_payment_rate_pct NUMERIC(5,2)  NOT NULL DEFAULT 2.00,  -- per month
  cancellation_fee_pct  NUMERIC(5,2)  NOT NULL DEFAULT 25.00, -- of base_fee

  notes                 TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT PERFORMANCE TERMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_performance_terms (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id             UUID        NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,

  event_name              TEXT        NOT NULL,
  event_date              DATE        NOT NULL,
  performance_slot_start  TIME        NOT NULL,
  performance_slot_end    TIME        NOT NULL,
  setup_time_minutes      INTEGER     NOT NULL DEFAULT 60,
  soundcheck_time_minutes INTEGER     NOT NULL DEFAULT 45,

  venue_name              TEXT        NOT NULL,
  venue_address           TEXT        NOT NULL,
  stage_name              TEXT,                   -- if multi-stage venue
  expected_attendance     INTEGER,
  performance_type        TEXT        NOT NULL
                                      CHECK (performance_type IN (
                                        'live', 'dj_set', 'acoustic', 'hybrid', 'virtual'
                                      )),
  set_duration_minutes    INTEGER     NOT NULL,
  encore_agreed           BOOLEAN     NOT NULL DEFAULT FALSE,
  encore_duration_minutes INTEGER,

  -- Exclusivity
  exclusivity_radius_km   INTEGER,                -- if artist cannot play within X km
  exclusivity_days_before INTEGER     DEFAULT 7,
  exclusivity_days_after  INTEGER     DEFAULT 7,

  -- Force majeure
  force_majeure_clause    BOOLEAN     NOT NULL DEFAULT TRUE,
  weather_clause          BOOLEAN     NOT NULL DEFAULT TRUE,

  notes                   TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT TECH RIDER
-- One row per required equipment item.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_tech_rider (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID    NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  category        TEXT    NOT NULL
                          CHECK (category IN (
                            'sound', 'lighting', 'stage', 'backline',
                            'av', 'recording', 'other'
                          )),
  item_name       TEXT    NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  specification   TEXT,                   -- brand/model requirements if any
  provided_by     TEXT    NOT NULL
                          CHECK (provided_by IN ('venue', 'artist', 'organizer', 'shared')),
  mandatory       BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT HOSPITALITY TERMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_hospitality_terms (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id             UUID    NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,

  -- Travel
  travel_provided_by      TEXT    NOT NULL
                                  CHECK (travel_provided_by IN (
                                    'artist', 'organizer', 'venue', 'shared'
                                  )),
  travel_class            TEXT    CHECK (travel_class IN (
                                    'economy', 'business', 'first', 'private', 'ground'
                                  )),
  travel_reimbursement    BOOLEAN NOT NULL DEFAULT FALSE,
  travel_reimbursement_cap NUMERIC(10,2),
  travel_notes            TEXT,

  -- Accommodation
  accommodation_provided  BOOLEAN NOT NULL DEFAULT FALSE,
  hotel_name              TEXT,
  hotel_star_rating       INTEGER CHECK (hotel_star_rating BETWEEN 1 AND 7),
  room_type               TEXT,
  checkin_date            DATE,
  checkout_date           DATE,
  num_rooms               INTEGER NOT NULL DEFAULT 1,
  accommodation_notes     TEXT,

  -- Catering
  catering_provided       BOOLEAN NOT NULL DEFAULT FALSE,
  meals_included          TEXT[], -- e.g. ARRAY['breakfast','dinner']
  dietary_requirements    TEXT[],
  green_room_required     BOOLEAN NOT NULL DEFAULT TRUE,
  green_room_spec         TEXT,
  guest_list_size         INTEGER NOT NULL DEFAULT 0,
  catering_notes          TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT CANCELLATION & PENALTY SCHEDULE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_cancellation_policy (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           UUID          NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  cancelled_by_role     TEXT          NOT NULL CHECK (cancelled_by_role IN ('artist','organizer','venue')),
  days_before_event_min INTEGER       NOT NULL,   -- e.g. 30
  days_before_event_max INTEGER,                  -- e.g. NULL = any time after min
  penalty_pct           NUMERIC(5,2)  NOT NULL,   -- of base_fee
  description           TEXT          NOT NULL,
  UNIQUE (contract_id, cancelled_by_role, days_before_event_min)
);

-- Seed typical cancellation tiers (applied per contract on creation):
--
-- Artist cancels > 30 days before  → 25% penalty
-- Artist cancels 15–30 days before → 50% penalty
-- Artist cancels  7–14 days before → 75% penalty
-- Artist cancels  0–6  days before → 100% penalty
--
-- Organizer cancels > 30 days before  → 25% of base fee returned to artist
-- Organizer cancels 15–30 days before → 50% of base fee returned to artist
-- Organizer cancels < 15 days before  → 100% of base fee returned to artist


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT AMENDMENT LOG
-- One chance to flag corrections before final signing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_amendments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  requested_by    UUID        NOT NULL REFERENCES users(id),
  requested_role  TEXT        NOT NULL CHECK (requested_role IN ('artist','organizer','venue')),
  field_path      TEXT        NOT NULL,   -- e.g. 'financial_terms.base_fee'
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','rejected')),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT AUDIT LOG (immutable append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_audit_log (
  id            BIGSERIAL     PRIMARY KEY,
  contract_id   UUID          NOT NULL REFERENCES contracts(id),
  actor_id      UUID          REFERENCES users(id),
  actor_role    TEXT,
  action        TEXT          NOT NULL,   -- 'created','viewed','amended','signed','downloaded'...
  payload       JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Make this table append-only via policy:
-- REVOKE UPDATE, DELETE ON contract_audit_log FROM PUBLIC;


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTRACT PDF EXPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contract_pdf_exports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by  UUID        REFERENCES users(id),
  storage_key   TEXT        NOT NULL UNIQUE,  -- S3 / GCS object key
  file_size_kb  INTEGER,
  sha256_hash   TEXT        NOT NULL,         -- hash of the PDF bytes
  is_signed_copy BOOLEAN    NOT NULL DEFAULT FALSE,
  download_count INTEGER    NOT NULL DEFAULT 0
);
```

---

## A.3 Contract Generation Logic

```
ON agreement confirmed (both parties ACCEPT or round limit reached with final offer):

STEP 1 — Compile terms
  Pull all agreed values from:
    negotiations.final_terms (JSON blob set by agent on round completion)
  Merge with:
    bookings record (event, venue, dates)
    users / organizations records (party legal details)

STEP 2 — Validate completeness
  Required fields before generation:
    ✓ base_fee
    ✓ performance_slot_start / end
    ✓ event_date + venue confirmed
    ✓ both parties have legal_name + address
    ✓ at least one payment schedule row exists

  If any required field is null → agent asks the relevant party to
  provide the missing information before contract generation proceeds.
  This is NOT a negotiation round — it is data collection only.

STEP 3 — Insert rows
  INSERT contracts          (status = 'draft')
  INSERT contract_parties   (one per party + one for '[App Name]' as agent)
  INSERT contract_financial_terms
  INSERT contract_performance_terms
  INSERT contract_tech_rider        (from rider agreed in negotiation)
  INSERT contract_hospitality_terms
  INSERT contract_cancellation_policy (seed default tiers)

STEP 4 — Render for review
  Fetch all related rows via JOIN
  Render as structured contract view in ContractModule panel
  Status → 'pending_review'
  Both parties notified via in-app + email

STEP 5 — Amendment window (one round, both parties)
  Each party may submit amendment requests via contract_amendments table
  Agent reviews, accepts minor factual corrections, rejects renegotiations
  If amendments accepted → UPDATE relevant field, re-render, bump version
  Status → 'pending_signatures'

STEP 6 — Signing
  Each party signs sequentially (organizer/venue first, artist second)
  On each signature:
    SET contract_parties.signed_at = NOW()
    SET contract_parties.signature_hash = SHA256(contract_id + user_id + timestamp)
    LOG to contract_audit_log
  When all parties signed:
    SET contracts.status = 'executed'
    SET contracts.executed_at = NOW()
    Trigger PDF generation job

STEP 7 — PDF generation (async job)
  Render HTML template with all contract data
  Append signature block with hashes and timestamps
  Convert to PDF (Puppeteer / WeasyPrint)
  Upload to object storage
  INSERT contract_pdf_exports
  Notify both parties with download link
```

---

## A.4 Contract Clause Library

```
Store reusable clause templates. Agent selects and injects appropriate clauses
based on event type, fee structure, and workflow type.

CREATE TABLE contract_clause_library (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key    TEXT    NOT NULL UNIQUE,   -- e.g. 'force_majeure_standard_india'
  category      TEXT    NOT NULL,          -- 'liability','payment','cancellation',...
  title         TEXT    NOT NULL,
  body_template TEXT    NOT NULL,          -- Handlebars/Jinja template
  applicable_to TEXT[], -- workflow_types this clause applies to
  is_mandatory  BOOLEAN NOT NULL DEFAULT FALSE,
  jurisdiction  TEXT    NOT NULL DEFAULT 'India',
  last_reviewed DATE,
  reviewed_by   TEXT                       -- name of legal reviewer
);
```

---
---

# MODULE B — ADMIN PANEL DATA MODEL

---

## B.1 Philosophy

The admin panel has three distinct concerns:

1. **Agent configuration** — control the AI: model, temperature, prompts, moderation
2. **Operational monitoring** — see what's happening across all live sessions
3. **Training pipeline** — harvest RLHF signals and trigger retraining

These map to three separate sections in the UI and three separate data domains.

---

## B.2 Database Schema - modify existing to suit the workflow.

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN USERS (separate from regular user table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE admin_users (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL UNIQUE REFERENCES users(id),
  access_level    TEXT    NOT NULL DEFAULT 'viewer'
                          CHECK (access_level IN (
                            'viewer',       -- read-only dashboards
                            'operator',     -- can pause/resume sessions
                            'configurator', -- can change AI settings
                            'superadmin'    -- full access including training
                          )),
  mfa_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_by      UUID    REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT CONFIGURATIONS
-- Versioned — every change creates a new row. Active = is_active TRUE.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE agent_configurations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  version               INTEGER       NOT NULL,
  label                 TEXT          NOT NULL,         -- human name, e.g. 'v3-conservative'
  is_active             BOOLEAN       NOT NULL DEFAULT FALSE,
  deployed_at           TIMESTAMPTZ,
  deprecated_at         TIMESTAMPTZ,

  -- Model settings
  model_provider        TEXT          NOT NULL DEFAULT 'anthropic',
  model_id              TEXT          NOT NULL DEFAULT 'claude-sonnet-4-6',
  max_tokens            INTEGER       NOT NULL DEFAULT 1000,
  temperature           NUMERIC(3,2)  NOT NULL DEFAULT 0.30
                                      CHECK (temperature BETWEEN 0 AND 1),
  top_p                 NUMERIC(3,2)  CHECK (top_p BETWEEN 0 AND 1),
  top_k                 INTEGER,
  stream_response       BOOLEAN       NOT NULL DEFAULT TRUE,
  request_timeout_ms    INTEGER       NOT NULL DEFAULT 30000,

  -- Prompt components (stored separately in agent_prompts, FK below)
  system_prompt_id      UUID          REFERENCES agent_prompts(id),
  moderation_prompt_id  UUID          REFERENCES agent_prompts(id),
  research_prompt_id    UUID          REFERENCES agent_prompts(id),
  contract_prompt_id    UUID          REFERENCES agent_prompts(id),

  -- Negotiation rules
  max_negotiation_rounds  INTEGER     NOT NULL DEFAULT 2,
  auto_escalate_on_expiry TEXT        NOT NULL DEFAULT 'final_offer'
                                      CHECK (auto_escalate_on_expiry IN (
                                        'final_offer', 'rejection', 'admin_review'
                                      )),
  relay_delay_ms          INTEGER     NOT NULL DEFAULT 800,  -- simulated thinking time

  -- Moderation thresholds (0–1 score above which message is blocked)
  pii_threshold           NUMERIC(3,2) NOT NULL DEFAULT 0.75,
  toxicity_threshold      NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  offtopic_threshold      NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  nsfw_threshold          NUMERIC(3,2) NOT NULL DEFAULT 0.60,

  -- Research settings
  web_search_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  web_search_provider     TEXT        NOT NULL DEFAULT 'tavily',
  max_research_sources    INTEGER     NOT NULL DEFAULT 8,
  research_cache_ttl_hrs  INTEGER     NOT NULL DEFAULT 24,

  -- Self-learning
  rlhf_collection_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
  auto_retrain_threshold  INTEGER     NOT NULL DEFAULT 500,  -- min feedback samples
  retrain_schedule        TEXT,                              -- cron expression

  -- Metadata
  created_by              UUID        NOT NULL REFERENCES admin_users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_notes            TEXT
);

-- Enforce single active config:
CREATE UNIQUE INDEX idx_one_active_config
  ON agent_configurations (is_active)
  WHERE is_active = TRUE;


-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT PROMPTS (versioned prompt store)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE agent_prompts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type     TEXT        NOT NULL
                              CHECK (prompt_type IN (
                                'system',
                                'moderation',
                                'research_prefill',
                                'contract_generation',
                                'relay_restatement',
                                'suggestion_response',
                                'rejection_message'
                              )),
  version         INTEGER     NOT NULL,
  label           TEXT        NOT NULL,
  content         TEXT        NOT NULL,   -- the actual prompt text
  variables       JSONB,                  -- {variable_name: description} for template slots
  token_count     INTEGER,                -- cached token count
  is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by      UUID        NOT NULL REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tested_at       TIMESTAMPTZ,
  test_score      NUMERIC(4,2),           -- eval score from test suite
  change_notes    TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- RLHF FEEDBACK (from thumbs up/down + free text)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rlhf_feedback (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id    UUID        NOT NULL REFERENCES negotiations(id),
  message_id        UUID        NOT NULL,     -- the specific agent message rated
  prompt_id         UUID        REFERENCES agent_prompts(id),
  config_version    INTEGER,                  -- which agent_configurations.version was active
  rated_by          UUID        NOT NULL REFERENCES users(id),
  rater_role        TEXT        NOT NULL CHECK (rater_role IN ('artist','organizer','venue')),
  rating            SMALLINT    NOT NULL CHECK (rating IN (-1, 1)),  -- -1 thumbs down, 1 up
  free_text         TEXT,
  context_snapshot  JSONB,      -- full message + surrounding context at time of rating
  used_in_training  BOOLEAN     NOT NULL DEFAULT FALSE,
  training_batch_id UUID        REFERENCES rlhf_training_batches(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- RLHF TRAINING BATCHES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rlhf_training_batches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status          TEXT        NOT NULL DEFAULT 'collecting'
                              CHECK (status IN (
                                'collecting',
                                'ready',
                                'submitted',
                                'processing',
                                'completed',
                                'failed'
                              )),
  sample_count    INTEGER     NOT NULL DEFAULT 0,
  positive_count  INTEGER     NOT NULL DEFAULT 0,
  negative_count  INTEGER     NOT NULL DEFAULT 0,
  min_samples_req INTEGER     NOT NULL DEFAULT 500,
  triggered_by    TEXT        NOT NULL DEFAULT 'auto'
                              CHECK (triggered_by IN ('auto', 'manual')),
  submitted_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  result_notes    TEXT,
  created_by      UUID        REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- NEGOTIATION SESSIONS (operational view)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE negotiations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID        NOT NULL REFERENCES bookings(id),
  workflow_type       TEXT        NOT NULL
                                  CHECK (workflow_type IN (
                                    'artist_application',
                                    'organizer_hire',
                                    'venue_direct'
                                  )),
  status              TEXT        NOT NULL DEFAULT 'research'
                                  CHECK (status IN (
                                    'research',           -- prefill in progress
                                    'proposal_draft',     -- form generated, not submitted
                                    'proposal_submitted', -- waiting for response
                                    'round_1',
                                    'round_2',
                                    'agreed',
                                    'rejected',
                                    'expired',
                                    'admin_hold'
                                  )),
  config_version      INTEGER     NOT NULL,   -- which agent_configurations.version is active
  round_count         INTEGER     NOT NULL DEFAULT 0,
  max_rounds          INTEGER     NOT NULL DEFAULT 2,
  party_a_id          UUID        NOT NULL REFERENCES users(id),
  party_a_role        TEXT        NOT NULL CHECK (party_a_role IN ('artist','organizer','venue')),
  party_b_id          UUID        NOT NULL REFERENCES users(id),
  party_b_role        TEXT        NOT NULL CHECK (party_b_role IN ('artist','organizer','venue')),
  final_terms         JSONB,      -- agreed terms blob, set on 'agreed'
  rejection_reason    TEXT,
  research_data       JSONB,      -- cached prefill research output
  moderation_flags    JSONB[],    -- array of flagged message events
  agent_config_id     UUID        NOT NULL REFERENCES agent_configurations(id),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluded_at        TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- NEGOTIATION MESSAGES (full log of every chat turn)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE negotiation_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  UUID        NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  sender_type     TEXT        NOT NULL CHECK (sender_type IN ('user','agent','system')),
  sender_id       UUID        REFERENCES users(id),
  sender_role     TEXT        CHECK (sender_role IN ('artist','organizer','venue','agent')),
  round_number    INTEGER,
  content_raw     TEXT        NOT NULL,   -- original user text
  content_relayed TEXT,                   -- agent restatement (if relay message)
  was_filtered    BOOLEAN     NOT NULL DEFAULT FALSE,
  filter_reason   TEXT,
  token_count     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- MODERATION EVENTS (every blocked / flagged message)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE moderation_events (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id      UUID          NOT NULL REFERENCES negotiations(id),
  message_id          UUID          REFERENCES negotiation_messages(id),
  sender_id           UUID          REFERENCES users(id),
  flag_type           TEXT          NOT NULL
                                    CHECK (flag_type IN (
                                      'pii', 'toxicity', 'nsfw', 'off_topic',
                                      'legal_risk', 'direct_contact_attempt',
                                      'criminal_content'
                                    )),
  confidence_score    NUMERIC(4,3),
  action_taken        TEXT          NOT NULL
                                    CHECK (action_taken IN (
                                      'blocked', 'redacted', 'warned', 'escalated'
                                    )),
  content_hash        TEXT,         -- SHA-256 of original content (do NOT store raw content)
  reviewed_by_admin   UUID          REFERENCES admin_users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM METRICS (captured for admin dashboard)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE agent_metrics (
  id                    BIGSERIAL   PRIMARY KEY,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_window         INTERVAL    NOT NULL DEFAULT '1 hour',
  active_sessions       INTEGER     NOT NULL DEFAULT 0,
  messages_processed    INTEGER     NOT NULL DEFAULT 0,
  messages_blocked      INTEGER     NOT NULL DEFAULT 0,
  avg_response_ms       NUMERIC(8,2),
  p95_response_ms       NUMERIC(8,2),
  p99_response_ms       NUMERIC(8,2),
  agreements_reached    INTEGER     NOT NULL DEFAULT 0,
  rejections            INTEGER     NOT NULL DEFAULT 0,
  contracts_generated   INTEGER     NOT NULL DEFAULT 0,
  contracts_executed    INTEGER     NOT NULL DEFAULT 0,
  rlhf_thumbs_up        INTEGER     NOT NULL DEFAULT 0,
  rlhf_thumbs_down      INTEGER     NOT NULL DEFAULT 0,
  avg_satisfaction      NUMERIC(4,3),  -- rlhf_thumbs_up / total ratings
  error_count           INTEGER     NOT NULL DEFAULT 0,
  config_version        INTEGER     NOT NULL
);
```

---

## B.3 Admin Panel UI Sections

```
SECTION 1 — LIVE OPERATIONS DASHBOARD
  Widgets:
  ┌──────────────────────────────────────────────────────────────────┐
  │  Active sessions: 12   Pending proposals: 7   In negotiation: 4  │
  │  Contracts pending signature: 3   Executed today: 8              │
  └──────────────────────────────────────────────────────────────────┘
  
  Table: All active negotiations
    Columns: Session ID · Workflow type · Parties · Round · Status ·
             Last activity · Response time · [View] [Hold] [Terminate]
  
  Real-time:   WebSocket feed from negotiations table
  Refresh:     Every 5 seconds or on push event
  Access:      viewer and above


SECTION 2 — AI CONFIGURATION
  Purpose: Create, compare, activate agent configurations.

  Sub-tabs:
    2a. Active Config
        Shows all fields from agent_configurations for the active row.
        Quick-edit: temperature slider, max_rounds toggle, moderation sliders.
        [Save as new version] always creates a new row — never overwrites.

    2b. Version History
        Table of all agent_configurations rows, newest first.
        Columns: version · label · model_id · temperature · rounds ·
                 deployed_at · deprecated_at · [Activate] [Clone] [Diff]
        Diff view: side-by-side comparison of any two versions.

    2c. Prompt Editor
        Full CRUD on agent_prompts.
        Tabbed by prompt_type.
        For each prompt:
          - Rich text editor with variable highlighting
          - Token counter (live, via tokenizer API)
          - [Run test] — sends to model with sample context, shows output
          - [Activate] — sets is_active = TRUE for that prompt_type
        Access: configurator and above

    2d. Moderation Thresholds
        Sliders for: pii_threshold, toxicity_threshold,
                     offtopic_threshold, nsfw_threshold
        Each slider shows: current value · industry benchmark · flag rate at current setting
        [Save] creates a new agent_configurations version with updated thresholds.

    2e. Research Settings
        Toggle: web_search_enabled
        Dropdown: web_search_provider
        Spinner: max_research_sources (1–15)
        Spinner: research_cache_ttl_hrs (1–168)


SECTION 3 — RLHF & TRAINING
  Sub-tabs:
    3a. Feedback Overview
        Cards:
          Total ratings collected · Positive % · Negative %
          Top 5 poorly-rated prompt types
          Top 5 well-rated prompt types
        Chart: Rating trend over time (last 30 days)

    3b. Feedback Queue
        Table: rlhf_feedback joined with negotiation_messages
        Columns: date · session · rater role · rating · free text · context
        Filters: rating (-1/+1) · prompt_type · date range
        [Mark for training] bulk action

    3c. Training Batches
        Table: rlhf_training_batches
        Shows: status · sample count · +/- split · submitted/completed dates
        [New batch] — manually trigger a batch from queued samples
        [Submit for training] — sends to model provider fine-tuning API
        Access: superadmin only

    3d. Performance Evals
        Run a pre-defined eval suite against any prompt version.
        Eval suite = stored set of (input, expected_output) pairs.
        Output: pass rate · avg similarity score · flagged regressions
        [Run eval] [Compare two versions]


SECTION 4 — MODERATION LOG
  Table: moderation_events, newest first.
  Columns: date · session · sender role · flag type · confidence ·
           action taken · reviewed
  Actions:
    [Review] — shows content hash + context + [Confirm correct] [Override]
    [Export CSV]
  Filters: flag_type · date range · action_taken · reviewed/unreviewed
  Access: operator and above


SECTION 5 — SYSTEM HEALTH
  Panels:
    Response time: P50 / P95 / P99 trend chart (from agent_metrics)
    Error rate: errors / total messages over time
    Active sessions: gauge
    Queue depth: pending messages waiting for model response
    Model API status: live ping to provider endpoint
    Database: connection pool usage · slow query count
  
  Alerts configuration:
    Define alert rules:
      e.g. "if p99_response_ms > 8000 for 3 consecutive windows → email superadmins"
    Stored in agent_alert_rules table (not shown — add if needed).
  Access: viewer and above (alerts config: configurator+)


SECTION 6 — CONTRACT MANAGEMENT
  Table: all contracts with status filter
  Columns: contract ID · booking · parties · status · version · created · executed
  [View full contract]  [Regenerate PDF]  [Void contract]
  Void requires: reason text + superadmin auth
  Access: operator and above
```

---
---

# MODULE C — RESEARCH PREFILL LOGIC

---

## C.1 Philosophy

Prefill is not a search. It is an **intelligence gathering pipeline** that runs
concurrently across multiple data sources before the user sees the form.
The goal is a proposal so well-researched that the user only needs to review
and approve — not fill in fields from scratch.

Research runs on a background worker. The form is shown immediately with
loading skeletons for fields still resolving. Fields populate as sources return.

---

## C.2 Research Pipeline Architecture

```
TRIGGER: Negotiation session created
         (booking_id + workflow_type + party_a + party_b)

┌──────────────────────────────────────────────────────────┐
│                  RESEARCH ORCHESTRATOR                   │
│  Spawns all fetch workers concurrently via Promise.all   │
└────────────────────────────┬─────────────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────────┐
       │                     │                         │
  [INTERNAL]            [PLATFORM]               [EXTERNAL]
  App database          Historical data          Web sources
       │                     │                         │
  ┌────┴────┐          ┌──────┴──────┐          ┌──────┴──────┐
  │ Artist  │          │  Booking    │          │  Wikipedia  │
  │ profile │          │  history    │          │  Spotify    │
  │ Organizer│         │  Ratings    │          │  Instagram  │
  │ profile │          │  Past fees  │          │  News       │
  │ Venue   │          │  Cancels    │          │  Reviews    │
  │ profile │          │  Disputes   │          │  Venue site │
  └────┬────┘          └──────┬──────┘          └──────┬──────┘
       │                     │                         │
       └──────────────────────┴────────────────────────┘
                             │
                    [SYNTHESIS AGENT]
                    Sends collected data to Claude
                    with research_prompt template
                    Outputs: structured prefill JSON
                             fee recommendation
                             risk flags
                             suggested clauses
                             notes for agent to surface in chat
                             │
                    [CACHE + STORE]
                    Store in negotiations.research_data
                    Cache in Redis (TTL = research_cache_ttl_hrs)
                    Populate proposal form fields
```

---

## C.3 Research Data Sources & Extraction Rules

### Source Group 1 — Internal App Data (fastest, always available)

```
ARTIST PROFILE
  Source:       users + artist_profiles tables
  Extract:
    - legal_name, stage_name, profile_photo
    - genre tags, performance_type
    - bio, social_handle_instagram, social_handle_spotify
    - base_location, travel_willingness (local / national / international)
    - standard_fee_min, standard_fee_max (from past accepted bookings)
    - standard_set_duration_minutes
    - standard_tech_rider_id (FK to saved rider template)
    - standard_hospitality_requirements
  Prefill targets:
    base_fee (suggest based on fee history)
    set_duration_minutes
    tech_rider (clone from standard_tech_rider_id)
    hospitality_terms.dietary_requirements

ORGANIZER / VENUE PROFILE
  Source:       organizers + venues tables
  Extract:
    - legal_name, entity_type, gst_number, pan_number
    - venue_name, venue_address, capacity
    - stage_spec: stage_width_m, stage_depth_m, stage_height_m
    - inhouse_equipment (JSON: PA system, lights, backline items)
    - accommodation_partner (hotel name + star rating if pre-arranged)
    - standard_catering_offered (boolean + meal list)
    - standard_travel_offered (boolean + class)
  Prefill targets:
    contract_tech_rider (provided_by = 'venue' for in-house items)
    contract_hospitality_terms (accommodation, catering)
    contract_performance_terms (venue_name, venue_address, stage_name)
```

### Source Group 2 — Platform Historical Data (medium speed)

```
BOOKING HISTORY (artist × organizer/venue pairs)
  Query:
    SELECT * FROM bookings b
    JOIN contracts c ON c.booking_id = b.id
    JOIN contract_financial_terms f ON f.contract_id = c.id
    WHERE (b.artist_id = :artist_id OR b.organizer_id = :org_id)
      AND c.status = 'executed'
    ORDER BY b.event_date DESC
    LIMIT 10
  
  Extract:
    - Past fees for this artist at similar event types
    - Past fees paid by this organizer for similar artists
    - Whether this pair has worked together before (flag if yes)
    - Cancellation history for each party
    - Dispute history for each party
    - Average rating received by artist (from post-event reviews)
    - On-time payment rate for organizer

MARKET RATE BENCHMARK
  Query:
    SELECT
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY base_fee) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY base_fee) AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY base_fee) AS p75
    FROM contract_financial_terms cft
    JOIN contracts c ON c.id = cft.contract_id
    JOIN contract_performance_terms cp ON cp.contract_id = c.id
    JOIN bookings b ON b.id = c.booking_id
    JOIN artist_profiles ap ON ap.user_id = b.artist_id
    WHERE c.status = 'executed'
      AND b.event_date > NOW() - INTERVAL '12 months'
      AND cp.event_date BETWEEN :event_date - 90 AND :event_date + 90
      AND ap.genre_primary = :artist_genre
      AND cp.expected_attendance BETWEEN :attendance * 0.5 AND :attendance * 2
  
  Output: { p25, p50, p75 } → used to anchor fee suggestion
```

### Source Group 3 — External Web Sources (async, cached)

```
ARTIST EXTERNAL RESEARCH
  Wikipedia API:
    GET https://en.wikipedia.org/api/rest_v1/page/summary/:stage_name
    Extract: description, career highlights, awards
    Cache key: wiki_artist_{stage_name}

  Spotify API (if enabled):
    GET /artists/:spotify_id
    Extract: followers, popularity_score, genres, monthly_listeners
    GET /artists/:spotify_id/top-tracks
    Extract: top 5 track names (for context, not stored in contract)
    Cache key: spotify_artist_{spotify_id}

  Instagram (public profile scrape or API if integrated):
    Extract: follower_count, engagement_rate_estimate, recent_posts_count
    Cache key: ig_artist_{handle}

  News / Review Search (Tavily / Serper):
    Query: "[stage_name] review performance India"
    Query: "[stage_name] concert news 2024"
    Extract: sentiment signals, notable venues played, recent activity
    Cache key: news_artist_{stage_name}_{YYYY-MM}

ORGANIZER / VENUE EXTERNAL RESEARCH
  News search:
    Query: "[organizer name] event review India"
    Query: "[venue name] capacity amenities"
    Extract: reputation signals, past event scale, any controversy flags

  Google Maps / JustDial / Zomato (if venue):
    GET venue details: rating, reviews, photos
    Cache key: venue_external_{venue_name}_{city}

  MCA21 / ROC (company legitimacy check):
    Verify GST number against public GSTIN API
    Verify company registration if entity_type = 'company'
    Endpoint: https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=:gst_number
    Flag: gst_valid (boolean)
    Cache key: gst_verify_{gst_number}
```

---

## C.4 Synthesis Agent Prompt Template

```
SYSTEM ROLE: Research Analyst for [App Name] Negotiation Agent

You receive structured data gathered from multiple sources about the parties
and event in an upcoming negotiation. Synthesize this into a prefill proposal.

INPUT VARIABLES:
  {{workflow_type}}       -- artist_application | organizer_hire | venue_direct
  {{artist_data}}         -- JSON: profile, history, external signals
  {{organizer_data}}      -- JSON: profile, history, external signals
  {{venue_data}}          -- JSON: capacity, equipment, facilities
  {{market_benchmarks}}   -- JSON: {p25, p50, p75} fee range for comparable bookings
  {{event_context}}       -- JSON: event_date, event_name, expected_attendance,
                                   performance_type, event_city

INSTRUCTIONS:
  1. Propose a fee within the market benchmark range, adjusted for:
       - Artist's follower count and popularity score (higher → toward p75)
       - Artist's past fee history (use median of last 5 accepted bookings)
       - Organizer's payment history (late payer → request higher advance_pct)
       - Event scale (attendance × artist genre match)
     Express fee_reasoning in 2–3 sentences.

  2. Propose a time slot based on:
       - Artist's past preferred slots (from booking_history)
       - Event type (festival headliner = later slot, opener = earlier)
       - Standard soundcheck + setup requirements

  3. Build tech_rider from:
       - Artist's standard_tech_rider template
       - Cross-reference against venue's inhouse_equipment
       - Mark provided_by = 'venue' for items venue already has
       - Mark provided_by = 'artist' for items artist always brings
       - Flag as mandatory only items marked mandatory on artist's template

  4. Build hospitality_terms from:
       - Artist's standard hospitality requirements
       - What the organizer/venue has declared they offer
       - If travel is offered, set travel_class based on event fee tier:
           fee < 50,000  → economy
           fee 50k–200k  → business
           fee > 200k    → discuss / business

  5. Identify and flag risks:
       - cancellation_history: if either party has > 2 cancellations → FLAG
       - payment_history: if organizer has > 1 late payment → FLAG + raise advance_pct to 50%
       - gst_valid = FALSE → FLAG
       - artist_availability: check for conflicting bookings (same date ± 1 day)
       - exclusivity: check if artist has performed at competing venue recently

  6. Output ONLY valid JSON matching this schema:

{
  "proposed_fee": number,
  "fee_currency": "INR",
  "fee_reasoning": "string",
  "advance_pct": number,
  "balance_due_trigger": "post_performance|on_day|pre_performance",
  "performance_slot_start": "HH:MM",
  "performance_slot_end": "HH:MM",
  "set_duration_minutes": number,
  "tech_rider": [
    {
      "category": "string",
      "item_name": "string",
      "quantity": number,
      "provided_by": "venue|artist|organizer|shared",
      "mandatory": boolean
    }
  ],
  "hospitality": {
    "travel_provided_by": "string",
    "travel_class": "economy|business|first|private|ground",
    "accommodation_provided": boolean,
    "hotel_star_rating": number,
    "num_rooms": number,
    "catering_provided": boolean,
    "meals_included": ["string"],
    "green_room_required": boolean
  },
  "risk_flags": [
    {
      "flag_type": "string",
      "severity": "low|medium|high",
      "description": "string",
      "suggested_action": "string"
    }
  ],
  "agent_notes": "string",
  "suggested_clauses": ["clause_key_1", "clause_key_2"]
}
```

---

## C.5 Prefill Population Logic (Frontend)

```javascript
// Called when NegotiationPopup mounts and research_data is not yet cached

async function populateProposalForm(negotiationId) {
  // 1. Show form immediately with loading skeletons
  renderFormWithSkeletons();

  // 2. Check Redis cache first
  const cached = await redis.get(`research:${negotiationId}`);
  if (cached) {
    hydrateForm(JSON.parse(cached));
    return;
  }

  // 3. Subscribe to research stream (SSE or WebSocket)
  const stream = new EventSource(`/api/negotiations/${negotiationId}/research`);

  stream.addEventListener('partial', (e) => {
    // Fields populate as each source completes
    const partial = JSON.parse(e.data);
    // partial = { field_path: 'proposed_fee', value: 85000, source: 'market_benchmark' }
    hydrateField(partial.field_path, partial.value, partial.source);
  });

  stream.addEventListener('complete', (e) => {
    const fullData = JSON.parse(e.data);
    hydrateForm(fullData);
    showRiskFlags(fullData.risk_flags);
    stream.close();
  });

  stream.addEventListener('error', () => {
    showFallbackManualForm();
    stream.close();
  });
}

function hydrateField(path, value, source) {
  // Set field value
  setFormField(path, value);
  // Show source badge (e.g. "from market data", "from your history")
  setFieldBadge(path, source);
  // Remove skeleton
  removeFieldSkeleton(path);
}

function showRiskFlags(flags) {
  if (!flags?.length) return;
  flags
    .filter(f => f.severity !== 'low')
    .forEach(f => {
      renderRiskBanner({
        icon: f.severity === 'high' ? '⚠️' : 'ℹ️',
        text: f.description,
        action: f.suggested_action
      });
    });
}
```

---

## C.6 Research Cache Strategy

```
KEY FORMAT:
  research:{negotiation_id}              → full synthesis output (JSON)
  research:artist:{user_id}             → artist internal + external data
  research:organizer:{org_id}           → organizer internal + external data
  research:venue:{venue_id}             → venue profile + external data
  research:market:{genre}:{event_month} → market benchmark percentiles
  research:wiki:{stage_name}            → Wikipedia summary
  research:spotify:{spotify_id}         → Spotify profile data
  research:gst:{gst_number}             → GST verification result

TTL RULES:
  Full synthesis output:   research_cache_ttl_hrs (admin-configurable, default 24h)
  Artist/organizer/venue:  72 hours (profile data changes rarely)
  Market benchmarks:       168 hours / 7 days
  Wikipedia:               7 days
  Spotify:                 24 hours (follower counts change)
  GST verification:        30 days
  News/sentiment:          6 hours

INVALIDATION:
  If the artist, organizer, or venue profile is updated in the app,
  DELETE research:artist:{user_id} and research:{negotiation_id}
  so next negotiation for that party re-fetches fresh.

PREFETCH TRIGGER:
  When a booking is created (status = 'confirmed'),
  immediately enqueue a prefetch job for the artist + organizer/venue.
  This means when the negotiation actually starts, most data is already warm.
  Prefetch jobs are low-priority background workers.
```

---

## C.7 Research Worker Queue Schema

```sql
CREATE TABLE research_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  UUID        REFERENCES negotiations(id),
  booking_id      UUID        NOT NULL REFERENCES bookings(id),
  job_type        TEXT        NOT NULL
                              CHECK (job_type IN (
                                'prefetch',         -- triggered on booking creation
                                'on_demand',        -- triggered when chat opens
                                'refresh'           -- manual refresh from admin
                              )),
  status          TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN (
                                'queued', 'running', 'completed', 'failed', 'cancelled'
                              )),
  priority        INTEGER     NOT NULL DEFAULT 5,  -- 1 = highest, 10 = lowest
  sources_todo    TEXT[]      NOT NULL,  -- list of sources to fetch
  sources_done    TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  sources_failed  TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  result_data     JSONB,
  error_message   TEXT,
  attempt_count   INTEGER     NOT NULL DEFAULT 0,
  max_attempts    INTEGER     NOT NULL DEFAULT 3,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

*End of Volume II.*
*This document covers all three expanded modules in full detail.*
*Reference negotiation-chat-ui-spec.md for the UI layer that consumes these.*
