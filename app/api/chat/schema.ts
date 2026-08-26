import { z } from "zod";
import { routing } from "@/i18n/routing";

export const chatRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
  locale: z.enum(routing.locales),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
