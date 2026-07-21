import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';
import { handleUpload } from '@vercel/blob/client';
import { sendWhatsAppMessage } from '../services/whatsappService';

const prisma = new PrismaClient();

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

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

export const generateUploadToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!clientPayload) throw new Error("Non autorisé");
        
        try {
          jwt.verify(clientPayload, JWT_SECRET);
        } catch {
          throw new Error("Token invalide");
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, description, fileUrl } = req.body;

    const request = await prisma.serviceRequest.create({
      data: { type, description, userId: req.user!.id, fileUrl: fileUrl || null },
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
    console.error("Create Request Error:", error);
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

    // Enregistrement du log
    await prisma.activityLog.create({
      data: {
        action: 'STATUS_UPDATE',
        details: `Modification du statut de la demande #MAC-${request.id.substring(0, 4).toUpperCase()} à ${status}`,
        userId: req.user!.id
      }
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deliverRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deliverableUrl } = req.body;

    if (!deliverableUrl) {
      res.status(400).json({ error: 'Lien du livrable manquant' });
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

    // Enregistrement du log
    await prisma.activityLog.create({
      data: {
        action: 'DELIVERY',
        details: `Livraison effectuée pour la demande #MAC-${request.id.substring(0, 4).toUpperCase()}`,
        userId: req.user!.id
      }
    });

    res.json(request);
  } catch (error) {
    console.error("Deliver Error:", error);
    res.status(500).json({ error: 'Erreur lors de la livraison' });
  }
};
