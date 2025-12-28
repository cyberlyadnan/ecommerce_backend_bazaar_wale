import mongoose from 'mongoose';

import app from './app';
import config from './config';
import logger from './config/logger';
import { ensureBlogIndexes, ensureProductIndexes } from './utils/ensureIndexes';

const start = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    await ensureProductIndexes();
    await ensureBlogIndexes();
    logger.info('Connected to MongoDB');

    app.listen(config.app.port, () => {
      logger.info(`Server running on port ${config.app.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

