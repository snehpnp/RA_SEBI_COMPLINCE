import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

const prisma = new PrismaClient();

export const getSuperAdminProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, firstName: true, lastName: true, email: true, mobile: true, role: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateSuperAdminProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, mobile } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName, lastName, mobile }
    });
    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getAdminProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenant: true
      }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateAdminProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, mobile, companyName, raType, address, ownerName, pan, gst, website, logoUrl } = req.body;
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    await prisma.$transaction(async (tx) => {
      if (firstName || lastName || mobile) {
        await tx.user.update({
          where: { id: userId },
          data: { firstName, lastName, mobile }
        });
      }
      
      if (user?.tenantId) {
        await tx.tenant.update({
          where: { id: user.tenantId },
          data: {
            ...(companyName && { companyName }),
            ...(raType && { raType }),
            ...(address && { address }),
            ...(ownerName && { ownerName }),
            ...(pan && { pan }),
            ...(gst !== undefined && { gst }),
            ...(website !== undefined && { website }),
            ...(logoUrl !== undefined && { logoUrl })
          }
        });
      }
    });
    return res.status(200).json({ success: true, message: 'Admin profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getStaffProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        staff: {
          include: {
            personAssociated: true
          }
        },
        role: true
      }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateStaffProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, mobile, dob, nismNumber, nismValidity, nismUpload, customRole } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { staff: { include: { personAssociated: true } } } });

    await prisma.$transaction(async (tx) => {
      if (firstName || lastName || mobile) {
        await tx.user.update({
          where: { id: userId },
          data: { firstName, lastName, mobile }
        });
      }
      
      if (user?.staff) {
        await tx.staff.update({
          where: { id: user.staff.id },
          data: {
            ...(mobile && { mobile }),
            ...(dob && { dob: new Date(dob) }),
            ...(nismNumber !== undefined && { nismNumber }),
            ...(nismValidity && { nismValidity: new Date(nismValidity) }),
            ...(nismUpload !== undefined && { nismUpload }),
          }
        });
        
        if (user.staff.personAssociated && customRole !== undefined) {
          await tx.personAssociated.update({
            where: { id: user.staff.personAssociated.id },
            data: { customRole }
          });
        }
      }
    });
    return res.status(200).json({ success: true, message: 'Staff profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
