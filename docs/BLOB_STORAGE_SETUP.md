# Vercel Blob Storage Setup

## Problem
If uploaded images (avatars, listing photos) show as broken despite successful uploads, your Vercel Blob store is likely configured as **PRIVATE**. Private blob URLs require authentication tokens in request headers and won't work in `<img>` tags.

## Solution: Configure Blob Store as PUBLIC

Your Vercel Blob store **must be PUBLIC** for image URLs to display in browsers.

### Steps

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Navigate to Storage → Blob**
   - Click your project
   - Go to the Storage tab
   - Find your Blob store

3. **Create a NEW Public Store**
   - Click "Create New" → "Blob Store"
   - Name: e.g., `nozar-media-public`
   - **Access Mode: PUBLIC** (not private)
   - Region: Choose your nearest region

4. **Update Environment Variables**
   - Copy the `BLOB_READ_WRITE_TOKEN` from the new public store
   - Update in `.env.local`:
     ```
     BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
     ```

5. **Redeploy**
   - The app will now upload images to the public blob store
   - Images will display correctly in `<img>` tags

## Why This Works

| Store Type | Upload | Read | Display in `<img>` |
|-----------|--------|------|-------------------|
| Public    | ✅ Token required | ✅ Anyone with URL | ✅ Yes |
| Private   | ✅ Token required | ❌ Token required | ❌ No |

Public stores return direct URLs like:
```
https://mywozleamz06h09s.public.blob.vercel-storage.com/avatars/1775913874700-abc123.png
```

Private stores return presigned URLs like:
```
https://mywozleamz06h09s.private.blob.vercel-storage.com/avatars/1775913874700-abc123.png?auth=token...
```

Private presigned URLs only work when the request includes the auth token in headers—not possible with `<img src="">`.

## References

- [Vercel Blob Public Storage](https://vercel.com/docs/storage/vercel-blob/public-storage)
- [Vercel Blob Private Storage](https://vercel.com/docs/storage/vercel-blob/private-storage)
