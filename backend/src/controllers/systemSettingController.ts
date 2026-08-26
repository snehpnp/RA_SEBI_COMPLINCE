import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRANDING_KEY = 'GLOBAL_BRANDING';

export const getGlobalBranding = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: BRANDING_KEY },
    });

    if (!setting) {
      // Return default branding if not set
      return res.status(200).json({
        success: true,
        data: {
          appName: 'RAGCP',
          logoUrl: '/logo-light.png',
          faviconUrl: '/favicon.ico'
        }
      });
    }

    const brandingData = JSON.parse(setting.value);
    res.status(200).json({
      success: true,
      data: brandingData
    });
  } catch (error: any) {
    console.error('Error fetching global branding:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateGlobalBranding = async (req: Request, res: Response) => {
  try {
    const { appName, logoUrl, faviconUrl } = req.body;
    
    // Auth middleware should guarantee this is a SUPER_ADMIN
    const user = (req as any).user;
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const brandingData = {
      appName: appName || 'RAGCP',
      logoUrl: logoUrl || '/logo-light.png',
      faviconUrl: faviconUrl || '/favicon.ico'
    };

    const setting = await prisma.systemSetting.upsert({
      where: { key: BRANDING_KEY },
      update: {
        value: JSON.stringify(brandingData),
        updatedById: user.id
      },
      create: {
        key: BRANDING_KEY,
        value: JSON.stringify(brandingData),
        updatedById: user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Global branding updated successfully',
      data: JSON.parse(setting.value)
    });
  } catch (error: any) {
    console.error('Error updating global branding:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
