import mongoose from 'mongoose';

import ApiError from '../utils/apiError';
import User from '../models/User.model';
import VendorVerification from '../models/VendorVerification.model';

export async function getVendorProfileWithDocs(vendorId: string) {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new ApiError(400, 'Invalid vendor id');
  }

  const user: any = await User.findById(vendorId)
    .select(
      'role name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt isDeleted meta',
    )
    .lean();

  if (!user || user.isDeleted || user.role !== 'vendor') {
    throw new ApiError(404, 'Vendor not found');
  }

  const verification: any = await VendorVerification.findOne({ userId: user._id })
    .select('status submittedAt reviewedAt adminNotes documents')
    .lean();

  // Security: Transform documents to return secure access URLs instead of direct file URLs
  // Documents with filePath are stored securely and must be accessed via API
  const transformDocuments = (docs: any[]) => {
    if (!Array.isArray(docs)) return [];
    
    return docs.map((doc: any) => ({
      _id: doc._id?.toString() || null,
      type: doc.type || 'document',
      fileName: doc.fileName || 'Unknown file',
      // Return secure API endpoint for documents with filePath
      // Frontend should use this endpoint to access files securely
      accessUrl: doc._id && (doc.filePath || doc.url)
        ? `/api/vendor/documents/${doc._id.toString()}/file`
        : null,
      // Legacy URL - kept for backward compatibility but should not be used for new uploads
      legacyUrl: doc.url && !doc.filePath ? doc.url : null,
      // Internal fields (not exposed to frontend for security)
      // filePath is not returned to prevent path disclosure
    }));
  };

  return {
    vendor: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      businessName: user.businessName,
      gstNumber: user.gstNumber,
      aadharNumber: user.aadharNumber,
      panNumber:
        user.panNumber || (typeof user?.meta?.panNumber === 'string' ? user.meta.panNumber : undefined),
      vendorStatus: user.vendorStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    verification: verification
      ? {
          status: verification.status,
          submittedAt: verification.submittedAt,
          reviewedAt: verification.reviewedAt,
          adminNotes: verification.adminNotes,
          // Security: Return transformed documents with secure access URLs
          documents: transformDocuments(verification.documents || []),
        }
      : null,
  };
}

export async function updateVendorBasicProfile(vendorId: string, input: { name?: string }) {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new ApiError(400, 'Invalid vendor id');
  }

  const update: any = {};
  if (typeof input.name === 'string') {
    const trimmed = input.name.trim();
    if (trimmed.length < 2) throw new ApiError(400, 'Name must be at least 2 characters');
    update.name = trimmed;
  }

  const updated: any = await User.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(vendorId), role: 'vendor', isDeleted: false },
    { $set: update },
    { new: true },
  )
    .select('name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt meta')
    .lean();

  if (!updated) {
    throw new ApiError(404, 'Vendor not found');
  }

  return {
    _id: updated._id.toString(),
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    businessName: updated.businessName,
    gstNumber: updated.gstNumber,
    aadharNumber: updated.aadharNumber,
    panNumber:
      updated.panNumber ||
      (typeof updated?.meta?.panNumber === 'string' ? updated.meta.panNumber : undefined),
    vendorStatus: updated.vendorStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}


