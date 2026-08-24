import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { encrypt, decrypt } from '../utils/crypto';
import { processMailbox } from '../services/email/imapService';

const mailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(), // optional when saving if unchanged
  imapHost: z.string().min(1),
  imapPort: z.number().int().positive(),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().positive(),
  signature: z.string().optional(),
});

export const getMailbox = async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const mailbox = await prisma.mailbox.findFirst({
      where: { organizationId: orgId }
    });
    
    const org = await prisma.organization.findUnique({ where: { id: orgId! }});

    if (mailbox) {
       const { encryptedPassword, ...safeMailbox } = mailbox;
       return res.json({ 
          success: true, 
          mailbox: { ...safeMailbox, isConfigured: true },
          signature: org?.signature || ''
       });
    }
    
    res.json({ success: true, mailbox: null, signature: org?.signature || '' });
  } catch (error) {
    console.error('Get mailbox error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const saveMailbox = async (req: Request, res: Response) => {
   try {
      const orgId = req.user!.organizationId;
      const data = mailboxSchema.parse(req.body);

      const existing = await prisma.mailbox.findFirst({ where: { organizationId: orgId } });
      
      let passwordToSave = existing?.encryptedPassword || '';
      
      if (data.password && data.password.trim() !== '') {
          passwordToSave = encrypt(data.password.trim());
      }
      
      if (!passwordToSave) {
          return res.status(400).json({ success: false, message: 'Password is required' });
      }

      let mailbox;
      if (existing) {
         mailbox = await prisma.mailbox.update({
            where: { id: existing.id },
            data: { 
               email: data.email,
               encryptedPassword: passwordToSave,
               imapHost: data.imapHost,
               imapPort: data.imapPort,
               smtpHost: data.smtpHost,
               smtpPort: data.smtpPort,
               isActive: true,
               status: 'CONNECTED',
               lastError: null
            }
         });
      } else {
         mailbox = await prisma.mailbox.create({
            data: { 
               email: data.email,
               encryptedPassword: passwordToSave,
               imapHost: data.imapHost,
               imapPort: data.imapPort,
               smtpHost: data.smtpHost,
               smtpPort: data.smtpPort,
               organizationId: orgId!,
               status: 'CONNECTED'
            }
         });
      }

      // Update signature in organization
      if (data.signature !== undefined) {
         await prisma.organization.update({
            where: { id: orgId! },
            data: { signature: data.signature }
         });
      }
      
      const { encryptedPassword, ...safeMailbox } = mailbox;
      res.json({ success: true, mailbox: safeMailbox });
   } catch (error) {
      if (error instanceof z.ZodError) {
         return res.status(400).json({ success: false, message: error.errors });
       }
      console.error('Save mailbox error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
   }
};

export const testConnection = async (req: Request, res: Response) => {
   try {
      const data = mailboxSchema.parse(req.body);
      const orgId = req.user!.organizationId;

      let passwordToTest = data.password;
      if (!passwordToTest || passwordToTest.trim() === '') {
         const existing = await prisma.mailbox.findFirst({ where: { organizationId: orgId } });
         if (!existing) return res.status(400).json({ success: false, message: 'Password required for test' });
         passwordToTest = decrypt(existing.encryptedPassword);
      }

      // Test IMAP
      try {
         const connection = await imaps.connect({
            imap: {
               user: data.email,
               password: passwordToTest,
               host: data.imapHost,
               port: data.imapPort,
               tls: true,
               authTimeout: 5000
            }
         });
         connection.end();
      } catch (err: any) {
         return res.status(400).json({ success: false, message: 'IMAP Authentication failed. Check your App Password.' });
      }

      // Test SMTP
      try {
         const transporter = nodemailer.createTransport({
            host: data.smtpHost,
            port: data.smtpPort,
            secure: true,
            auth: {
               user: data.email,
               pass: passwordToTest,
            }
         });
         await transporter.verify();
      } catch (err: any) {
         return res.status(400).json({ success: false, message: 'SMTP Authentication failed. Check your App Password.' });
      }

      res.json({ success: true, message: 'Connection successful. IMAP and SMTP are working correctly.' });
   } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ success: false, message: 'Connection test failed.' });
   }
};

export const syncMailbox = async (req: Request, res: Response) => {
   try {
      const orgId = req.user!.organizationId;
      const mailbox = await prisma.mailbox.findFirst({ where: { organizationId: orgId } });
      
      if (!mailbox) return res.status(404).json({ success: false, message: 'Mailbox not configured' });
      
      await processMailbox(mailbox.id);
      
      res.json({ success: true, message: 'Sync completed.' });
   } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ success: false, message: 'Sync failed.' });
   }
};

export const disableMailbox = async (req: Request, res: Response) => {
   try {
      const orgId = req.user!.organizationId;
      const existing = await prisma.mailbox.findFirst({ where: { organizationId: orgId } });
      
      if (existing) {
         await prisma.mailbox.update({
            where: { id: existing.id },
            data: { isActive: false, status: 'DISABLED' }
         });
      }
      
      res.json({ success: true });
   } catch (error) {
      console.error('Disable mailbox error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
   }
};
