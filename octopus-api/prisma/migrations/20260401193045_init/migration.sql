-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_number_hash" TEXT,
    "id_front_key" TEXT,
    "id_back_key" TEXT,
    "selfie_key" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "certification_keys" TEXT NOT NULL DEFAULT '[]',
    "mpesa_number_enc" TEXT,
    "consent_identity" BOOLEAN NOT NULL DEFAULT false,
    "consent_gps" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" DATETIME,
    "show_up_rate" REAL,
    "rating_aggregate" REAL,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_shifts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "kra_pin" TEXT,
    "contact_person" TEXT,
    "wiba_policy_ref" TEXT,
    "wiba_insurer" TEXT,
    "wiba_policy_expiry" DATETIME,
    "mpesa_method" TEXT,
    "mpesa_account_enc" TEXT,
    "rating_aggregate" REAL,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_shifts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "rate_kes" INTEGER NOT NULL,
    "location_lat" REAL NOT NULL,
    "location_lng" REAL NOT NULL,
    "location_name" TEXT,
    "geo_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "clock_in_at" DATETIME,
    "clock_in_geo_hash" TEXT,
    "clock_out_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shifts_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shifts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shift_applications_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_applications_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "from_state" TEXT,
    "to_state" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_events_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "document_key" TEXT NOT NULL,
    "worker_accepted_at" DATETIME,
    "employer_accepted_at" DATETIME,
    "retain_until" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contracts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "fee_kes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stk_push_ref" TEXT,
    "funded_at" DATETIME,
    "released_at" DATETIME,
    "auto_release_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "escrows_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "escrows_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "gross_kes" INTEGER NOT NULL,
    "paye_kes" INTEGER NOT NULL DEFAULT 0,
    "nssf_tier1_kes" INTEGER NOT NULL DEFAULT 0,
    "nssf_tier2_kes" INTEGER NOT NULL DEFAULT 0,
    "shif_kes" INTEGER NOT NULL DEFAULT 0,
    "ahl_kes" INTEGER NOT NULL DEFAULT 0,
    "platform_fee_kes" INTEGER NOT NULL DEFAULT 0,
    "net_kes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "daraja_ref" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "paid_at" DATETIME,
    "retain_until" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "minimum_wages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "rate_kes" INTEGER NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'daily',
    "effective_from" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "employer_id" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_keys" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "disputes_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "disputes_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "disputes_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "employer_id" TEXT,
    "rater_role" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ratings_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ratings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ratings_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" DATETIME,
    "failed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" TEXT,
    "ip_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "geo_hash" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "event_types" TEXT NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscription_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "response_code" INTEGER,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employers_user_id_key" ON "employers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_applications_shift_id_worker_id_key" ON "shift_applications"("shift_id", "worker_id");

-- CreateIndex
CREATE INDEX "shift_events_shift_id_idx" ON "shift_events"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_shift_id_key" ON "contracts"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_shift_id_key" ON "escrows"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_shift_id_key" ON "payments"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_config_tenant_id_key_key" ON "compliance_config"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "minimum_wages_tenant_id_sector_location_key" ON "minimum_wages"("tenant_id", "sector", "location");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_shift_id_key" ON "disputes"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_shift_id_rater_role_key" ON "ratings"("shift_id", "rater_role");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_idx" ON "analytics_events"("tenant_id");
