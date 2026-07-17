import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getClientRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, description } = req.body;
    const request = await prisma.serviceRequest.create({
      data: { type, description, userId: req.user!.id }
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getAllRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const request = await prisma.serviceRequest.update({
      where: { id: req.params.id as string },
      data: { status }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
