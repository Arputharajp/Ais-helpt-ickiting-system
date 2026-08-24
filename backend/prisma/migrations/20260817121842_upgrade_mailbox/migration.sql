/*
  Warnings:

  - You are about to drop the column `password` on the `Mailbox` table. All the data in the column will be lost.
  - Added the required column `encryptedPassword` to the `Mailbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "signature" TEXT;

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mailboxId" TEXT NOT NULL,
    "ticketId" TEXT,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT,
    "gmailUid" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mailbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.gmail.com',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'NEVER_CONNECTED',
    "lastSyncAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastError" TEXT,
    "emailsProcessed" INTEGER NOT NULL DEFAULT 0,
    "ticketsCreated" INTEGER NOT NULL DEFAULT 0,
    "repliesProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mailbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Mailbox" ("createdAt", "email", "id", "imapHost", "imapPort", "isActive", "lastSyncAt", "organizationId", "smtpHost", "smtpPort", "updatedAt") SELECT "createdAt", "email", "id", "imapHost", "imapPort", "isActive", "lastSyncAt", "organizationId", "smtpHost", "smtpPort", "updatedAt" FROM "Mailbox";
DROP TABLE "Mailbox";
ALTER TABLE "new_Mailbox" RENAME TO "Mailbox";
CREATE UNIQUE INDEX "Mailbox_organizationId_email_key" ON "Mailbox"("organizationId", "email");
PRAGMA foreign_key_check("Mailbox");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_messageId_key" ON "EmailMessage"("messageId");
