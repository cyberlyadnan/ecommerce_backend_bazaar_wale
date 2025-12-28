import ShippingConfig from '../models/ShippingConfig.model';
import mongoose from 'mongoose';

export type ShippingConfigDto = {
  isEnabled: boolean;
  flatRate: number;
  freeShippingThreshold: number;
  updatedAt?: Date;
};

export async function getOrCreateShippingConfig() {
  const config = await ShippingConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true },
  ).lean();

  return config;
}

export async function getShippingConfigDto(): Promise<ShippingConfigDto> {
  const cfg: any = await getOrCreateShippingConfig();
  return {
    isEnabled: Boolean(cfg.isEnabled),
    flatRate: Number(cfg.flatRate ?? 0),
    freeShippingThreshold: Number(cfg.freeShippingThreshold ?? 0),
    updatedAt: cfg.updatedAt,
  };
}

export async function updateShippingConfig(
  input: { isEnabled: boolean; flatRate: number; freeShippingThreshold: number },
  updatedBy?: string,
) {
  const updatedByObjectId =
    updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)
      ? new mongoose.Types.ObjectId(updatedBy)
      : undefined;

  const updated = await ShippingConfig.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        isEnabled: input.isEnabled,
        flatRate: input.flatRate,
        freeShippingThreshold: input.freeShippingThreshold,
        ...(updatedByObjectId ? { updatedBy: updatedByObjectId } : {}),
      },
    },
    { new: true, upsert: true },
  ).lean();

  return {
    isEnabled: Boolean(updated?.isEnabled),
    flatRate: Number(updated?.flatRate ?? 0),
    freeShippingThreshold: Number(updated?.freeShippingThreshold ?? 0),
    updatedAt: updated?.updatedAt,
  } as ShippingConfigDto;
}


