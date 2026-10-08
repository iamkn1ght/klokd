-- CreateTable
CREATE TABLE "early_access_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "area" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "early_access_requests_phone_key" ON "early_access_requests"("phone");

-- CreateIndex
CREATE INDEX "early_access_requests_role_idx" ON "early_access_requests"("role");
