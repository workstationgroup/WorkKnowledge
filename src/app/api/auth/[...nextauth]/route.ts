import { handlers } from "@/auth";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { type NextRequest } from "next/server";

const { GET: _GET, POST } = handlers;

async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.includes("/callback/")) {
    waitUntil(
      prisma.setting
        .upsert({
          where: { key: "auth_last_callback_url" },
          update: { value: `${url.pathname}${url.search}` },
          create: { key: "auth_last_callback_url", value: `${url.pathname}${url.search}` },
        })
        .catch(() => {})
    );
  }
  return _GET(req);
}

export { GET, POST };
