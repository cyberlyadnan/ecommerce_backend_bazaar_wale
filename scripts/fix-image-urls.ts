/**
 * Migration script to fix image URLs in the database
 * Replaces localhost URLs with the correct production API URL
 * 
 * Usage:
 *   Set APP_BASE_URL in your .env file, then run:
 *   npx ts-node scripts/fix-image-urls.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import config from '../src/config';
import Product from '../src/models/Product.model';
import Category from '../src/models/Category.model';
import Blog from '../src/models/Blog.model';
import Review from '../src/models/Review.model';

// Load environment variables
const envFile =
  process.env.NODE_ENV === 'development'
    ? '.env.development'
    : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

const OLD_BASE_URL = 'http://localhost:5000';
const NEW_BASE_URL = config.app.baseUrl?.replace(/\/+$/, '') || process.env.APP_BASE_URL?.replace(/\/+$/, '');

if (!NEW_BASE_URL) {
  console.error('❌ ERROR: APP_BASE_URL is not set in your environment variables!');
  console.error('Please set APP_BASE_URL in your .env file before running this script.');
  process.exit(1);
}

if (NEW_BASE_URL.includes('localhost')) {
  console.warn('⚠️  WARNING: NEW_BASE_URL still contains localhost:', NEW_BASE_URL);
  console.warn('This script will replace localhost URLs with another localhost URL.');
  console.warn('Make sure APP_BASE_URL is set to your production API URL (e.g., https://api.bazaarwale.in)');
}

runMigration();

async function runMigration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongo.uri);
    console.log('✅ Connected to MongoDB');

    console.log('\n📝 Starting URL migration...');
    console.log(`   Old URL pattern: ${OLD_BASE_URL}`);
    console.log(`   New URL pattern: ${NEW_BASE_URL}\n`);

    let totalUpdated = 0;

    // Fix Product images
    console.log('🔄 Fixing product images...');
    const products = await Product.find({ 'images.url': { $regex: OLD_BASE_URL } });
    let productCount = 0;
    for (const product of products) {
      let updated = false;
      if (product.images && Array.isArray(product.images)) {
        for (const image of product.images) {
          if (image.url && image.url.includes(OLD_BASE_URL)) {
            image.url = image.url.replace(OLD_BASE_URL, NEW_BASE_URL);
            updated = true;
          }
        }
      }
      if (updated) {
        await product.save();
        productCount++;
      }
    }
    console.log(`   ✅ Updated ${productCount} products`);
    totalUpdated += productCount;

    // Fix Category images
    console.log('🔄 Fixing category images...');
    const categories = await Category.find({ image: { $regex: OLD_BASE_URL } });
    let categoryCount = 0;
    for (const category of categories) {
      if (category.image && category.image.includes(OLD_BASE_URL)) {
        category.image = category.image.replace(OLD_BASE_URL, NEW_BASE_URL);
        await category.save();
        categoryCount++;
      }
    }
    console.log(`   ✅ Updated ${categoryCount} categories`);
    totalUpdated += categoryCount;

    // Fix Blog images
    console.log('🔄 Fixing blog images...');
    const blogs = await Blog.find({
      $or: [
        { 'featuredImage.url': { $regex: OLD_BASE_URL } },
        { 'seo.ogImage.url': { $regex: OLD_BASE_URL } },
        { 'seo.twitterImage.url': { $regex: OLD_BASE_URL } },
      ],
    });
    let blogCount = 0;
    for (const blog of blogs) {
      let updated = false;
      
      if (blog.featuredImage?.url && blog.featuredImage.url.includes(OLD_BASE_URL)) {
        blog.featuredImage.url = blog.featuredImage.url.replace(OLD_BASE_URL, NEW_BASE_URL);
        updated = true;
      }
      
      if (blog.seo?.ogImage?.url && blog.seo.ogImage.url.includes(OLD_BASE_URL)) {
        blog.seo.ogImage.url = blog.seo.ogImage.url.replace(OLD_BASE_URL, NEW_BASE_URL);
        updated = true;
      }
      
      if (blog.seo?.twitterImage?.url && blog.seo.twitterImage.url.includes(OLD_BASE_URL)) {
        blog.seo.twitterImage.url = blog.seo.twitterImage.url.replace(OLD_BASE_URL, NEW_BASE_URL);
        updated = true;
      }
      
      if (updated) {
        await blog.save();
        blogCount++;
      }
    }
    console.log(`   ✅ Updated ${blogCount} blogs`);
    totalUpdated += blogCount;

    // Fix Review images
    console.log('🔄 Fixing review images...');
    const reviews = await Review.find({ 'images.url': { $regex: OLD_BASE_URL } });
    let reviewCount = 0;
    for (const review of reviews) {
      let updated = false;
      if (review.images && Array.isArray(review.images)) {
        for (const image of review.images) {
          if (image.url && image.url.includes(OLD_BASE_URL)) {
            image.url = image.url.replace(OLD_BASE_URL, NEW_BASE_URL);
            updated = true;
          }
        }
      }
      if (updated) {
        await review.save();
        reviewCount++;
      }
    }
    console.log(`   ✅ Updated ${reviewCount} reviews`);
    totalUpdated += reviewCount;

    console.log('\n✨ Migration complete!');
    console.log(`   Total records updated: ${totalUpdated}`);
    console.log(`   All localhost URLs have been replaced with: ${NEW_BASE_URL}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

