import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Initialize S3Client for R2
export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string
  }
});

export const Bucket = process.env.R2_BUCKET as string;

// Generate a user-specific key
export function userKey(userId: string | number, ...rest: string[]): string {
  return [String(userId), ...rest].join("/");
}

// List all objects under a user's prefix
export async function listUser(userId: string | number) {
  const prefix = userKey(userId);
  const resp = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix }));
  return (resp.Contents || []).map(o => ({
    key: o.Key!,
    size: Number(o.Size || 0),
    lastModified: String(o.LastModified || "")
  }));
}

// Get TTL from environment or use default
const getSignTtl = () => Number(process.env.R2_SIGN_TTL || 900);

// Sign a GET URL for downloading
export async function signGet(key: string, expiresIn?: number) {
  const cmd = new GetObjectCommand({ Bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresIn ?? getSignTtl() });
}

// Sign a PUT URL for uploading
export async function signPut(key: string, contentType?: string, expiresIn?: number) {
  const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn: expiresIn ?? getSignTtl() });
}

// ---- FOLDER / FILE OPS ----

// List one "directory" level under a prefix using Delimiter="/"
export async function listDir(prefix: string) {
  const resp = await s3.send(new ListObjectsV2Command({
    Bucket, Prefix: prefix, Delimiter: "/"
  }));

  const folders = (resp.CommonPrefixes || []).map(p => ({
    prefix: p.Prefix!, // e.g. 42/staged/folder1/
    name: p.Prefix!.slice(prefix.length).replace(/\/$/, "")
  }));

  const files = (resp.Contents || [])
    .filter(o => o.Key !== prefix) // ignore the folder marker itself
    .filter(o => !o.Key?.endsWith("/"))
    .map(o => ({
      key: o.Key!, name: o.Key!.slice(prefix.length),
      size: Number(o.Size || 0), lastModified: String(o.LastModified || "")
    }));

  return { folders, files };
}

// Create a "folder" by writing a 0-byte object ending with "/"
export async function ensureFolder(prefix: string) {
  if (!prefix.endsWith("/")) prefix += "/";
  await s3.send(new PutObjectCommand({ Bucket, Key: prefix, Body: new Uint8Array() }));
  return prefix;
}

export async function copyObject(fromKey: string, toKey: string) {
  const Source = encodeURIComponent(`${Bucket}/${fromKey}`);
  await s3.send(new CopyObjectCommand({ Bucket, CopySource: Source, Key: toKey }));
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

// Delete everything under a prefix (recursive)
export async function deletePrefix(prefix: string) {
  let token: string | undefined;
  do {
    const resp = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
    const keys = (resp.Contents || []).map(o => ({ Key: o.Key! }));
    if (keys.length) {
      await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys } }));
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
}

export async function moveObject(fromKey: string, toKey: string) {
  await copyObject(fromKey, toKey);
  await deleteObject(fromKey);
}

// Rename a folder by copying all keys under oldPrefix → newPrefix, then deleting old
export async function renamePrefix(oldPrefix: string, newPrefix: string) {
  if (!oldPrefix.endsWith("/")) oldPrefix += "/";
  if (!newPrefix.endsWith("/")) newPrefix += "/";
  let token: string | undefined;
  do {
    const resp = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: oldPrefix, ContinuationToken: token }));
    for (const o of (resp.Contents || [])) {
      const oldKey = o.Key!;
      const suffix = oldKey.slice(oldPrefix.length);
      const newKey = newPrefix + suffix;
      await copyObject(oldKey, newKey);
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
  await deletePrefix(oldPrefix);
}
