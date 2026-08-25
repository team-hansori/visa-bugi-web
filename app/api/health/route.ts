export function GET() {
  return Response.json({
    service: "visa-bugi-web",
    status: "ok",
    dependencies: {
      supabase:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          ? "configured"
          : "not_configured",
      ocr: process.env.OPENAI_API_KEY ? "configured" : "demo",
    },
  });
}
