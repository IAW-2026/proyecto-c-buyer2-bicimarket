import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const shippingUrl = process.env.SHIPPING_APP_URL;
  if (!shippingUrl) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Error interno del servidor", details: {} } },
      { status: 500 },
    );
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const province = searchParams.get("province");

  const upstream = new URL(`${shippingUrl.replace(/\/$/, "")}/api/v1/postal-codes`);
  if (q) upstream.searchParams.set("q", q);
  if (province) upstream.searchParams.set("province", province);

  try {
    const res = await fetch(upstream.toString());
    if (!res.ok) {
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Error interno del servidor", details: {} } },
        { status: 500 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Error interno del servidor", details: {} } },
      { status: 500 },
    );
  }
}
