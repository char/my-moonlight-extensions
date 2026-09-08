export const COMMITMENT_PATTERN = /^sha256: ([0-9a-f]{64})$/;

export async function sha256(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formatReveal(payload: string): string {
  const display = payload.replace(/([\\`*_~|>[\]#().!+-])/g, "\\$1");
  // Keep shell metacharacters inert and backticks out of Discord's code fence.
  const quoted = payload
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\0140")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/'/g, "'\\''");
  return `\`\`\`sh\nprintf '%b' '${quoted}' | sha256sum\n\`\`\``;
}

export async function createCommitment(plaintext: string): Promise<{ digest: string; payload: string }> {
  if (!plaintext.trim()) throw new Error("Enter some plaintext to commit to.");

  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const nonce = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (byte) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[byte & 31]
  ).join("");
  const payload = `${plaintext} ${timestamp} ${nonce}`;
  if (formatReveal(payload).length > 2000) {
    throw new Error("The reveal would exceed Discord's 2,000-character limit. Use shorter plaintext.");
  }

  return { digest: await sha256(payload), payload };
}
