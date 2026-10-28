import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import path from 'path';
import fs from 'fs';
import { syncAllTenantsToRemote } from '../services/tenantSyncDispatcher';

export const uploadResource = async (req: Request, res: Response) => {
  try {
    const { title, category } = req.body;
    const file = req.file;

    if (!title || !category || !file) {
      return res.status(400).json({ success: false, message: 'Missing required fields: title, category, or file' });
    }

    const fileUrl = `/uploads/resources/${file.filename}`;

    const resource = await dynamicDb.Resource.create({
      title,
      category,
      fileUrl,
      fileName: file.originalname,
    });

    // Auto-sync new resource across all company databases in background
    syncAllTenantsToRemote({ reason: 'RESOURCE_UPLOAD' }).catch((syncErr: any) => {
      console.warn('[SYNC] Resource upload sync note:', syncErr.message);
    });

    res.status(201).json({ success: true, data: resource });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to upload resource' });
  }
};

export const getResources = async (req: Request, res: Response) => {
  try {
    const resources = await dynamicDb.Resource.find({}).sort({ uploadedAt: -1 }).lean();
    res.status(200).json({ success: true, data: resources });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch resources' });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await dynamicDb.Resource.findById(id);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Delete the file from the filesystem if it exists
    const filePath = path.join(__dirname, '../../..', resource.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error('Failed to delete resource file:', fileErr);
      }
    }

    await dynamicDb.Resource.findByIdAndDelete(id);

    // Auto-sync resource deletion across all company databases in background
    syncAllTenantsToRemote({ reason: 'RESOURCE_DELETE' }).catch((syncErr: any) => {
      console.warn('[SYNC] Resource delete sync note:', syncErr.message);
    });

    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete resource' });
  }
};
