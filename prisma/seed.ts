import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding categories...");

  const categories = [
    { name: "Product Knowledge", slug: "product-knowledge", description: "Office furniture catalog, materials, and specifications", color: "#6366f1", order: 0 },
    { name: "Sales Techniques", slug: "sales-techniques", description: "How to sell, handle objections, and close deals", color: "#10b981", order: 1 },
    { name: "Customer Service", slug: "customer-service", description: "After-sales support, warranties, and complaint handling", color: "#f59e0b", order: 2 },
    { name: "Company Policies", slug: "company-policies", description: "HR rules, attendance, and code of conduct", color: "#3b82f6", order: 3 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`  ✓ ${cat.name}`);
  }

  console.log("\nSeeding default groups...");

  const groups = [
    { name: "Sales Team", description: "Sales executives and account managers", color: "#10b981" },
    { name: "Warehouse", description: "Warehouse and delivery staff", color: "#f59e0b" },
    { name: "Management", description: "Managers and team leads", color: "#6366f1" },
    { name: "All Staff", description: "Company-wide access group", color: "#3b82f6" },
  ];

  for (const group of groups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
    console.log(`  ✓ ${group.name}`);
  }

  console.log("\nSeeding default positions...");

  const positions = [
    { name: "Sales Executive", description: "Front-line sales staff selling office furniture to customers", color: "#10b981" },
    { name: "Warehouse Staff", description: "Handles inventory, assembly, and delivery", color: "#f59e0b" },
    { name: "Sales Manager", description: "Manages the sales team and KPIs", color: "#6366f1" },
    { name: "Customer Service", description: "Handles after-sales support and complaints", color: "#3b82f6" },
  ];

  for (const pos of positions) {
    await prisma.position.upsert({
      where: { name: pos.name },
      update: {},
      create: pos,
    });
    console.log(`  ✓ ${pos.name}`);
  }

  console.log("\nDone! Seed completed successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
