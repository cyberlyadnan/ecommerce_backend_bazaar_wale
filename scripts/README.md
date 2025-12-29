# Database Migration Scripts

## Fix Image URLs

This script fixes existing image URLs in the database that are using `localhost` instead of the production API URL.

### Prerequisites

1. Make sure `APP_BASE_URL` is set in your `.env` or `.env.production` file:
   ```env
   APP_BASE_URL=https://api.bazaarwale.in
   ```

2. Ensure your MongoDB connection is configured correctly in the environment variables.

### Usage

1. **Set the correct APP_BASE_URL** in your environment file:
   ```env
   APP_BASE_URL=https://api.bazaarwale.in
   ```

2. **Run the migration script**:
   ```bash
   cd backend
   npx ts-node scripts/fix-image-urls.ts
   ```

   Or if you have ts-node installed globally:
   ```bash
   ts-node scripts/fix-image-urls.ts
   ```

### What it does

The script will:
- Find all products with image URLs containing `http://localhost:5000`
- Find all categories with image URLs containing `http://localhost:5000`
- Find all blogs with image URLs containing `http://localhost:5000`
- Find all reviews with image URLs containing `http://localhost:5000`
- Replace `http://localhost:5000` with the value from `APP_BASE_URL`
- Save all updated records to the database

### Important Notes

- **Backup your database** before running this script in production
- The script will show a summary of how many records were updated
- Make sure `APP_BASE_URL` is set to your production API URL (not localhost)
- After running the script, restart your backend server to ensure new uploads use the correct URL

