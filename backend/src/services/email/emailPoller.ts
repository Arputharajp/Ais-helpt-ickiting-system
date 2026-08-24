import cron from 'node-cron';
import { prisma } from '../../index';
import { processMailbox } from './imapService';

let isRunning = false;

export const startEmailPoller = () => {
   // Run every 2 minutes
   cron.schedule('*/2 * * * *', async () => {
      if (isRunning) return;
      isRunning = true;
      
      try {
         console.log('Running email poller...');
         const mailboxes = await prisma.mailbox.findMany({
            where: { isActive: true }
         });

         for (const mailbox of mailboxes) {
            await processMailbox(mailbox.id);
         }
      } catch (error) {
         console.error('Email poller error:', error);
      } finally {
         isRunning = false;
      }
   });
   console.log('Email poller scheduled.');
};
