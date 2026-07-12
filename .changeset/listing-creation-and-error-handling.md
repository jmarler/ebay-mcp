---
"ebay-mcp": minor
---

Unblock end-to-end listing creation and surface real eBay errors.

- Add `ebay_upload_site_hosted_pictures` — upload a local file, base64, or external URL to eBay Picture Services (EPS) via the Trading API and get a hosted image URL for `PictureDetails.PictureURL`.
- Fix inventory write tools (e.g. `ebay_create_inventory_location`) rejecting valid input: request-body schemas now advertise `type: object` instead of an opaque schema, so hosts send a JSON object instead of a string.
- Surface eBay's real error payload (errorId, message, longMessage, parameters, HTTP status) from write tools instead of masking failures as "An error has occurred", by unwrapping the Effect `FiberFailure` cause chain.
- Return `{ success: true }` for 204 No Content responses instead of emitting non-string content the MCP result schema rejects.
- Drop `commerce.feedback.readonly` from the authorization-code scope list — it is client-credentials-only and made eBay reject user consent with `invalid_scope`.
- Repair the Docker build: multi-stage build on Node 22 that no longer corrupts `package.json`.
