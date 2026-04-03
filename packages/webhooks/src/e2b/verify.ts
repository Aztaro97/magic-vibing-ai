import { createHash } from "node:crypto";

/**
 * Verify an E2B webhook signature.
 *
 * The signature is SHA-256(secret + rawBody) encoded as base64 with trailing
 * `=` padding stripped.
 *
 * @see https://e2b.dev/docs/sandbox/lifecycle-events-webhooks#webhook-verification
 */
export function verifyE2bSignature(
	secret: string,
	rawBody: string,
	signature: string,
): boolean {
	const expected = createHash("sha256")
		.update(secret + rawBody)
		.digest("base64")
		.replace(/=+$/, "");

	return expected === signature;
}
