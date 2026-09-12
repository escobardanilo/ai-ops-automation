import "server-only";

import Groq from "groq-sdk";

let client: Groq | null = null;

export function getAiClient() {
  if (client) {
    return client;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  client = new Groq({ apiKey });
  return client;
}
