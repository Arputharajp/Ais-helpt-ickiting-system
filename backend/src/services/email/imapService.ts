import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { prisma } from '../../index';
import { decrypt } from '../../utils/crypto';
import fs from 'fs';
import path from 'path';

export const processMailbox = async (mailboxId: string) => {
   const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
   if (!mailbox || !mailbox.isActive) return;

   const password = decrypt(mailbox.encryptedPassword);

   const config = {
      imap: {
         user: mailbox.email,
         password: password,
         host: mailbox.imapHost,
         port: mailbox.imapPort,
         tls: true,
         authTimeout: 10000
      }
   };

   try {
      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: [''], markSeen: true };

      const messages = await connection.search(searchCriteria, fetchOptions);

      let processed = 0;
      let ticketsCreated = 0;
      let repliesProcessed = 0;

      for (const item of messages) {
         const all = item.parts.find(part => part.which === '');
         const uid = item.attributes.uid.toString();
         const idHeader = "Imap-Id: "+uid+"\r\n";
         
         if (all) {
            const parsed = await simpleParser(idHeader + all.body);
            
            // Check for duplicates
            const existingMsg = await prisma.emailMessage.findFirst({
               where: { messageId: parsed.messageId || uid }
            });
            
            if (existingMsg) continue;

            // ignore self emails
            const fromAddress = parsed.from?.value[0]?.address;
            if (fromAddress === mailbox.email) continue;
            
            const result = await handleIncomingEmail(parsed, mailbox, uid);
            
            processed++;
            if (result === 'TICKET') ticketsCreated++;
            if (result === 'REPLY') repliesProcessed++;
         }
      }

      connection.end();
      
      await prisma.mailbox.update({
         where: { id: mailbox.id },
         data: { 
            lastSyncAt: new Date(),
            lastSuccessAt: new Date(),
            status: 'CONNECTED',
            lastError: null,
            emailsProcessed: { increment: processed },
            ticketsCreated: { increment: ticketsCreated },
            repliesProcessed: { increment: repliesProcessed }
         }
      });

   } catch (error: any) {
      console.error(`Error processing mailbox ${mailbox.email}:`, error);
      await prisma.mailbox.update({
         where: { id: mailbox.id },
         data: { status: 'ERROR', lastError: error.message }
      });
   }
};

const handleIncomingEmail = async (parsed: any, mailbox: any, uid: string) => {
   const fromAddress = parsed.from?.value[0]?.address || 'unknown@example.com';
   const fromName = parsed.from?.value[0]?.name || '';
   const subject = parsed.subject || 'No Subject';
   const textContent = parsed.text || parsed.textAsHtml || '(Empty Body)';
   const messageId = parsed.messageId || uid;
   const inReplyTo = parsed.inReplyTo;
   const references = Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references;

   // 1. Find or create customer
   let customer = await prisma.customer.findFirst({
      where: { email: fromAddress, organizationId: mailbox.organizationId }
   });

   if (!customer) {
      let firstName = 'Unknown';
      let lastName = 'Customer';
      if (fromName) {
         const parts = fromName.split(' ');
         firstName = parts[0];
         lastName = parts.slice(1).join(' ') || 'Customer';
      } else {
         firstName = fromAddress.split('@')[0];
      }
      customer = await prisma.customer.create({
         data: { email: fromAddress, firstName, lastName, organizationId: mailbox.organizationId }
      });
   }

   // 2. Threading logic
   let existingTicketId: string | null = null;
   const ticketIdMatch = subject.match(/\[TKT-(.*?)\]/);
   
   if (ticketIdMatch) {
      existingTicketId = ticketIdMatch[1];
   }

   if (!existingTicketId && inReplyTo) {
       const refMsg = await prisma.emailMessage.findFirst({ where: { messageId: inReplyTo } });
       if (refMsg?.ticketId) existingTicketId = refMsg.ticketId;
   }

   let resultType = 'REPLY';

   if (existingTicketId) {
      const ticket = await prisma.ticket.findFirst({ where: { id: existingTicketId, organizationId: mailbox.organizationId }});
      if (ticket) {
         const newMsg = await prisma.ticketMessage.create({
            data: {
               ticketId: ticket.id, content: textContent, isInternal: false,
               senderType: 'CUSTOMER', customerId: customer.id, messageId: messageId,
            }
         });
         await saveAttachments(parsed.attachments, newMsg.id);
         await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'OPEN', updatedAt: new Date() } });
      } else {
         existingTicketId = null; // Ticket not found, fallback to new
      }
   }

   if (!existingTicketId) {
      resultType = 'TICKET';
      // Use short ID approach
      const newTicket = await prisma.ticket.create({
         data: {
            subject, description: textContent, organizationId: mailbox.organizationId,
            customerId: customer.id, status: 'NEW', priority: 'MEDIUM',
         }
      });
      existingTicketId = newTicket.id;
      const newMsg = await prisma.ticketMessage.create({
         data: {
            ticketId: newTicket.id, content: textContent, isInternal: false,
            senderType: 'CUSTOMER', customerId: customer.id, messageId: messageId,
         }
      });
      await saveAttachments(parsed.attachments, newMsg.id);
   }

   // 3. Track Email
   await prisma.emailMessage.create({
      data: {
         mailboxId: mailbox.id, ticketId: existingTicketId, messageId: messageId,
         inReplyTo: inReplyTo, references: references, gmailUid: uid,
         fromEmail: fromAddress, toEmail: parsed.to?.value?.[0]?.address || mailbox.email,
         subject, body: textContent, receivedAt: parsed.date || new Date()
      }
   });
   
   return resultType;
};

const saveAttachments = async (attachments: any[], messageId: string) => {
   if (!attachments || attachments.length === 0) return;
   
   const uploadDir = path.join(__dirname, '../../../uploads');
   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

   for (const att of attachments) {
      const fileName = att.filename || `attachment-${Date.now()}`;
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(uploadDir, safeName);
      
      fs.writeFileSync(filePath, att.content);
      
      await prisma.ticketAttachment.create({
         data: {
            fileName: att.filename || 'unknown',
            fileType: att.contentType,
            fileSize: att.size,
            fileUrl: `/uploads/${safeName}`, // assuming static serve
            messageId: messageId
         }
      });
   }
};
