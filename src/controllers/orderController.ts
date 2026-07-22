import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fonction utilitaire pour notifier les admins
const notifyAdmins = async (title: string, message: string) => {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        title,
        message,
        userId: admin.id
      }
    });
  }
};

export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const { softwareName, price } = req.body;

    const order = await prisma.order.create({
      data: {
        softwareName,
        price,
        userId: req.user.id
      },
      include: { user: true }
    });

    // 1. Notifier les administrateurs de la nouvelle commande
    await notifyAdmins(
      'Nouvelle commande logicielle',
      `Le client ${req.user.name} a commandé le logiciel: ${softwareName}.`
    );

    // 2. Notifier le client de la prise en compte de sa commande (Simule le WhatsApp automatique / Email)
    await prisma.notification.create({
      data: {
        title: 'Commande en cours de traitement',
        message: `Votre demande pour le logiciel ${softwareName} est en cours de traitement par notre équipe. Vous recevrez le lien de téléchargement bientôt.`,
        userId: req.user.id
      }
    });

    // Optionnel: log system
    await prisma.activityLog.create({
      data: {
        action: 'ORDER_CREATED',
        details: `Commande du logiciel ${softwareName} par ${req.user.name}`,
        userId: req.user.id
      }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
};

export const getUserOrders = async (req: any, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
};

// Admin route
export const getAllOrders = async (req: any, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
};

export const deliverOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Mettre à jour le statut du paiement ou l'état de livraison
    // Ici on suppose qu'on change un état. Dans Prisma Schema actuel, il n'y a que paymentStatus pour Order
    // Mais on peut utiliser Notification pour informer le client
    const order = await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'PAID' }, // Ou 'DELIVERED' si on l'ajoute au schéma, utilisons PAID pour l'exemple
      include: { user: true }
    });

    // Notifier le client de la livraison
    await prisma.notification.create({
      data: {
        title: 'Logiciel livré',
        message: `Votre logiciel ${order.softwareName} est prêt. Vous pouvez télécharger et trouver la clé d'activation dans votre espace.`,
        userId: order.userId
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'ORDER_DELIVERED',
        details: `Logiciel ${order.softwareName} livré à ${order.user.name}`,
        userId: req.user.id // L'admin
      }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la livraison de la commande' });
  }
};
