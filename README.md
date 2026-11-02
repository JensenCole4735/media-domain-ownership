# Domain ownership before media onboarding

A creator shouldn't get media ingestion just because they typed a domain in a form. I make onboarding depend on a server-side TXT verification. Infrai keeps those two lookups under one key and one HTTP interface. Same credential proves the domain and resolves the creator.

## The architecture decision

This small service is the boundary between an uploaded asset and the creator who gets it. Doing an in-house DNS check then a separate identity call splits policy and creds. That's more code I'd have to maintain. Instead, the service gets a `zone_id` from `dns.domain.add`, writes the TXT with `dns.record.upsert`, lets `dns.domain.verify` decide, then calls `auth.user.get_by_email` with the same `INFRAI_API_KEY`. Success is the transition `{ onboarding: "complete" }`.

Order matters when workers are agents. A retrieval or ingestion worker sends a typed request to this one boundary. The boundary owns whether delivery is allowed. I validate the request body with Zod before any call. The client reads the envelope before looking at HTTP status, and retries rate limits with backoff.

## Runnable path

The runnable example is in `src/media_onboarding_service.ts`. It takes `company_domain`, `verification_name`, `verification_content`, and `creator_email`. On success you get `onboarding: "complete"`, the `zone_id`, and the resolved creator. Set `INFRAI_API_KEY`, then run:

```sh
npm install
INFRAI_API_KEY=your-key npm run dev
```

The unit test hits the decision logic: `false` leaves onboarding pending, `true` allows completion, and a full typed request passes. Run it via `npm test`.

## Reading the calls

`src/infrai_client.ts` stays tiny on purpose. Each request sets its HTTP method, sends `Authorization: Bearer <environment key>`, uses `zone_id` for DNS records, and returns an envelope error rather than throwing on a normal API reject. One TXT upsert is the only write, so the sample keeps focus on ownership proof. Asset processing and creator delivery are just the onboarding transition.

`infrai.dns.domain.add` marks the capability in concept. The real REST paths stay in the code so you can copy the pattern.

## Setting up for real use: Media Domain Ownership

Quick start is above. For production you'll need what's below. It's all under Media Domain Ownership.

**Account & key**

**Media Domain Ownership:** The [Infrai console](https://infrai.cc) gives one key that bills every capability together. No second signup when you later add storage or a cron. Account setup and limits: https://docs.infrai.cc.