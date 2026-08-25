import { Request, Response } from 'express';
import prisma from '../config/db';
import { logAudit } from '../services/auditService';

// Client creating a ticket
export const createTicket = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;
  const { subject, priority, message } = req.body;
  const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if the client has any active tickets (status "PENDING" or "OPEN")
    const activeTicket = await prisma.supportTicket.findFirst({
      where: {
        clientId: client.id,
        status: { in: ['PENDING', 'OPEN'] }
      }
    });

    if (activeTicket) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active ticket. Please wait until your active ticket is closed before opening a new one.'
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId,
        clientId: client.id,
        subject,
        priority: priority || 'NORMAL',
        status: 'PENDING',
        messages: {
          create: {
            senderId: userId,
            message,
            attachmentUrl
          }
        }
      },
      include: {
        messages: true
      }
    });

    await logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      module: 'TICKETS',
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Client listing their tickets
export const listTickets = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId, clientId: client.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    return res.status(200).json({ success: true, data: tickets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Client viewing specific ticket
export const getTicket = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;
  const { id } = req.params;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId, clientId: client.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { firstName: true, lastName: true, role: { select: { name: true } } } } }
        }
      }
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Client replying to ticket
export const replyTicket = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;
  const { id } = req.params;
  const { message } = req.body;
  const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId, clientId: client.id }
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (ticket.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Ticket is closed.' });
    if (ticket.status === 'PENDING') return res.status(400).json({ success: false, message: 'Please wait for an admin to reply before sending another message.' });

    const reply = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        message,
        attachmentUrl
      }
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() }
    });

    await logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'TICKETS',
      ipAddress: req.ip
    });

    return res.status(200).json({ success: true, message: 'Reply sent.', data: reply });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Admin / Staff: List tickets
export const listAdminTickets = async (req: Request, res: Response) => {
  const { tenantId, role, id: userId } = (req as any).user;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    let whereClause: any = { tenantId };

    if (!isFullAdmin) {
      const hasAccess = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
      });
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
      }

      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
      });

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
      }

      if (!hasViewAll && hasViewOwn) {
        whereClause.client = { createdById: userId };
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: { name: true, email: true, mobile: true, status: true }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    return res.status(200).json({ success: true, data: tickets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Admin / Staff: View specific ticket details & messages
export const getAdminTicket = async (req: Request, res: Response) => {
  const { tenantId, role, id: userId } = (req as any).user;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    let whereClause: any = { id, tenantId };

    if (!isFullAdmin) {
      const hasAccess = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
      });
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
      }

      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
      });

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
      }

      if (!hasViewAll && hasViewOwn) {
        whereClause.client = { createdById: userId };
      }
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: whereClause,
      include: {
        client: {
          select: { name: true, email: true, mobile: true, status: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { firstName: true, lastName: true, role: { select: { name: true } } } } }
        }
      }
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Admin / Staff: Reply to ticket (sets status to OPEN)
export const replyAdminTicket = async (req: Request, res: Response) => {
  const { tenantId, role, id: userId } = (req as any).user;
  const { id } = req.params;
  const { message } = req.body;
  const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    let ticketWhere: any = { id, tenantId };

    if (!isFullAdmin) {
      const hasAccess = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
      });
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
      }

      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
      });

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to reply to tickets.' });
      }

      if (!hasViewAll && hasViewOwn) {
        ticketWhere.client = { createdById: userId };
      }
    }

    const ticket = await prisma.supportTicket.findFirst({ where: ticketWhere });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (ticket.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Ticket is closed.' });

    const reply = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        message,
        attachmentUrl
      }
    });

    // Mark as OPEN on Admin/Staff reply
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', updatedAt: new Date() }
    });

    await logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'TICKETS',
      ipAddress: req.ip
    });

    return res.status(200).json({ success: true, message: 'Reply sent and ticket status updated to OPEN.', data: reply });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Admin / Staff: Close ticket
export const closeAdminTicket = async (req: Request, res: Response) => {
  const { tenantId, role, id: userId } = (req as any).user;
  const { id } = req.params;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    let ticketWhere: any = { id, tenantId };

    if (!isFullAdmin) {
      const hasAccess = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
      });
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
      }

      const hasViewAll = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
      });
      const hasViewOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
      });

      if (!hasViewAll && !hasViewOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to close tickets.' });
      }

      if (!hasViewAll && hasViewOwn) {
        ticketWhere.client = { createdById: userId };
      }
    }

    const ticket = await prisma.supportTicket.findFirst({ where: ticketWhere });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', updatedAt: new Date() }
    });

    await logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'TICKETS',
      ipAddress: req.ip
    });

    return res.status(200).json({ success: true, message: 'Ticket closed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};
