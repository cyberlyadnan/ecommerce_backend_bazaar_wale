"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContactHandler = exports.updateContactHandler = exports.getContactHandler = exports.listContactsHandler = exports.createContactHandler = void 0;
const contactService = __importStar(require("../services/contact.service"));
const createContactHandler = async (req, res, next) => {
    try {
        const metadata = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        };
        const contact = await contactService.createContact({
            ...req.body,
            metadata,
        });
        res.status(201).json({
            message: 'Your inquiry has been submitted successfully. We will get back to you soon.',
            contact,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createContactHandler = createContactHandler;
const listContactsHandler = async (req, res, next) => {
    try {
        const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
        const status = statusParam && ['new', 'read', 'replied', 'closed'].includes(statusParam)
            ? statusParam
            : undefined;
        const limit = typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
            ? Number.parseInt(req.query.limit, 10)
            : undefined;
        const skip = typeof req.query.skip === 'string' && !Number.isNaN(Number.parseInt(req.query.skip, 10))
            ? Number.parseInt(req.query.skip, 10)
            : undefined;
        const result = await contactService.listContacts({ status, limit, skip });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.listContactsHandler = listContactsHandler;
const getContactHandler = async (req, res, next) => {
    try {
        const contact = await contactService.getContactById(req.params.contactId);
        res.json({ contact });
    }
    catch (error) {
        next(error);
    }
};
exports.getContactHandler = getContactHandler;
const updateContactHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const contact = await contactService.updateContact(req.params.contactId, req.body, req.user._id.toString());
        res.json({
            message: 'Contact query updated successfully',
            contact,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateContactHandler = updateContactHandler;
const deleteContactHandler = async (req, res, next) => {
    try {
        const result = await contactService.deleteContact(req.params.contactId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContactHandler = deleteContactHandler;
