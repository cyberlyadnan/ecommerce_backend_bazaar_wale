"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectVendorHandler = exports.approveVendorHandler = exports.listVendorsHandler = void 0;
const vendor_service_1 = require("../services/vendor.service");
const listVendorsHandler = async (req, res, next) => {
    try {
        const statusParam = req.query.status === 'all' ? 'all' : req.query.status;
        const status = statusParam === 'pending' ||
            statusParam === 'active' ||
            statusParam === 'rejected' ||
            statusParam === 'suspended'
            ? statusParam
            : 'all';
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const vendors = await (0, vendor_service_1.listVendors)({
            status,
            search,
        });
        res.json({ vendors });
    }
    catch (error) {
        next(error);
    }
};
exports.listVendorsHandler = listVendorsHandler;
const approveVendorHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const vendor = await (0, vendor_service_1.approveVendorByAdmin)(req.params.vendorId, req.user._id.toString());
        res.json({ vendor });
    }
    catch (error) {
        next(error);
    }
};
exports.approveVendorHandler = approveVendorHandler;
const rejectVendorHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const vendor = await (0, vendor_service_1.rejectVendorByAdmin)(req.params.vendorId, req.user._id.toString(), req.body.reason);
        res.json({ vendor });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectVendorHandler = rejectVendorHandler;
