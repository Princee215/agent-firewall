// src/lib/heuristics.js
// Fast, deterministic, zero-cost first line of defense.
// Runs BEFORE any LLM call. Catches the well-known attack shapes.

const RULES = [
  {
    category: "instruction_override",
    action: "block",
    reason: "Attempt to override or ignore the agent's instructions.",
    patterns: [
      /\bignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directions)\b/i,
      /\bdisregard\s+(all\s+)?(previous|prior|above|the)\s+(instructions|rules|context)\b/i,
      /\bforget\s+(everything|all|your)\s+(you|instructions|rules|prior)\b/i,
      /\boverride\s+(your|the|all)\s+(instructions|rules|settings|system)\b/i,
      /\bdo\s+not\s+(follow|obey)\s+(your|the)\s+(instructions|rules)\b/i,
    ],
  },
  {
    category: "system_prompt_extraction",
    action: "block",
    reason: "Attempt to extract the system prompt or hidden instructions.",
    patterns: [
      /\b(reveal|show|print|repeat|display|output|tell\s+me)\s+(your|the)\s+(system\s+prompt|initial\s+instructions|hidden\s+(prompt|instructions)|prompt)\b/i,
      /\bwhat\s+(is|are|were)\s+your\s+(system\s+prompt|original\s+instructions|initial\s+instructions)\b/i,
      /\brepeat\s+(everything|the\s+text)\s+above\b/i,
      /\bprint\s+(everything|the\s+words)\s+above\b/i,
    ],
  },
  {
    category: "role_manipulation",
    action: "block",
    reason: "Attempt to switch the agent into an unrestricted persona.",
    patterns: [
      /\byou\s+are\s+now\s+(a|an|in)\s+/i,
      /\bact\s+as\s+(if\s+you\s+are\s+)?(a\s+)?(DAN|developer\s+mode|jailbroken|unrestricted)\b/i,
      /\bpretend\s+(you\s+are|to\s+be)\s+(a\s+)?(different|unrestricted|jailbroken)\b/i,
      /\benter\s+(developer|debug|god)\s+mode\b/i,
      /\bfrom\s+now\s+on\s+you\s+(will|must|are)\b/i,
    ],
  },
  {
    category: "secret_pii_leak",
    action: "redact",
    reason: "Output appears to contain a secret, key, or sensitive credential.",
    patterns: [
      /\bsk-[a-zA-Z0-9]{16,}\b/,                 // OpenAI-style key
      /\b(AKIA|ASIA)[A-Z0-9]{16}\b/,             // AWS access key
      /\bghp_[a-zA-Z0-9]{20,}\b/,                // GitHub token
      /-----BEGIN\s+(RSA|EC|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,         // card-like
    ],
  },
];

// Returns the first matching rule, or null if input looks clean.
export function runHeuristics(text) {
  if (!text || typeof text !== "string") return null;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          verdict: rule.action,        // "block" | "redact"
          category: rule.category,
          reason: rule.reason,
          layer: "heuristics",
          matched: pattern.source.slice(0, 60),
        };
      }
    }
  }
  return null; // clean -> caller decides whether to escalate to LLM
}

// Redacts detected secrets/PII from a string (used for the "redact" verdict).
export function redactSecrets(text) {
  let out = text;
  for (const rule of RULES) {
    if (rule.category !== "secret_pii_leak") continue;
    for (const pattern of rule.patterns) {
      out = out.replace(new RegExp(pattern, "g"), "[REDACTED]");
    }
  }
  return out;
}