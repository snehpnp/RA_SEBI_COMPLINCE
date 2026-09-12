import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { ensureStates } from '../services/stateService';

export const getStates = async (req: Request, res: Response) => {
  try {
    let states = await dynamicDb.State.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    if (states.length === 0) {
      await ensureStates(dynamicDb.State);
      states = await dynamicDb.State.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
    }

    res.json({ success: true, data: states });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch states', error: error.message });
  }
};
