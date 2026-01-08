import User, { Address } from '../models/User.model';
import ApiError from '../utils/apiError';

/**
 * Get all addresses for a user
 */
export const getUserAddresses = async (userId: string): Promise<Address[]> => {
  const user = await User.findById(userId).select('addresses');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user.addresses || [];
};

/**
 * Add a new address for a user
 */
export const addUserAddress = async (
  userId: string,
  address: Omit<Address, 'isDefault'> & { isDefault?: boolean },
): Promise<Address[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // If this is the first address or user wants it as default, set as default
  const isFirstAddress = !user.addresses || user.addresses.length === 0;
  const isDefault = address.isDefault !== undefined ? address.isDefault : isFirstAddress;

  // If setting as default, unset all other defaults
  if (isDefault) {
    user.addresses = user.addresses.map((addr) => ({
      ...addr,
      isDefault: false,
    }));
  }

  // Add new address
  const newAddress: Address = {
    ...address,
    isDefault,
  };

  // Ensure addresses array exists
  if (!user.addresses) {
    user.addresses = [];
  }

  user.addresses.push(newAddress);
  
  // Mark addresses array as modified to ensure Mongoose detects the change
  user.markModified('addresses');
  await user.save();

  return user.addresses;
};

/**
 * Update an address by index
 */
export const updateUserAddress = async (
  userId: string,
  addressIndex: number,
  updates: Partial<Address>,
): Promise<Address[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.addresses || addressIndex < 0 || addressIndex >= user.addresses.length) {
    throw new ApiError(404, 'Address not found');
  }

  // If setting as default, unset all other defaults
  if (updates.isDefault === true) {
    user.addresses = user.addresses.map((addr, idx) => ({
      ...addr,
      isDefault: idx === addressIndex,
    }));
  } else {
    // Update the specific address
    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      ...updates,
    };
  }

  user.markModified('addresses');
  await user.save();
  return user.addresses;
};

/**
 * Delete an address by index
 */
export const deleteUserAddress = async (
  userId: string,
  addressIndex: number,
): Promise<Address[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.addresses || addressIndex < 0 || addressIndex >= user.addresses.length) {
    throw new ApiError(404, 'Address not found');
  }

  // Remove the address
  user.addresses.splice(addressIndex, 1);

  // If we deleted the default address and there are other addresses, set the first one as default
  if (user.addresses.length > 0 && !user.addresses.some((addr) => addr.isDefault)) {
    user.addresses[0].isDefault = true;
  }

  user.markModified('addresses');
  await user.save();
  return user.addresses;
};

/**
 * Set an address as default
 */
export const setDefaultAddress = async (
  userId: string,
  addressIndex: number,
): Promise<Address[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.addresses || addressIndex < 0 || addressIndex >= user.addresses.length) {
    throw new ApiError(404, 'Address not found');
  }

  // Unset all defaults
  user.addresses = user.addresses.map((addr, idx) => ({
    ...addr,
    isDefault: idx === addressIndex,
  }));

  user.markModified('addresses');
  await user.save();
  return user.addresses;
};
