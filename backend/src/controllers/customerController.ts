import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

const createCustomerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
});

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const data = createCustomerSchema.parse(req.body);
    
    const existing = await prisma.customer.findUnique({
      where: {
         email_organizationId: {
            email: data.email,
            organizationId: orgId!
         }
      }
    });

    if (existing) {
       return res.status(400).json({ success: false, message: 'Customer with this email already exists in this organization.' });
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        organizationId: orgId!,
      }
    });
    
    res.status(201).json({ success: true, customer });
  } catch (error) {
     if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const customers = await prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
