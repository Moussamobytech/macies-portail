import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Récupérer les notifications de l'utilisateur connecté
export const getNotifications = async (req: any, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limite aux 50 dernières notifications
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
};

// Marquer une notification comme lue
export const markAsRead = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Vérifier si la notification appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.id) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
  }
};

// Marquer toutes les notifications comme lues
export const markAllAsRead = async (req: any, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
  }
};
