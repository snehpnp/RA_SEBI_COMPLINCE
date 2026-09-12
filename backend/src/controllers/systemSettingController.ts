import { Request, Response } from 'express';
import dynamicDb, { centralModels } from '../config/db';
import nodemailer from 'nodemailer';
import { syncAllTenantsToRemote } from '../services/tenantSyncDispatcher';
import { resolveSmtpCredentials } from '../services/emailService';
import { tenantConnectionManager } from '../services/tenantConnectionManager';

import mongoose from 'mongoose';

const BRANDING_KEY = 'GLOBAL_BRANDING';

export const getGlobalBranding = async (req: Request, res: Response) => {
  try {
    // 1. Check local dynamicDb.Tenant first (tenant database)
    const requestedTenant = (req.query.tenantId || req.query.tenant || req.query.company || req.query.domain || req.headers['x-tenant-id'] || req.headers['x-domain-url']) as string;
    let localTenant: any = null;

    if (requestedTenant) {
      localTenant = await dynamicDb.Tenant.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(requestedTenant) ? [{ _id: requestedTenant }] : []),
          { id: requestedTenant },
          { tenantId: requestedTenant },
          { domainUrl: new RegExp(requestedTenant.replace(/^https?:\/\//, ''), 'i') }
        ]
      }).lean();
    }
    if (!localTenant) {
      localTenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }

    if (localTenant && (localTenant.logoUrl || localTenant.companyName)) {
      return res.status(200).json({
        success: true,
        data: {
          appName: localTenant.companyName || 'RAGCP',
          logoUrl: localTenant.logoUrl || '/logo-light.png',
          faviconUrl: localTenant.faviconUrl || '/favicon.ico',
          loginLogoUrl: localTenant.logoUrl || '/logo-light.png',
          companyName: localTenant.companyName,
          themeColor: localTenant.themeColor || null
        }
      });
    }

    // 2. Check local dynamicDb.SystemSetting
    const localSetting = await dynamicDb.SystemSetting.findOne({ key: BRANDING_KEY }).lean();
    if (localSetting && localSetting.value) {
      const parsed = typeof localSetting.value === 'string' ? JSON.parse(localSetting.value) : localSetting.value;
      return res.status(200).json({
        success: true,
        data: parsed
      });
    }

    // 3. Return default branding
    return res.status(200).json({
      success: true,
      data: {
        appName: 'RAGCP',
        logoUrl: '/logo-light.png',
        faviconUrl: '/favicon.ico',
        loginLogoUrl: '/logo-light.png'
      }
    });
  } catch (error: any) {
    console.error('Error fetching global branding:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
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
    const existing = await dynamicDb.SystemSetting.findOne({ key: BRANDING_KEY }).lean();
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

    const setting = await dynamicDb.SystemSetting.findOneAndUpdate(
      { key: BRANDING_KEY },
      {
        $set: {
          value: JSON.stringify(brandingData),
          updatedById: user.id
        },
        $setOnInsert: { key: BRANDING_KEY }
      },
      { upsert: true, returnDocument: 'after', lean: true }
    );

    // Auto-sync global branding updates across all company domains in background
    syncAllTenantsToRemote({ reason: 'BRANDING_UPDATE' }).catch((err: any) => {
      console.warn('Background sync for global branding update error:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Global branding updated and propagated across companies successfully',
      data: setting ? JSON.parse(setting.value) : {}
    });
  } catch (error: any) {
    console.error('Error updating global branding:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const testSmtpConnection = async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, testEmail } = req.body;
    
    let finalHost = (host || '').trim();
    let finalPort = (port ? parseInt(port) : 0);
    let finalUser = (user || '').trim();
    let finalPassword = (password || '').trim();
    const finalTestEmail = (testEmail || '').trim();

    if (!finalTestEmail) {
      return res.status(400).json({ success: false, message: 'Test email address is required.' });
    }

    if (!finalHost || !finalUser || !finalPassword) {
      const tenantId = (req as any).user?.tenantId;
      const resolved = await resolveSmtpCredentials(tenantId);
      if (resolved) {
        if (!finalHost) finalHost = resolved.host;
        if (!finalPort) finalPort = resolved.port;
        if (!finalUser) finalUser = resolved.user;
        if (!finalPassword) finalPassword = resolved.pass;
      }
    }

    if (!finalHost || !finalUser || !finalPassword) {
      return res.status(400).json({ success: false, message: 'All SMTP details (Host, Port, User, Password) and Test Email are required.' });
    }

    if (!finalPort) finalPort = 587;

    const transporter = nodemailer.createTransport({
      host: finalHost,
      port: finalPort,
      secure: finalPort === 465,
      auth: {
        user: finalUser,
        pass: finalPassword
      },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: finalUser,
      to: finalTestEmail,
      subject: 'Test Email from RAGCP',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>SMTP Connection Successful!</h2>
        <p>If you are reading this, your SMTP credentials for RAGCP are perfectly configured.</p>
        <p style="color: #64748b; font-size: 12px;">Server: ${finalHost}:${finalPort} | User: ${finalUser}</p>
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
