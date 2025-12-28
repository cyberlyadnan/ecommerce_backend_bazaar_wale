import { NextFunction, Request, Response } from 'express';

import * as contactService from '../services/contact.service';

export const createContactHandler = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
  }
};

export const listContactsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : undefined;
    const skip =
      typeof req.query.skip === 'string' && !Number.isNaN(Number.parseInt(req.query.skip, 10))
        ? Number.parseInt(req.query.skip, 10)
        : undefined;

    const result = await contactService.listContacts({ status, limit, skip });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getContactHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await contactService.getContactById(req.params.contactId);
    res.json({ contact });
  } catch (error) {
    next(error);
  }
};

export const updateContactHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const contact = await contactService.updateContact(
      req.params.contactId,
      req.body,
      req.user._id.toString(),
    );

    res.json({
      message: 'Contact query updated successfully',
      contact,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContactHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contactService.deleteContact(req.params.contactId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

