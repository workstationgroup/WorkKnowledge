import { handlers } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

const { GET: _GET, POST } = handlers;

async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.includes("/callback/")) {
    // Log the full callback URL so we can inspect what Azure actually sent back
    const entry = `${url.pathname}${url.search}`;
    prisma.setting
      .upsert({
        where: { key: "auth_last_callback_url" },
        update: { value: entry },
        create: { key: "auth_last_callback_url", value: entry },
      })
      .catch(() => {});
  }
  return _GET(req);
}

export { GET, POST };
