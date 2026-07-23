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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Vercel Blob Storage n'est pas configuré. Veuillez créer un Blob Store dans votre projet Vercel (onglet Storage).");
    }

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

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          title: 'Nouvelle demande client',
          message: `${request.user.name} a soumis une demande : ${type}`,
          userId: admin.id
        }
      });
    }

    // Envoi notification WhatsApp
    if (request.user.phone) {
      await sendWhatsAppMessage(
        request.user.phone, 
        `Bonjour ${request.user.name}, votre demande pour "${type}" a bien été reçue. Vous pouvez la suivre sur votre portail MACIES.`
      );
    }

    // Enregistrement du log
    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM',
        details: `Nouvelle demande de service soumise : "${type}"`,
        userId: req.user!.id
      }
    });

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

    // Notify Client
    await prisma.notification.create({
      data: {
        title: 'Mise à jour de votre demande',
        message: `Le statut de votre demande "${request.type}" est passé à : ${status}`,
        userId: request.userId
      }
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

    // Notify Client
    await prisma.notification.create({
      data: {
        title: 'Demande Livrée',
        message: `Votre demande "${request.type}" est prête. Vous pouvez télécharger le livrable.`,
        userId: request.userId
      }
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

export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true, phone: true } } }
    });

    if (!request) {
      res.status(404).json({ error: 'Demande non trouvée' });
      return;
    }

    // Un client ne peut voir que ses propres demandes (sauf s'il est admin)
    if (req.user!.role !== 'ADMIN' && request.userId !== req.user!.id) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la demande' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) {
      res.status(404).json({ error: 'Demande non trouvée' });
      return;
    }

    if (req.user!.role !== 'ADMIN' && request.userId !== req.user!.id) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { serviceRequestId: id },
      include: { sender: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ error: 'Le message ne peut pas être vide' });
      return;
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!request) {
      res.status(404).json({ error: 'Demande non trouvée' });
      return;
    }

    if (req.user!.role !== 'ADMIN' && request.userId !== req.user!.id) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        content,
        serviceRequestId: id,
        senderId: req.user!.id
      },
      include: { sender: { select: { name: true, role: true } } }
    });

    // Notify the other party
    const isClientSending = req.user!.role !== 'ADMIN';
    
    if (isClientSending) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            title: 'Nouveau message reçu',
            message: `${req.user!.name} a envoyé un message sur la demande "${request.type}"`,
            userId: admin.id
          }
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          title: 'Nouveau message de MACIES',
          message: `L'administrateur a répondu à votre demande "${request.type}"`,
          userId: request.userId
        }
      });
      // Optionally notify via WhatsApp
      if (request.user.phone) {
        await sendWhatsAppMessage(
          request.user.phone, 
          `MACIES ENTERPRISE : Vous avez reçu un nouveau message sur votre demande "${request.type}". Connectez-vous pour répondre.`
        );
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
};
