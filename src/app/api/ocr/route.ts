import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 }
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("gif")) mediaType = "image/gif";
    else if (contentType.includes("webp")) mediaType = "image/webp";

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `วิเคราะห์รูปภาพนี้และดึงข้อมูลจำนวนเงินออกมา

กรุณาตอบในรูปแบบ JSON เท่านั้น:
{
  "amount": <ตัวเลขจำนวนเงิน หรือ null ถ้าหาไม่เจอ>,
  "description": "<คำอธิบายสั้นๆ เกี่ยวกับเอกสาร เช่น 'ใบเสร็จค่าอาหาร' หรือ 'ใบกำกับภาษี'>",
  "reference": "<เลขที่เอกสาร/ใบเสร็จ ถ้ามี หรือ null>",
  "confidence": "<high/medium/low>"
}

ถ้าเป็นใบเสร็จหรือ invoice ให้ดึงยอดรวมสุทธิ (total/grand total)
ถ้ามีหลายจำนวนเงิน ให้เลือกยอดรวมหรือยอดสุดท้าย`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse response", raw: responseText },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: {
        amount: result.amount,
        description: result.description,
        reference: result.reference,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    console.error("OCR error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
