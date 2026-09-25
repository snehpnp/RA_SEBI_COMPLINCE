import { Response } from 'express';
import dynamicDb from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

const DEFAULT_FAQS = [
  {
    question: 'How to read risk-reward ratio in signals?',
    answer: 'A risk-reward ratio measures the expected return against potential loss. For example, a 1:2 risk-reward means you risk ₹1 to potentially gain ₹2. All research signals provide defined Stop Loss (SL) and Target (TGT) levels to help you calculate position size accordingly.',
    category: 'Signals & Trading',
    order: 1
  },
  {
    question: 'What is the difference between Swing and Positional trades?',
    answer: 'Swing trades are designed to capture short-term price momentum typically held from a few days to 2-3 weeks. Positional trades have a longer horizon ranging from several weeks to multiple months, aimed at capturing larger underlying market trends.',
    category: 'Signals & Trading',
    order: 2
  },
  {
    question: 'How can I upgrade or renew my subscription plan?',
    answer: 'You can navigate to the Plans section in your Client Portal, review available research advisory packages, and select "Subscribe" or "Upgrade". Payment is processed securely with immediate receipt generation and contract signing.',
    category: 'Subscription & Billing',
    order: 3
  },
  {
    question: 'Is there any refund policy for advisory subscriptions?',
    answer: 'Under SEBI Research Analyst regulations, subscriptions are governed by the terms specified in your Signed Client Advisory Agreement. Fees once paid are generally non-refundable once recommendations have been delivered, except as specified in regulatory guidelines.',
    category: 'Compliance & Legal',
    order: 4
  },
  {
    question: 'How do I raise a support ticket or grievance?',
    answer: 'In the Support section of your portal, click on "Create Ticket", select the query category, and describe your query. Our dedicated advisory compliance desk will review and respond directly within statutory turnaround times.',
    category: 'Support & Grievances',
    order: 5
  }
];

/**
 * Public/Client FAQ endpoint (fetches active FAQs for tenant)
 */
export const getPublicFaqs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context is missing.' });
    }

    let faqs = await dynamicDb.Faq.find({ tenantId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Auto-seed default FAQs if tenant has no FAQs yet
    if (faqs.length === 0) {
      const defaultDocs = DEFAULT_FAQS.map(item => ({
        ...item,
        tenantId,
        isActive: true
      }));
      await dynamicDb.Faq.insertMany(defaultDocs);
      faqs = await dynamicDb.Faq.find({ tenantId, isActive: true })
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: faqs.map((f: any) => ({
        id: String(f._id || f.id),
        question: f.question,
        answer: f.answer,
        category: f.category || 'General',
        order: f.order ?? 0,
        createdAt: f.createdAt
      }))
    });
  } catch (error: any) {
    console.error('getPublicFaqs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      errors: [error.message]
    });
  }
};

/**
 * Admin FAQ list (fetches all FAQs with status)
 */
export const getAdminFaqs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context is missing.' });
    }

    const { search, category } = req.query as { search?: string; category?: string };
    const filter: any = { tenantId };

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { question: { $regex: s, $options: 'i' } },
        { answer: { $regex: s, $options: 'i' } }
      ];
    }

    if (category && category.trim() && category !== 'ALL') {
      filter.category = category.trim();
    }

    let faqs = await dynamicDb.Faq.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Auto-seed default FAQs if completely empty for this tenant
    const totalCount = await dynamicDb.Faq.countDocuments({ tenantId });
    if (totalCount === 0) {
      const defaultDocs = DEFAULT_FAQS.map(item => ({
        ...item,
        tenantId,
        isActive: true
      }));
      await dynamicDb.Faq.insertMany(defaultDocs);
      faqs = await dynamicDb.Faq.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: faqs.map((f: any) => ({
        id: String(f._id || f.id),
        question: f.question,
        answer: f.answer,
        category: f.category || 'General',
        order: f.order ?? 0,
        isActive: f.isActive ?? true,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }))
    });
  } catch (error: any) {
    console.error('getAdminFaqs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      errors: [error.message]
    });
  }
};

/**
 * Admin Create FAQ
 */
export const createFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context is missing.' });
    }

    const { question, answer, category, order, isActive } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }
    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, message: 'Answer is required.' });
    }

    const newFaq = await dynamicDb.Faq.create({
      tenantId,
      question: question.trim(),
      answer: answer.trim(),
      category: category ? category.trim() : 'General',
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'SETTINGS',
      newValue: JSON.stringify({ id: newFaq._id, question: newFaq.question }),
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'FAQ created successfully.',
      data: {
        id: String(newFaq._id || newFaq.id),
        question: newFaq.question,
        answer: newFaq.answer,
        category: newFaq.category,
        order: newFaq.order,
        isActive: newFaq.isActive,
        createdAt: newFaq.createdAt
      }
    });
  } catch (error: any) {
    console.error('createFaq error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      errors: [error.message]
    });
  }
};

/**
 * Admin Update FAQ
 */
export const updateFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context is missing.' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'FAQ ID is required.' });
    }

    const existingFaq = await dynamicDb.Faq.findOne({ _id: id, tenantId });
    if (!existingFaq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    const { question, answer, category, order, isActive } = req.body;
    const updates: any = {};

    if (question !== undefined) {
      if (!question.trim()) return res.status(400).json({ success: false, message: 'Question cannot be empty.' });
      updates.question = question.trim();
    }
    if (answer !== undefined) {
      if (!answer.trim()) return res.status(400).json({ success: false, message: 'Answer cannot be empty.' });
      updates.answer = answer.trim();
    }
    if (category !== undefined) updates.category = category.trim();
    if (order !== undefined) updates.order = Number(order) || 0;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updatedFaq = await dynamicDb.Faq.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!updatedFaq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'SETTINGS',
      oldValue: JSON.stringify({ question: existingFaq.question, isActive: existingFaq.isActive }),
      newValue: JSON.stringify({ question: updatedFaq.question, isActive: updatedFaq.isActive }),
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'FAQ updated successfully.',
      data: {
        id: String(updatedFaq._id || updatedFaq.id),
        question: updatedFaq.question,
        answer: updatedFaq.answer,
        category: updatedFaq.category,
        order: updatedFaq.order,
        isActive: updatedFaq.isActive,
        updatedAt: updatedFaq.updatedAt
      }
    });
  } catch (error: any) {
    console.error('updateFaq error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update FAQ',
      errors: [error.message]
    });
  }
};

/**
 * Admin Delete FAQ
 */
export const deleteFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context is missing.' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'FAQ ID is required.' });
    }

    const existingFaq = await dynamicDb.Faq.findOne({ _id: id, tenantId });
    if (!existingFaq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    await dynamicDb.Faq.findByIdAndDelete(id);

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'SETTINGS',
      oldValue: JSON.stringify({ id: existingFaq._id, question: existingFaq.question }),
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully.'
    });
  } catch (error: any) {
    console.error('deleteFaq error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ',
      errors: [error.message]
    });
  }
};
