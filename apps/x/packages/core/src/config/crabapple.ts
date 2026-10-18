import { z } from "zod";
import { CrabappleApiConfig } from "@x/shared/dist/crabapple-account.js";
import { API_URL } from "./env.js";

let cached: z.infer<typeof CrabappleApiConfig> | null = null;

export async function getCrabappleConfig(): Promise<z.infer<typeof CrabappleApiConfig>> {
  if (cached) {
    return cached;
  }
  const response = await fetch(`${API_URL}/v1/config`);
  const data = CrabappleApiConfig.parse(await response.json());
  cached = data;
  return data;
}