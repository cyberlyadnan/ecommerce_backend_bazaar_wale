import mongoose from 'mongoose';
import CommissionConfig from '../models/CommissionConfig.model';

export async function getCommissionPercent(): Promise<number> {
  const cfg: any = await CommissionConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true },
  ).lean();

  return Number(cfg?.commissionPercent ?? 0);
}

export async function setCommissionPercent(commissionPercent: number, updatedBy?: string) {
  const updatedByObjectId =
    updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)
      ? new mongoose.Types.ObjectId(updatedBy)
      : undefined;

  const cfg: any = await CommissionConfig.findOneAndUpdate(
    { key: 'default' },
    { $set: { commissionPercent, ...(updatedByObjectId ? { updatedBy: updatedByObjectId } : {}) } },
    { new: true, upsert: true },
  ).lean();

  return Number(cfg?.commissionPercent ?? 0);
}


