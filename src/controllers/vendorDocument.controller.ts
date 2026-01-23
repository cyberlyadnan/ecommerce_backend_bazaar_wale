import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

import ApiError from '../utils/apiError';
import User from '../models/User.model';
import VendorVerification, { VendorDocument } from '../models/VendorVerification.model';
import { getUploadRoot } from '../utils/upload';

/**
 * Security: Verify that the requesting user has permission to access the vendor's documents
 * - Admin: Can access any vendor's documents
 * - Vendor: Can only access their own documents
 */
async function verifyDocumentAccess(
  req: Request,
  vendorId: string,
): Promise<{ verification: any; vendor: any }> {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Validate vendorId format
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new ApiError(400, 'Invalid vendor ID');
  }

  // Admin can access any vendor's documents
  if (req.user.role === 'admin') {
    const vendor = await User.findById(vendorId)
      .select('_id role isDeleted')
      .lean();

    if (!vendor || vendor.isDeleted || vendor.role !== 'vendor') {
      throw new ApiError(404, 'Vendor not found');
    }

    const verification = await VendorVerification.findOne({ userId: vendorId })
      .select('documents userId')
      .lean();

    return { verification, vendor };
  }

  // Vendor can only access their own documents
  if (req.user.role === 'vendor') {
    // Ensure vendor is accessing their own documents
    if (req.user._id.toString() !== vendorId) {
      throw new ApiError(403, 'You can only access your own documents');
    }

    const verification = await VendorVerification.findOne({ userId: req.user._id })
      .select('documents userId')
      .lean();

    if (!verification) {
      throw new ApiError(404, 'No verification documents found');
    }

    return { verification, vendor: req.user };
  }

  throw new ApiError(403, 'You do not have permission to access vendor documents');
}

/**
 * Get all documents for a vendor (Admin endpoint)
 * GET /api/admin/vendors/:vendorId/documents
 * 
 * Security:
 * - Requires admin authentication
 * - Returns document metadata (not file contents)
 */
export const getVendorDocumentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { vendorId } = req.params;

    const { verification } = await verifyDocumentAccess(req, vendorId);

    if (!verification || !verification.documents || verification.documents.length === 0) {
      return res.json({
        success: true,
        documents: [],
      });
    }

    // Return document metadata with secure access URLs
    // Frontend should use these document IDs to fetch files via secure endpoint
    const documents = verification.documents.map((doc: VendorDocument) => ({
      _id: doc._id?.toString() || null,
      type: doc.type || 'document',
      fileName: doc.fileName || 'Unknown file',
      // Return secure API endpoint instead of direct file URL
      accessUrl: doc._id
        ? `/api/vendor/documents/${doc._id.toString()}/file`
        : null,
      // Include legacy URL for backward compatibility (will be deprecated)
      legacyUrl: doc.url || null,
    }));

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific document by ID (Vendor endpoint)
 * GET /api/vendor/documents/:documentId
 * 
 * Security:
 * - Requires vendor authentication
 * - Vendor can only access their own documents
 */
export const getVendorDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError(403, 'Vendor access required');
    }

    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new ApiError(400, 'Invalid document ID');
    }

    // Find document in vendor's verification
    const verification = await VendorVerification.findOne({
      userId: req.user._id,
      'documents._id': new mongoose.Types.ObjectId(documentId),
    })
      .select('documents')
      .lean();

    if (!verification || !verification.documents) {
      throw new ApiError(404, 'Document not found');
    }

    const document = verification.documents.find(
      (doc: any) => doc._id?.toString() === documentId,
    );

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    res.json({
      success: true,
      document: {
        _id: document._id?.toString() || null,
        type: document.type || 'document',
        fileName: document.fileName || 'Unknown file',
        accessUrl: `/api/vendor/documents/${documentId}/file`,
        legacyUrl: document.url || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream a document file securely
 * GET /api/vendor/documents/:documentId/file
 * GET /api/admin/vendors/:vendorId/documents/:documentId/file
 * 
 * Security:
 * - Validates JWT authentication
 * - Checks role (admin or vendor)
 * - Verifies ownership for vendors
 * - Streams file securely without exposing file system paths
 */
export const streamVendorDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { documentId, vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new ApiError(400, 'Invalid document ID');
    }

    let verification: any;
    let document: any;

    // Admin endpoint: /api/admin/vendors/:vendorId/documents/:documentId/file
    if (vendorId && req.user?.role === 'admin') {
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new ApiError(400, 'Invalid vendor ID');
      }

      verification = await VendorVerification.findOne({
        userId: vendorId,
        'documents._id': new mongoose.Types.ObjectId(documentId),
      })
        .select('documents userId')
        .lean();

      if (!verification) {
        throw new ApiError(404, 'Document not found');
      }

      document = verification.documents.find(
        (doc: any) => doc._id?.toString() === documentId,
      );
    }
    // Vendor endpoint: /api/vendor/documents/:documentId/file
    else if (req.user?.role === 'vendor') {
      verification = await VendorVerification.findOne({
        userId: req.user._id,
        'documents._id': new mongoose.Types.ObjectId(documentId),
      })
        .select('documents userId')
        .lean();

      if (!verification) {
        throw new ApiError(404, 'Document not found');
      }

      document = verification.documents.find(
        (doc: any) => doc._id?.toString() === documentId,
      );
    } else {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Security: Prefer filePath over legacy URL
    // filePath is stored relative to uploads root and points to private folder
    const filePath = document.filePath || document.url;

    if (!filePath) {
      throw new ApiError(404, 'Document file not found');
    }

    // Resolve file path securely
    // If filePath is a relative path (starts with vendor-documents/), resolve from uploads root
    // If it's an absolute URL (legacy), we can't serve it securely - return error
    let absolutePath: string;

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Legacy URL - cannot serve securely
      // In production, you might want to migrate these files
      throw new ApiError(400, 'Legacy document URL detected. Please contact administrator.');
    } else if (filePath.startsWith('vendor-documents/') || filePath.startsWith('/vendor-documents/')) {
      // Relative path in private folder
      const cleanPath = filePath.replace(/^\/+/, ''); // Remove leading slashes
      absolutePath = path.resolve(getUploadRoot(), cleanPath);
    } else {
      // Assume it's relative to uploads root
      const cleanPath = filePath.replace(/^\/+/, ''); // Remove leading slashes
      absolutePath = path.resolve(getUploadRoot(), cleanPath);
    }

    // Security: Prevent directory traversal attacks
    // Ensure the resolved path is within the uploads directory
    const uploadRoot = path.resolve(getUploadRoot());
    const normalizedPath = path.normalize(absolutePath);

    if (!normalizedPath.startsWith(uploadRoot)) {
      throw new ApiError(403, 'Invalid file path');
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      throw new ApiError(404, 'Document file not found on server');
    }

    // Security: Verify it's a file (not a directory)
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      throw new ApiError(403, 'Invalid file path');
    }

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName || 'document'}"`);
    
    // Security: Prevent caching of sensitive documents
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream the file
    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('[Document Stream] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading document file' });
      }
    });
  } catch (error) {
    next(error);
  }
};
