import nodemailer from 'nodemailer';
import { prisma } from '../../index';
import { decrypt } from '../../utils/crypto';

export const sendOutboundEmail = async (organizationId: string, to: string, subject: string, text: string, html?: string, replyToMessageId?: string, agentName?: string) => {
  // Get active mailbox for org
  const mailbox = await prisma.mailbox.findFirst({
    where: { organizationId, isActive: true }
  });

  if (!mailbox) {
    console.log(`No active mailbox found for org ${organizationId}. Cannot send email.`);
    return null;
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  
  let finalBodyText = text;
  if (org?.signature) {
     let sig = org.signature;
     sig = sig.replace(/\{\{agent_name\}\}/g, agentName || 'Customer Support');
     sig = sig.replace(/\{\{organization_name\}\}/g, org.name || '');
     
     finalBodyText = `${text}\n\n--\n${sig}`;
  }

  const transporter = nodemailer.createTransport({
    host: mailbox.smtpHost,
    port: mailbox.smtpPort,
    secure: true,
    auth: {
      user: mailbox.email,
      pass: decrypt(mailbox.encryptedPassword),
    }
  });

  const mailOptions: any = {
    from: mailbox.email,
    to,
    subject,
    text: finalBodyText,
    html,
  };

  if (replyToMessageId) {
     mailOptions.inReplyTo = replyToMessageId;
     mailOptions.references = [replyToMessageId];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};
