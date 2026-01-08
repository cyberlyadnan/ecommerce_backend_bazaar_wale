import express from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import {
  getUserAddressesHandler,
  addAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
  setDefaultAddressHandler,
  validateAddress,
} from '../controllers/address.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate());

// Get all addresses
router.get('/', getUserAddressesHandler);

// Add new address
router.post('/', validateAddress, addAddressHandler);

// Update address by index
router.put('/:index', validateAddress, updateAddressHandler);

// Delete address by index
router.delete('/:index', deleteAddressHandler);

// Set address as default
router.patch('/:index/default', setDefaultAddressHandler);

export default router;
