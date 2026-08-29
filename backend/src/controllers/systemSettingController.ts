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
          faviconUrl: '/favicon.ico',
          loginLogoUrl: '/logo-light.png'
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
    const { appName } = req.body;

    // Auth middleware should guarantee this is a SUPER_ADMIN
    const user = (req as any).user;
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Read existing branding to preserve fields not being updated
    let existingData: any = { appName: 'RAGCP', logoUrl: '/logo-light.png', faviconUrl: '/favicon.ico', loginLogoUrl: '/logo-light.png' };
    const existing = await prisma.systemSetting.findUnique({ where: { key: BRANDING_KEY } });
    if (existing) {
      try { existingData = JSON.parse(existing.value); } catch {}
    }

    // Handle file uploads via multer (req.files is an object or array)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    let logoUrl = existingData.logoUrl;
    let faviconUrl = existingData.faviconUrl;
    let loginLogoUrl = existingData.loginLogoUrl;

    if (files?.logo?.[0]) {
      // Build a URL path relative to server root (multer saves to /uploads/branding/)
      logoUrl = '/uploads/branding/' + files.logo[0].filename;
    } else if (req.body.logoUrl) {
      logoUrl = req.body.logoUrl;
    }

    if (files?.favicon?.[0]) {
      faviconUrl = '/uploads/branding/' + files.favicon[0].filename;
    } else if (req.body.faviconUrl) {
      faviconUrl = req.body.faviconUrl;
    }

    if (files?.loginLogo?.[0]) {
      loginLogoUrl = '/uploads/branding/' + files.loginLogo[0].filename;
    } else if (req.body.loginLogoUrl) {
      loginLogoUrl = req.body.loginLogoUrl;
    }

    const brandingData = {
      appName: appName || existingData.appName || 'RAGCP',
      logoUrl,
      faviconUrl,
      loginLogoUrl
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


import nodemailer from 'nodemailer';

export const testSmtpConnection = async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, testEmail } = req.body;
    
    if (!host || !port || !user || !password || !testEmail) {
      return res.status(400).json({ success: false, message: 'All SMTP details and Test Email are required.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: {
        user,
        pass: password
      }
    });

    const mailOptions = {
      from: user,
      to: testEmail,
      subject: 'Test Email from RAGCP',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>SMTP Connection Successful! ??</h2>
        <p>If you are reading this, your SMTP credentials for RAGCP are perfectly configured.</p>
      </div>`
    };

    await transporter.verify();
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ success: true, message: 'Test email sent successfully! Please check your inbox.' });
  } catch (error: any) {
    console.error('SMTP Test Failed:', error);
    return res.status(500).json({ success: false, message: 'SMTP Test Failed: ' + error.message });
  }
};
