import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';
import { put } from '@vercel/blob';
import { sendWhatsAppMessage } from '../services/whatsappService';

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
    let fileUrls: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const blob = await put(file.originalname, file.buffer, {
          access: 'public',
        });
        fileUrls.push(blob.url);
      }
    }

    const fileUrl = fileUrls.length > 0 ? fileUrls.join(',') : null;

    const request = await prisma.serviceRequest.create({
      data: { type, description, userId: req.user!.id, fileUrl },
      include: { user: true }
    });

    // Envoi notification WhatsApp
    if (request.user.phone) {
      await sendWhatsAppMessage(
        request.user.phone, 
        `Bonjour ${request.user.name}, votre demande pour "${type}" a bien été reçue. Vous pouvez la suivre sur votre portail MACIES.`
      );
    }

    res.status(201).json(request);
  } catch (error) {
    console.error("Vercel Blob Error:", error);
    res.status(500).json({ error: 'Erreur lors de la création de la demande' });
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
      data: { status },
      include: { user: true }
    });

    if (request.user.phone) {
      await sendWhatsAppMessage(
        request.user.phone, 
        `MACIES ENTERPRISE : Le statut de votre demande "${request.type}" a été mis à jour : ${status}`
      );
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deliverRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let deliverableUrl = null;

    if (req.file) {
      const blob = await put(req.file.originalname, req.file.buffer, {
        access: 'public',
      });
      deliverableUrl = blob.url;
    }

    if (!deliverableUrl) {
      res.status(400).json({ error: 'Fichier manquant' });
      return;
    }

    const request = await prisma.serviceRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'DELIVERED', deliverableUrl },
      include: { user: true }
    });

    if (request.user.phone) {
      await sendWhatsAppMessage(
        request.user.phone, 
        `MACIES ENTERPRISE : Excellente nouvelle ! Le livrable pour votre demande "${request.type}" est prêt. Connectez-vous à votre espace client pour le télécharger.`
      );
    }

    res.json(request);
  } catch (error) {
    console.error("Deliver Error:", error);
    res.status(500).json({ error: 'Erreur lors de la livraison' });
  }
};
