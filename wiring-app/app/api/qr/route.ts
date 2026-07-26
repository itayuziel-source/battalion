import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * מייצר קוד QR (SVG) עבור כתובת פנימית — למשל מסך ארון.
 * בעתיד: סריקת הקוד בטלפון תפתח ישירות את /cabinets/[id].
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") ?? "";
  if (!text) return NextResponse.json({ error: "חסר פרמטר text" }, { status: 400 });
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 256 });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
