import admin from 'firebase-admin';

import config from '../config';
import logger from '../config/logger';

let initialized = false;

const initialize = () => {
  if (initialized) {
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    initialized = true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error);
    throw error;
  }
};

export const verifyFirebaseIdToken = async (token: string) => {
  initialize();
  return admin.auth().verifyIdToken(token);
};

export const revokeFirebaseRefreshTokens = async (uid: string) => {
  initialize();
  await admin.auth().revokeRefreshTokens(uid);
};

export default {
  verifyFirebaseIdToken,
  revokeFirebaseRefreshTokens,
};

