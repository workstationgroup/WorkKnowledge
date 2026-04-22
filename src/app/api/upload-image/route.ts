import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image too large (max 10 MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
    }

    const blob = await put(`editor/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Image upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
