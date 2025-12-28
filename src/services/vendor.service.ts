import mongoose from 'mongoose';

import User, { VendorStatus } from '../models/User.model';
import VendorVerification from '../models/VendorVerification.model';
import ApiError from '../utils/apiError';
import { approveVendor, rejectVendor } from './auth.service';

interface ListVendorsOptions {
  status?: VendorStatus | 'all';
  search?: string;
  limit?: number;
}

export const listVendors = async ({ status = 'all', search, limit = 100 }: ListVendorsOptions = {}) => {
  // Include users who are vendors OR have a vendorStatus (pending applications from customers)
  const baseConditions: mongoose.FilterQuery<typeof User>[] = [
    {
      $or: [
        { role: 'vendor' },
        { vendorStatus: { $exists: true, $ne: null } }, // Users with vendorStatus set (pending applications)
      ],
    },
    { isDeleted: false },
  ];

  if (status !== 'all') {
    baseConditions.push({ vendorStatus: status });
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    baseConditions.push({
      $or: [
        { name: regex },
        { businessName: regex },
        { gstNumber: regex },
        { email: regex },
        { phone: regex },
      ],
    });
  }

  const query: mongoose.FilterQuery<typeof User> =
    baseConditions.length > 0 ? { $and: baseConditions } : {};

  const vendors = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      'name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt businessAddress meta',
    )
    .lean();

  const ids = vendors.map((v: any) => v._id);
  const verifications = await VendorVerification.find({ userId: { $in: ids } })
    .select('userId status submittedAt documents reviewedAt adminNotes')
    .lean();

  const verificationMap = new Map<string, any>(
    verifications.map((v: any) => [v.userId.toString(), v]),
  );

  return vendors.map((vendor: any) => {
    const verification = verificationMap.get(vendor._id.toString());
    return {
      ...vendor,
      _id: vendor._id.toString(),
      verification: verification
        ? {
            status: verification.status,
            submittedAt: verification.submittedAt,
            reviewedAt: verification.reviewedAt,
            adminNotes: verification.adminNotes,
            documents: verification.documents || [],
          }
        : null,
    };
  });
};

export const approveVendorByAdmin = async (vendorId: string, adminId: string) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new ApiError(400, 'Invalid vendor identifier');
  }

  const vendor = await User.findById(vendorId);
  // Allow approval for users who are vendors OR have a vendorStatus (pending applications)
  if (!vendor || (vendor.role !== 'vendor' && !vendor.vendorStatus)) {
    throw new ApiError(404, 'Vendor not found');
  }

  if (vendor.vendorStatus === 'active') {
    return vendor;
  }

  await approveVendor(vendorId, adminId);
  return User.findById(vendorId)
    .select(
      'name email phone businessName gstNumber vendorStatus createdAt updatedAt businessAddress meta documents',
    )
    .lean();
};

export const rejectVendorByAdmin = async (vendorId: string, adminId: string, reason?: string) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new ApiError(400, 'Invalid vendor identifier');
  }

  const vendor = await User.findById(vendorId);
  // Allow rejection for users who are vendors OR have a vendorStatus (pending applications)
  if (!vendor || (vendor.role !== 'vendor' && !vendor.vendorStatus)) {
    throw new ApiError(404, 'Vendor not found');
  }

  if (vendor.vendorStatus === 'rejected') {
    return vendor;
  }

  await rejectVendor(vendorId, adminId, reason);
  return User.findById(vendorId)
    .select(
      'name email phone businessName gstNumber vendorStatus createdAt updatedAt businessAddress meta documents',
    )
    .lean();
};


