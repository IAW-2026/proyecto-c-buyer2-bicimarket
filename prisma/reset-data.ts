import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Limpiando todas las filas de la base de datos...\n");

  await prisma.$transaction([
    prisma.orderStatusHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.orderSellerGroup.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.favoriteItem.deleteMany(),
  ]);

  // Romper referencia circular antes de borrar addresses y orders
  await prisma.buyerProfile.updateMany({ data: { defaultShippingAddressId: null } });

  await prisma.$transaction([
    prisma.address.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.order.deleteMany(),
  ]);

  await prisma.buyerProfile.deleteMany();

  console.log("✅ Base de datos limpia — todas las tablas están vacías.");
}

main()
  .catch((e) => {
    console.error("❌ Error al limpiar:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
