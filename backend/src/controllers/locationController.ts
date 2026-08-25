import { Request, Response } from 'express';
import prisma from '../config/db';

export const getStates = async (req: Request, res: Response) => {
  try {
    const states = await prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: states });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch states', error: error.message });
  }
};
