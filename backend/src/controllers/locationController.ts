import { Request, Response } from 'express';
import prisma from '../config/db';
import { ensureStates } from '../services/stateService';

export const getStates = async (req: Request, res: Response) => {
  try {
    let states = await prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    if (states.length === 0) {
      await ensureStates(prisma);
      states = await prisma.state.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    res.json({ success: true, data: states });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch states', error: error.message });
  }
};
