import { handlers } from "@/auth";
import { prisma } from "@/lib/prisma";

const originalGET = handlers.GET;

async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const url = new URL(req.url);
  const params = await ctx.params;
  // Log callback URL to DB so we can inspect what Azure actually sent back
  if (params.nextauth?.includes("callback")) {
    const entry = `path=${url.pathname} | search=${url.search}`;
    prisma.setting
      .upsert({
        where: { key: "auth_last_callback_url" },
        update: { value: entry },
        create: { key: "auth_last_callback_url", value: entry },
      })
      .catch(() => {});
  }
  return originalGET(req, ctx);
}

export { GET };
export const POST = handlers.POST;
