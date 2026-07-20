import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingCount = await prisma.serviceRequest.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });

    const clientsCount = await prisma.user.count({
      where: { role: 'CLIENT' }
    });

    const deliveredCount = await prisma.serviceRequest.count({
      where: { status: 'DELIVERED' }
    });

    res.json({
      pendingRequests: pendingCount,
      activeClients: clientsCount,
      deliveredRequests: deliveredCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors du chargement des statistiques' });
  }
};

export const getAdminClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { requests: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors du chargement des clients' });
  }
};
