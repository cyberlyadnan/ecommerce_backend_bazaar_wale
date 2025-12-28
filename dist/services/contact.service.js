"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContact = exports.updateContact = exports.getContactById = exports.listContacts = exports.createContact = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Contact_model_1 = __importDefault(require("../models/Contact.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const email_1 = require("../utils/email");
const config_1 = __importDefault(require("../config"));
const createContact = async (input) => {
    const contact = await Contact_model_1.default.create({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim(),
        subject: input.subject.trim(),
        message: input.message.trim(),
        metadata: input.metadata,
        status: 'new',
    });
    // Send confirmation email to the user
    try {
        await (0, email_1.sendMail)({
            to: contact.email,
            subject: `Thank you for contacting us - ${contact.subject}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #4f46e5; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Contacting Us</h1>
            </div>
            <div class="content">
              <p>Dear ${contact.name},</p>
              <p>We have received your inquiry and our team will get back to you soon.</p>
              <div class="message-box">
                <p><strong>Subject:</strong> ${contact.subject}</p>
                <p><strong>Your Message:</strong></p>
                <p>${contact.message.replace(/\n/g, '<br>')}</p>
              </div>
              <p>We typically respond within 24-48 hours. If your inquiry is urgent, please call us directly.</p>
              <p>Best regards,<br>${config_1.default.mail.fromName}</p>
            </div>
            <div class="footer">
              <p>This is an automated confirmation email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
Thank you for contacting us, ${contact.name}!

We have received your inquiry:
Subject: ${contact.subject}

Your Message:
${contact.message}

We typically respond within 24-48 hours. If your inquiry is urgent, please call us directly.

Best regards,
${config_1.default.mail.fromName}
      `,
        });
    }
    catch (error) {
        // Log error but don't fail the contact creation
        console.error('Failed to send confirmation email:', error);
    }
    return contact.toObject();
};
exports.createContact = createContact;
const listContacts = async (options) => {
    const query = {};
    if (options?.status) {
        query.status = options.status;
    }
    const limit = options?.limit ? Math.min(Math.max(options.limit, 1), 100) : 50;
    const skip = options?.skip || 0;
    const contacts = await Contact_model_1.default.find(query)
        .populate('respondedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
    const total = await Contact_model_1.default.countDocuments(query);
    return {
        contacts: contacts.map((contact) => ({
            ...contact,
            _id: contact._id.toString(),
            respondedBy: contact.respondedBy
                ? {
                    ...contact.respondedBy,
                    _id: contact.respondedBy._id.toString(),
                }
                : null,
        })),
        total,
    };
};
exports.listContacts = listContacts;
const getContactById = async (contactId) => {
    const contact = await Contact_model_1.default.findById(contactId)
        .populate('respondedBy', 'name email')
        .lean();
    if (!contact) {
        throw new apiError_1.default(404, 'Contact query not found');
    }
    return {
        ...contact,
        _id: contact._id.toString(),
        respondedBy: contact.respondedBy
            ? {
                ...contact.respondedBy,
                _id: contact.respondedBy._id.toString(),
            }
            : null,
    };
};
exports.getContactById = getContactById;
const updateContact = async (contactId, input, adminId) => {
    const contact = await Contact_model_1.default.findById(contactId);
    if (!contact) {
        throw new apiError_1.default(404, 'Contact query not found');
    }
    if (input.status) {
        contact.status = input.status;
    }
    if (input.adminResponse !== undefined) {
        contact.adminResponse = input.adminResponse.trim();
        contact.respondedBy = new mongoose_1.default.Types.ObjectId(adminId);
        contact.respondedAt = new Date();
        contact.status = 'replied';
        // Send response email to the user
        try {
            await (0, email_1.sendMail)({
                to: contact.email,
                subject: `Re: ${contact.subject}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .response-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
              .original-box { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Response to Your Inquiry</h1>
              </div>
              <div class="content">
                <p>Dear ${contact.name},</p>
                <p>Thank you for contacting us. Here is our response to your inquiry:</p>
                <div class="response-box">
                  <p>${contact.adminResponse.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="original-box">
                  <p><strong>Your Original Message:</strong></p>
                  <p><strong>Subject:</strong> ${contact.subject}</p>
                  <p>${contact.message.replace(/\n/g, '<br>')}</p>
                </div>
                <p>If you have any further questions, please don't hesitate to contact us again.</p>
                <p>Best regards,<br>${config_1.default.mail.fromName}</p>
              </div>
              <div class="footer">
                <p>This is an automated response email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
          </html>
        `,
                text: `
Dear ${contact.name},

Thank you for contacting us. Here is our response to your inquiry:

${contact.adminResponse}

Your Original Message:
Subject: ${contact.subject}
${contact.message}

If you have any further questions, please don't hesitate to contact us again.

Best regards,
${config_1.default.mail.fromName}
        `,
            });
        }
        catch (error) {
            // Log error but don't fail the update
            console.error('Failed to send response email:', error);
        }
    }
    await contact.save();
    return contact.toObject();
};
exports.updateContact = updateContact;
const deleteContact = async (contactId) => {
    const contact = await Contact_model_1.default.findByIdAndDelete(contactId);
    if (!contact) {
        throw new apiError_1.default(404, 'Contact query not found');
    }
    return { message: 'Contact query deleted successfully' };
};
exports.deleteContact = deleteContact;
