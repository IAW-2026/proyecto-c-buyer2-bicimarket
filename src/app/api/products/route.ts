import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/products — lista todos los productos
export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

// POST /api/products — crea un producto
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { title, description, price, sellerId, sellerName, imageUrl } = body;

  if (!title || !description) {
    return NextResponse.json(
      { error: "title y description son requeridos" },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      title,
      description,
      price: typeof price === "number" ? price : 0,
      sellerId: sellerId ?? null,
      sellerName: sellerName ?? null,
      imageUrl: imageUrl ?? null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
