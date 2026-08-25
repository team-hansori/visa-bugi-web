export function GET() {
  const forceDemoMode = process.env.OCR_MODE?.trim().toLowerCase() === "demo";

  return Response.json({
    service: "visa-bugi-web",
    status: "ok",
    dependencies: {
      supabase:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          ? "configured"
          : "not_configured",
      ocr: forceDemoMode
        ? "demo"
        : process.env.OPENAI_API_KEY
          ? "configured"
          : "demo",
    },
  });
}
