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
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        // Check if the client has any active tickets (status "PENDING" or "OPEN")
        const activeTicket = await db_1.default.SupportTicket.findOne({
            clientId: client._id,
            status: { $in: ['PENDING', 'OPEN'] }
        }).lean();
        if (activeTicket) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active ticket. Please wait until your active ticket is closed before opening a new one.'
            });
        }
        const ticket = await db_1.default.SupportTicket.create({
            tenantId,
            clientId: client._id,
            subject,
            priority: priority || 'NORMAL',
            status: 'PENDING'
        });
        const ticketMessage = await db_1.default.TicketMessage.create({
            ticketId: ticket._id,
            senderId: userId,
            message,
            attachmentUrl
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'CREATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        const responseData = {
            ...ticket.toObject(),
            id: ticket._id.toString(),
            messages: [
                {
                    ...ticketMessage.toObject(),
                    id: ticketMessage._id.toString()
                }
            ]
        };
        return res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: responseData
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
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        const tickets = await db_1.default.SupportTicket.find({
            tenantId,
            clientId: client._id
        })
            .populate('messages')
            .sort({ updatedAt: -1 })
            .lean();
        const formattedTickets = tickets.map((t) => ({
            ...t,
            id: t._id?.toString() || t.id,
            _count: {
                messages: Array.isArray(t.messages) ? t.messages.length : 0
            }
        }));
        return res.status(200).json({ success: true, data: formattedTickets });
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
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const ticket = await db_1.default.SupportTicket.findOne({
            _id: id,
            tenantId,
            clientId: client._id
        })
            .populate({
            path: 'messages',
            options: { sort: { createdAt: 1 } },
            populate: {
                path: 'senderId',
                select: 'firstName lastName roleId',
                populate: { path: 'role', select: 'name' }
            }
        })
            .lean();
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        const formattedMessages = (ticket.messages || []).map((m) => {
            const sender = m.senderId || m.sender || {};
            return {
                ...m,
                id: m._id?.toString() || m.id,
                sender: {
                    firstName: sender.firstName,
                    lastName: sender.lastName,
                    role: sender.role ? { name: sender.role.name } : null
                }
            };
        });
        return res.status(200).json({
            success: true,
            data: {
                ...ticket,
                id: ticket._id?.toString() || ticket.id,
                messages: formattedMessages
            }
        });
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
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const ticket = await db_1.default.SupportTicket.findOne({
            _id: id,
            tenantId,
            clientId: client._id
        });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'CLOSED')
            return res.status(400).json({ success: false, message: 'Ticket is closed.' });
        if (ticket.status === 'PENDING')
            return res.status(400).json({ success: false, message: 'Please wait for an admin to reply before sending another message.' });
        const reply = await db_1.default.TicketMessage.create({
            ticketId: ticket._id,
            senderId: userId,
            message,
            attachmentUrl
        });
        await db_1.default.SupportTicket.findByIdAndUpdate(ticket._id, {
            $set: { updatedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Reply sent.',
            data: {
                ...reply.toObject(),
                id: reply._id.toString()
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.replyTicket = replyTicket;
// Helper to check staff permissions for tickets
const checkStaffTicketPermission = async (role, permissionCode) => {
    const userRole = await db_1.default.Role.findOne({ name: role }).lean();
    if (!userRole)
        return false;
    const perm = await db_1.default.Permission.findOne({ code: permissionCode }).lean();
    if (!perm)
        return false;
    const rolePerm = await db_1.default.RolePermission.findOne({
        roleId: userRole._id,
        permissionId: perm._id
    }).lean();
    return !!rolePerm;
};
// Admin / Staff: List tickets
const listAdminTickets = async (req, res) => {
    const { tenantId, role, id: userId } = req.user;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const isFullAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
        let whereClause = { tenantId };
        if (!isFullAdmin) {
            const hasAccess = await checkStaffTicketPermission(role, 'ACCESS_TICKETS');
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await checkStaffTicketPermission(role, 'VIEW_ALL_TICKETS');
            const hasViewOwn = await checkStaffTicketPermission(role, 'VIEW_OWN_TICKETS');
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                const ownClients = await db_1.default.Client.find({ createdById: userId }).select('_id').lean();
                whereClause.clientId = { $in: ownClients.map(c => c._id) };
            }
        }
        const tickets = await db_1.default.SupportTicket.find(whereClause)
            .populate({
            path: 'clientId',
            select: 'name email mobile status'
        })
            .populate('messages')
            .sort({ updatedAt: -1 })
            .lean();
        const formattedTickets = tickets.map((t) => {
            const client = t.clientId || t.client;
            return {
                ...t,
                id: t._id?.toString() || t.id,
                client: client ? {
                    name: client.name,
                    email: client.email,
                    mobile: client.mobile,
                    status: client.status
                } : null,
                _count: {
                    messages: Array.isArray(t.messages) ? t.messages.length : 0
                }
            };
        });
        return res.status(200).json({ success: true, data: formattedTickets });
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
        let whereClause = { _id: id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await checkStaffTicketPermission(role, 'ACCESS_TICKETS');
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await checkStaffTicketPermission(role, 'VIEW_ALL_TICKETS');
            const hasViewOwn = await checkStaffTicketPermission(role, 'VIEW_OWN_TICKETS');
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to view tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                const ownClients = await db_1.default.Client.find({ createdById: userId }).select('_id').lean();
                whereClause.clientId = { $in: ownClients.map(c => c._id) };
            }
        }
        const ticket = await db_1.default.SupportTicket.findOne(whereClause)
            .populate({
            path: 'clientId',
            select: 'name email mobile status'
        })
            .populate({
            path: 'messages',
            options: { sort: { createdAt: 1 } },
            populate: {
                path: 'senderId',
                select: 'firstName lastName roleId',
                populate: { path: 'role', select: 'name' }
            }
        })
            .lean();
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        const client = ticket.clientId || ticket.client;
        const formattedMessages = (ticket.messages || []).map((m) => {
            const sender = m.senderId || m.sender || {};
            return {
                ...m,
                id: m._id?.toString() || m.id,
                sender: {
                    firstName: sender.firstName,
                    lastName: sender.lastName,
                    role: sender.role ? { name: sender.role.name } : null
                }
            };
        });
        return res.status(200).json({
            success: true,
            data: {
                ...ticket,
                id: ticket._id?.toString() || ticket.id,
                client: client ? {
                    name: client.name,
                    email: client.email,
                    mobile: client.mobile,
                    status: client.status
                } : null,
                messages: formattedMessages
            }
        });
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
        let ticketWhere = { _id: id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await checkStaffTicketPermission(role, 'ACCESS_TICKETS');
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await checkStaffTicketPermission(role, 'VIEW_ALL_TICKETS');
            const hasViewOwn = await checkStaffTicketPermission(role, 'VIEW_OWN_TICKETS');
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to reply to tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                const ownClients = await db_1.default.Client.find({ createdById: userId }).select('_id').lean();
                ticketWhere.clientId = { $in: ownClients.map(c => c._id) };
            }
        }
        const ticket = await db_1.default.SupportTicket.findOne(ticketWhere);
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        if (ticket.status === 'CLOSED')
            return res.status(400).json({ success: false, message: 'Ticket is closed.' });
        const reply = await db_1.default.TicketMessage.create({
            ticketId: ticket._id,
            senderId: userId,
            message,
            attachmentUrl
        });
        // Mark as OPEN on Admin/Staff reply
        await db_1.default.SupportTicket.findByIdAndUpdate(ticket._id, {
            $set: { status: 'OPEN', updatedAt: new Date() }
        });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'TICKETS',
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Reply sent and ticket status updated to OPEN.',
            data: {
                ...reply.toObject(),
                id: reply._id.toString()
            }
        });
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
        let ticketWhere = { _id: id, tenantId };
        if (!isFullAdmin) {
            const hasAccess = await checkStaffTicketPermission(role, 'ACCESS_TICKETS');
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access tickets.' });
            }
            const hasViewAll = await checkStaffTicketPermission(role, 'VIEW_ALL_TICKETS');
            const hasViewOwn = await checkStaffTicketPermission(role, 'VIEW_OWN_TICKETS');
            if (!hasViewAll && !hasViewOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to close tickets.' });
            }
            if (!hasViewAll && hasViewOwn) {
                const ownClients = await db_1.default.Client.find({ createdById: userId }).select('_id').lean();
                ticketWhere.clientId = { $in: ownClients.map(c => c._id) };
            }
        }
        const ticket = await db_1.default.SupportTicket.findOne(ticketWhere);
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        await db_1.default.SupportTicket.findByIdAndUpdate(ticket._id, {
            $set: { status: 'CLOSED', updatedAt: new Date() }
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
