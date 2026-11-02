import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const onboardingRequest = z.object({
  company_domain: z.string().min(1),
  verification_name: z.string().min(1),
  verification_content: z.string().min(1),
  creator_email: z.string().email()
});

export type OnboardingRequest = z.infer<typeof onboardingRequest>;

export function canCompleteOnboarding(verified: boolean): boolean { return verified; }

export async function onboardCreator(input: unknown, client: InfraiClient) {
  const request = onboardingRequest.parse(input);
  const zone = await client.addDomain(request.company_domain);
  await client.upsertTxt(zone.zone_id, request.verification_name, request.verification_content);
  const verification = await client.verifyDomain(request.company_domain);
  if (!canCompleteOnboarding(Boolean(verification.verified))) throw new Error("Domain ownership is pending");
  const user = await client.getUserByEmail(request.creator_email);
  return { onboarding: "complete", zone_id: zone.zone_id, creator: user };
}

if (process.argv[1]?.endsWith("media_onboarding_service.ts")) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const requiredDemoEnv = ["INFRAI_COMPANY_DOMAIN", "INFRAI_VERIFICATION_NAME", "INFRAI_VERIFICATION_CONTENT", "INFRAI_CREATOR_EMAIL"] as const;
  const missing = requiredDemoEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Missing demo configuration: ${missing.join(", ")}`);
  const input = {
    company_domain: process.env.INFRAI_COMPANY_DOMAIN!,
    verification_name: process.env.INFRAI_VERIFICATION_NAME!,
    verification_content: process.env.INFRAI_VERIFICATION_CONTENT!,
    creator_email: process.env.INFRAI_CREATOR_EMAIL!
  };
  onboardCreator(input, new InfraiClient(key)).then(console.log);
}
