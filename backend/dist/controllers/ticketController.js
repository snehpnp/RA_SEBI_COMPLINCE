"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAdminTicket = exports.replyAdminTicket = exports.getAdminTicket = exports.listAdminTickets = exports.replyTicket = exports.getTicket = exports.listTickets = exports.createTicket = void 0;
const db_1 = __importDefault(require("../config/db"));
const auditService_1 = require("../services/auditService");
// Client creating a ticket
const createTicket = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { subject, priority, message } = req.body;
    const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;
    try {
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        // Check if the client has any active tickets (status "PENDING" or "OPEN")
        const activeTicket = await db_1.default.supportTicket.findFirst({
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
        const ticket = await db_1.default.supportTicket.create({
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
        await (0, auditService_1.logAudit)({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.createTicket = createTicket;
// Client listing their tickets
const listTickets = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    try {
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        const tickets = await db_1.default.supportTicket.findMany({
            where: { tenantId, clientId: client.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });
        return res.status(200).json({ success: true, data: tickets });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.listTickets = listTickets;
// Client viewing specific ticket
const getTicket = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    try {
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const ticket = await db_1.default.supportTicket.findFirst({
            where: { id, tenantId, clientId: client.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { firstName: true, lastName: true, role: { select: { name: true } } } } }
                }
            }
        });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        return res.status(200).json({ success: true, data: ticket });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getTicket = getTicket;
// Client replying to ticket
const replyTicket = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { message } = req.body;
    const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;
    try {
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const ticket = await db_1.default.supportTicket.findFirst({
            where: { id, tenantId, clientId: client.id }
        });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'CLOSED')
            return res.status(400).json({ success: false, message: 'Ticket is closed.' });
        if (ticket.status === 'PENDING')
            return res.status(400).json({ success: false, message: 'Please wait for an admin to reply before sending another message.' });
        const reply = await db_1.default.ticketMessage.create({
            data: {
                ticketId: ticket.id,
                senderId: userId,
                message,
                attachmentUrl
            }
        });
        await db_1.default.supportTicket.update({
            where: { id: ticket.id },
            data: { updatedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        return res.status(200).json({ success: true, message: 'Reply sent.', data: reply });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.replyTicket = replyTicket;
// Admin / Staff: List tickets
const listAdminTickets = async (req, res) => {
    const { tenantId, role, id: userId } = req.user;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        let whereClause = { tenantId };
        if (!isFullAdmin) {
            const hasAccess = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
            });
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
            });
            const hasViewOwn = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
            });
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                whereClause.client = { createdById: userId };
            }
        }
        const tickets = await db_1.default.supportTicket.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.listAdminTickets = listAdminTickets;
// Admin / Staff: View specific ticket details & messages
const getAdminTicket = async (req, res) => {
    const { tenantId, role, id: userId } = req.user;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        let whereClause = { id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
            });
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
            });
            const hasViewOwn = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
            });
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                whereClause.client = { createdById: userId };
            }
        }
        const ticket = await db_1.default.supportTicket.findFirst({
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
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        return res.status(200).json({ success: true, data: ticket });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getAdminTicket = getAdminTicket;
// Admin / Staff: Reply to ticket (sets status to OPEN)
const replyAdminTicket = async (req, res) => {
    const { tenantId, role, id: userId } = req.user;
    const { id } = req.params;
    const { message } = req.body;
    const attachmentUrl = req.file ? `/uploads/tickets/${req.file.filename}` : null;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        let ticketWhere = { id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
            });
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
            });
            const hasViewOwn = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
            });
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to reply to tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                ticketWhere.client = { createdById: userId };
            }
        }
        const ticket = await db_1.default.supportTicket.findFirst({ where: ticketWhere });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'CLOSED')
            return res.status(400).json({ success: false, message: 'Ticket is closed.' });
        const reply = await db_1.default.ticketMessage.create({
            data: {
                ticketId: ticket.id,
                senderId: userId,
                message,
                attachmentUrl
            }
        });
        // Mark as OPEN on Admin/Staff reply
        await db_1.default.supportTicket.update({
            where: { id: ticket.id },
            data: { status: 'OPEN', updatedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        return res.status(200).json({ success: true, message: 'Reply sent and ticket status updated to OPEN.', data: reply });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.replyAdminTicket = replyAdminTicket;
// Admin / Staff: Close ticket
const closeAdminTicket = async (req, res) => {
    const { tenantId, role, id: userId } = req.user;
    const { id } = req.params;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        let ticketWhere = { id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'ACCESS_TICKETS' } }
            });
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_ALL_TICKETS' } }
            });
            const hasViewOwn = await db_1.default.rolePermission.findFirst({
                where: { role: { name: role }, permission: { code: 'VIEW_OWN_TICKETS' } }
            });
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to close tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                ticketWhere.client = { createdById: userId };
            }
        }
        const ticket = await db_1.default.supportTicket.findFirst({ where: ticketWhere });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        await db_1.default.supportTicket.update({
            where: { id: ticket.id },
            data: { status: 'CLOSED', updatedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        return res.status(200).json({ success: true, message: 'Ticket closed successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.closeAdminTicket = closeAdminTicket;
