-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "employer_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "effective_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geo_hash" TEXT,
    "distance_m" INTEGER,
    "accuracy_m" INTEGER,
    "geofence_result" TEXT,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT,
    CONSTRAINT "attendance_events_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "admin_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_reviews_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "attendance_events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "scheduled_minutes" INTEGER NOT NULL,
    "worked_minutes" INTEGER NOT NULL,
    "gross_kes" INTEGER NOT NULL,
    "paye_kes" INTEGER NOT NULL DEFAULT 0,
    "nssf_tier1_kes" INTEGER NOT NULL DEFAULT 0,
    "nssf_tier2_kes" INTEGER NOT NULL DEFAULT 0,
    "shif_kes" INTEGER NOT NULL DEFAULT 0,
    "ahl_kes" INTEGER NOT NULL DEFAULT 0,
    "net_kes" INTEGER NOT NULL,
    "platform_fee_kes" INTEGER NOT NULL,
    "employer_total_kes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "approve_by" DATETIME NOT NULL,
    "approved_at" DATETIME,
    "approved_by" TEXT,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shift_settlements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable: Uber-style arrive → PIN → start, clock-out location, no-show stage
ALTER TABLE "shifts" ADD COLUMN "clock_out_geo_hash" TEXT;
ALTER TABLE "shifts" ADD COLUMN "arrived_at" DATETIME;
ALTER TABLE "shifts" ADD COLUMN "start_pin" TEXT;
ALTER TABLE "shifts" ADD COLUMN "pin_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shifts" ADD COLUMN "late_stage" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "attendance_events_shift_id_effective_at_idx" ON "attendance_events"("shift_id", "effective_at");

-- CreateIndex
CREATE INDEX "attendance_events_employer_id_effective_at_idx" ON "attendance_events"("employer_id", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reviews_event_id_key" ON "attendance_reviews"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_settlements_shift_id_key" ON "shift_settlements"("shift_id");

-- CreateIndex
CREATE INDEX "shift_settlements_status_approve_by_idx" ON "shift_settlements"("status", "approve_by");

-- Append-only: attendance events are evidence and are never edited or removed.
CREATE TRIGGER "attendance_events_no_update" BEFORE UPDATE ON "attendance_events"
BEGIN SELECT RAISE(ABORT, 'attendance_events is append-only'); END;
CREATE TRIGGER "attendance_events_no_delete" BEFORE DELETE ON "attendance_events"
BEGIN SELECT RAISE(ABORT, 'attendance_events is append-only'); END;
