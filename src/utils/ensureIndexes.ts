import Product from '../models/Product.model';
import Blog from '../models/Blog.model';
import logger from '../config/logger';

export const ensureProductIndexes = async () => {
  try {
    const indexes = await Product.collection.indexes();
    const legacyIndexes = indexes.filter((index) => {
      if (!index.key || typeof index.key !== 'object') {
        return false;
      }
      const key = index.key as Record<string, unknown>;
      const values = Object.values(key);
      const hasLegacyTagText = ('tags' in key && key.tags === 'text') || ('tagsText' in key && key.tagsText !== 'text');
      const missingTagsText = values.includes('text') && !('tagsText' in key);
      return hasLegacyTagText || missingTagsText;
    });

    for (const legacy of legacyIndexes) {
      if (legacy.name) {
        logger.warn(`Dropping legacy product index '${legacy.name}' to rebuild text search support.`);
        await Product.collection.dropIndex(legacy.name);
      }
    }

    await Product.createIndexes();
  } catch (error) {
    logger.error('Failed to ensure product indexes', error);
  }
};

export const ensureBlogIndexes = async () => {
  try {
    await Blog.createIndexes();
  } catch (error) {
    logger.error('Failed to ensure blog indexes', error);
  }
};


