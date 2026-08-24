-- AlterTable
ALTER TABLE "TicketMessage" ADD COLUMN "messageId" TEXT;

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.gmail.com',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mailbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_organizationId_email_key" ON "Mailbox"("organizationId", "email");
