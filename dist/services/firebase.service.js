"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeFirebaseRefreshTokens = exports.verifyFirebaseIdToken = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
let initialized = false;
const initialize = () => {
    if (initialized) {
        return;
    }
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId: config_1.default.firebase.projectId,
                clientEmail: config_1.default.firebase.clientEmail,
                privateKey: config_1.default.firebase.privateKey,
            }),
        });
        initialized = true;
    }
    catch (error) {
        logger_1.default.error('Failed to initialize Firebase Admin SDK', error);
        throw error;
    }
};
const verifyFirebaseIdToken = async (token) => {
    initialize();
    return firebase_admin_1.default.auth().verifyIdToken(token);
};
exports.verifyFirebaseIdToken = verifyFirebaseIdToken;
const revokeFirebaseRefreshTokens = async (uid) => {
    initialize();
    await firebase_admin_1.default.auth().revokeRefreshTokens(uid);
};
exports.revokeFirebaseRefreshTokens = revokeFirebaseRefreshTokens;
exports.default = {
    verifyFirebaseIdToken: exports.verifyFirebaseIdToken,
    revokeFirebaseRefreshTokens: exports.revokeFirebaseRefreshTokens,
};
