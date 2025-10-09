import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}

// Create Supabase client for storage operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Default bucket name - can be overridden via env
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "user-uploads";

// Generate a user-specific key (same structure as R2)
export function userKey(userId: string | number, ...rest: string[]): string {
  return [String(userId), ...rest].join("/");
}

// List all objects under a user's prefix
export async function listUser(userId: string | number) {
  const prefix = userKey(userId);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix);

  if (error) throw error;

  return (data || []).map(file => ({
    key: `${prefix}/${file.name}`,
    size: file.metadata?.size || 0,
    lastModified: file.created_at || ""
  }));
}

// Get signed URL for downloading (default 1 hour expiry)
export async function signGet(key: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// Get signed upload URL (Supabase doesn't have presigned PUTs like S3, so we'll handle upload differently)
export async function signPut(key: string, contentType?: string, expiresIn: number = 900): Promise<string> {
  // For Supabase, we'll return a token-based upload URL
  // The actual upload will be handled server-side or via the client SDK
  return `/api/storage/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType || 'application/octet-stream')}`;
}

// Upload file directly to Supabase Storage
export async function uploadFile(key: string, file: Buffer | Uint8Array | File, contentType?: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, file, {
      contentType,
      upsert: true
    });

  if (error) throw error;
  return data;
}

// List directory contents
export async function listDir(prefix: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix);

  if (error) throw error;

  const folders = (data || [])
    .filter(item => item.id === null) // Folders have null id
    .map(folder => ({
      prefix: `${prefix}/${folder.name}/`,
      name: folder.name
    }));

  const files = (data || [])
    .filter(item => item.id !== null) // Files have an id
    .map(file => ({
      key: `${prefix}/${file.name}`,
      name: file.name,
      size: file.metadata?.size || 0,
      lastModified: file.created_at || ""
    }));

  return { folders, files };
}

// Create a "folder" (Supabase handles this automatically when uploading files)
export async function ensureFolder(prefix: string) {
  if (!prefix.endsWith("/")) prefix += "/";
  // Supabase creates folders automatically, but we can create an empty .keep file
  await uploadFile(`${prefix}.keep`, new Uint8Array(), 'text/plain');
  return prefix;
}

// Copy object
export async function copyObject(fromKey: string, toKey: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .copy(fromKey, toKey);

  if (error) throw error;
  return data;
}

// Delete single object
export async function deleteObject(key: string) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([key]);

  if (error) throw error;
}

// Delete everything under a prefix (recursive)
export async function deletePrefix(prefix: string) {
  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix);

  if (!files || files.length === 0) return;

  const filePaths = files.map(file => `${prefix}/${file.name}`);
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(filePaths);

  if (error) throw error;
}

// Move object (copy then delete)
export async function moveObject(fromKey: string, toKey: string) {
  await copyObject(fromKey, toKey);
  await deleteObject(fromKey);
}

// Rename a folder by copying all files and deleting old ones
export async function renamePrefix(oldPrefix: string, newPrefix: string) {
  if (!oldPrefix.endsWith("/")) oldPrefix += "/";
  if (!newPrefix.endsWith("/")) newPrefix += "/";

  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(oldPrefix);

  if (!files) return;

  for (const file of files) {
    const oldKey = `${oldPrefix}${file.name}`;
    const newKey = `${newPrefix}${file.name}`;
    await moveObject(oldKey, newKey);
  }
}

// Get public URL (if bucket is public)
export function getPublicUrl(key: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(key);

  return data.publicUrl;
}
