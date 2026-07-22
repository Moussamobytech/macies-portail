import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email déjà utilisé' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword, role: role || 'CLIENT' }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Log the new registration
    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM',
        details: `Nouvel utilisateur inscrit : ${user.name} (${user.email})`,
        userId: user.id
      }
    });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'Identifiants invalides' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Identifiants invalides' });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    if (user.role === 'ADMIN') {
      await prisma.activityLog.create({
        data: {
          action: 'SYSTEM',
          details: `Connexion administrateur réussie`,
          userId: user.id
        }
      });
    }

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    
    // Check if email is already taken by another user
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, id: { not: req.user.id } } });
      if (existing) {
        res.status(400).json({ error: 'Cet email est déjà utilisé par un autre compte.' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        ...(name && { name }), 
        ...(email && { email }),
        ...(phone && { phone }) 
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM',
        details: `L'utilisateur ${updatedUser.name} a mis à jour son profil.`,
        userId: updatedUser.id
      }
    });

    res.json({ 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        role: updatedUser.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};
