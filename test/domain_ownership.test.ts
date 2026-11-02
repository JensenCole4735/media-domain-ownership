import test from "node:test";
import assert from "node:assert/strict";
import { canCompleteOnboarding, onboardingRequest } from "../src/media_onboarding_service.js";

test("onboarding requires a server-confirmed TXT decision", () => {
  assert.equal(canCompleteOnboarding(false), false);
  assert.equal(canCompleteOnboarding(true), true);
  assert.equal(onboardingRequest.safeParse({ company_domain: "studio.example", verification_name: "_media", verification_content: "owned", creator_email: "creator@example.com" }).success, true);
});
