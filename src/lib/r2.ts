import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
});

/** Random-suffixed key under a folder, e.g. "lessons/abc/editor/1713788200-abc123.pdf". */
export function makeKey(folder: string, fileName: string) {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${folder.replace(/\/+$/, "")}/${suffix}-${safeName}`;
}

export type UploadKind = "editor" | "blocks" | "attachments";

/** Build a canonical key: lessons/<id>/<kind>/<file> or drafts/<userId>/editor/<file>. */
export function buildKey(opts: { lessonId?: string | null; userId: string; kind: UploadKind; fileName: string }) {
  const folder = opts.lessonId
    ? `lessons/${opts.lessonId}/${opts.kind}`
    : `drafts/${opts.userId}/${opts.kind}`;
  return makeKey(folder, opts.fileName);
}

/** Generate a presigned PUT URL valid for 5 minutes. Client uploads directly to R2 with this URL. */
export async function presignPut(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2, cmd, { expiresIn: 300 });
  return { url, publicUrl: `${R2_PUBLIC_URL}/${key}` };
}

export async function deleteFromR2(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/** Extract the R2 object key from a public URL we issued, or null if it's not ours. */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url || !R2_PUBLIC_URL) return null;
  if (!url.startsWith(R2_PUBLIC_URL + "/")) return null;
  return url.slice(R2_PUBLIC_URL.length + 1);
}
