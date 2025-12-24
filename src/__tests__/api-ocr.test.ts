import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { auth } from "@/lib/auth";

// Create mock for Anthropic messages.create
const mockCreate = vi.fn();

// Mock Anthropic SDK - factory function is hoisted, so we need to use hoisted vi.fn
vi.mock("@anthropic-ai/sdk", async () => {
  const createMock = vi.fn();
  // Store reference so we can access it later
  (globalThis as any).__mockCreate = createMock;
  return {
    default: class MockAnthropic {
      messages = {
        create: createMock,
      };
    },
  };
});

// Mock fetch for image fetching
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-api-key" };
});

afterEach(() => {
  process.env = originalEnv;
});

// Helper to get the mock
const getCreateMock = () => (globalThis as any).__mockCreate as typeof vi.fn;

// Import after mocks
import { POST } from "@/app/api/ocr/route";

const mockSession = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
};

describe("POST /api/ocr", () => {
  it("should return 401 for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 if ANTHROPIC_API_KEY is not configured", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    delete process.env.ANTHROPIC_API_KEY;

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Anthropic API key not configured");
  });

  it("should return 400 if no imageUrl provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No image URL provided");
  });

  it("should return 400 if image fetch fails", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/notfound.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Failed to fetch image");
  });

  it("should successfully extract single item from receipt", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    // Mock image fetch
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    // Mock Claude response
    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            items: [
              { amount: 1500, description: "ค่าอาหาร", reference: "INV-001" },
            ],
            totalAmount: 1500,
            documentType: "ใบเสร็จ",
            confidence: "high",
          }),
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/receipt.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.items[0].amount).toBe(1500);
    expect(data.data.items[0].description).toBe("ค่าอาหาร");
    expect(data.data.totalAmount).toBe(1500);
    expect(data.data.documentType).toBe("ใบเสร็จ");
    expect(data.data.confidence).toBe("high");
  });

  it("should successfully extract multiple items from receipt", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            items: [
              { amount: 500, description: "ค่าอาหารกลางวัน", reference: null },
              { amount: 350, description: "ค่าแท็กซี่", reference: null },
              { amount: 150, description: "ค่ากาแฟ", reference: null },
            ],
            totalAmount: 1000,
            documentType: "ใบเสร็จ",
            confidence: "medium",
          }),
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/multi-receipt.png" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(3);
    expect(data.data.totalAmount).toBe(1000);
  });

  it("should detect correct media type for PNG", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [{ type: "text", text: '{"items":[],"confidence":"low"}' }],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/image.png" }),
    });

    await POST(request);

    expect(getCreateMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                source: expect.objectContaining({
                  media_type: "image/png",
                }),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should detect correct media type for WebP", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/webp" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [{ type: "text", text: '{"items":[],"confidence":"low"}' }],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/image.webp" }),
    });

    await POST(request);

    expect(getCreateMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                source: expect.objectContaining({
                  media_type: "image/webp",
                }),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should return 500 if JSON cannot be parsed from response", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: "I cannot read this image clearly.",
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/blurry.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Could not parse response");
    expect(data.raw).toBeDefined();
  });

  it("should handle empty items array", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalAmount: null,
            documentType: "unknown",
            confidence: "low",
          }),
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/empty.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toEqual([]);
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockRejectedValue(new Error("API rate limit exceeded"));

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to process image");
    expect(data.error).toContain("API rate limit exceeded");
  });

  it("should extract JSON from response with extra text", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    // Claude sometimes adds explanation before/after JSON
    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: `Here's the extracted data:

{
  "items": [{"amount": 1234, "description": "Test item", "reference": null}],
  "totalAmount": 1234,
  "documentType": "ใบเสร็จ",
  "confidence": "high"
}

I hope this helps!`,
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/receipt.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items[0].amount).toBe(1234);
  });

  it("should handle Thai tax invoice (ใบกำกับภาษี)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    getCreateMock().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            items: [
              { amount: 10700, description: "สินค้า A", reference: "TAX-2024-001" },
            ],
            totalAmount: 10700,
            documentType: "ใบกำกับภาษี",
            confidence: "high",
          }),
        },
      ],
    });

    const request = new Request("http://localhost/api/ocr", {
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://example.com/tax-invoice.jpg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.documentType).toBe("ใบกำกับภาษี");
    expect(data.data.items[0].reference).toBe("TAX-2024-001");
  });
});
