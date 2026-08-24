import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { sendOutboundEmail } from '../services/email/smtpService';

const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  customerId: z.string().uuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  departmentId: z.string().uuid().optional(),
});

export const createTicket = async (req: Request, res: Response) => {
  try {
    const data = createTicketSchema.parse(req.body);
    const orgId = req.user!.organizationId;
    
    // Verify customer belongs to org
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    
    if (!customer || customer.organizationId !== orgId) {
       return res.status(403).json({ success: false, message: 'Invalid customer' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        customerId: data.customerId,
        organizationId: orgId!,
        departmentId: data.departmentId,
      },
      include: {
         customer: true,
      }
    });
    
    res.status(201).json({ success: true, ticket });
  } catch (error) {
     if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { status, priority, assigneeId, customerId } = req.query;
    
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (customerId) where.customerId = customerId;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        customer: true,
        assignee: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        assignee: true,
        department: true,
        messages: {
           include: {
              user: true,
              customer: true,
              attachments: true,
           },
           orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    res.json({ success: true, ticket });
  } catch (error) {
     console.error('Get ticket error:', error);
     res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const { status, priority, assigneeId, departmentId } = req.body;
    
    const existing = await prisma.ticket.findFirst({ where: { id, organizationId: orgId }});
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });
    
    const data: any = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (assigneeId !== undefined) data.assigneeId = assigneeId; // allows null to unassign
    if (departmentId !== undefined) data.departmentId = departmentId;
    
    if (status === 'RESOLVED' && existing.status !== 'RESOLVED') {
       data.resolvedAt = new Date();
    }
    
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: { customer: true, assignee: true, department: true }
    });
    
    res.json({ success: true, ticket });
  } catch (error) {
     console.error('Update ticket error:', error);
     res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const messageSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(false)
});



export const addMessage = async (req: Request, res: Response) => {
   try {
      const { id } = req.params;
      const orgId = req.user!.organizationId;
      const data = messageSchema.parse(req.body);
      
      const ticket = await prisma.ticket.findFirst({ 
         where: { id, organizationId: orgId },
         include: { customer: true }
      });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      
      const message = await prisma.ticketMessage.create({
         data: {
            content: data.content,
            isInternal: data.isInternal,
            ticketId: id,
            senderType: 'USER',
            userId: req.user!.userId,
         },
         include: { user: true }
      });
      
      // Update ticket firstResponseAt if not set
      if (!ticket.firstResponseAt && !data.isInternal) {
         await prisma.ticket.update({
            where: { id },
            data: { firstResponseAt: new Date() }
         });
      }

      // Send outbound email if it's a public reply
      if (data.isInternal === false) {
         const customer = await prisma.customer.findUnique({ where: { id: ticket.customerId }});
         if (customer?.email) {
            
            let replyToId = undefined;
            const originalEmail = await prisma.emailMessage.findFirst({
               where: { ticketId: ticket.id },
               orderBy: { receivedAt: 'desc' }
            });
            if (originalEmail) {
               replyToId = originalEmail.messageId;
            }

            const sender = await prisma.user.findUnique({ where: { id: req.user!.userId }});
            const senderName = sender ? `${sender.firstName} ${sender.lastName}` : undefined;

            await sendOutboundEmail(
               ticket.organizationId,
               customer.email,
               `Re: [TKT-${ticket.id}] ${ticket.subject}`,
               data.content,
               undefined,
               replyToId,
               senderName
            ).catch(err => {
               console.error('Failed to send outbound email reply:', err);
            });
         }
      }
      
      res.status(201).json({ success: true, message });
   } catch (error) {
      if (error instanceof z.ZodError) {
         return res.status(400).json({ success: false, message: error.errors });
       }
      console.error('Add message error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
   }
};
