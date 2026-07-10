export type SensitiveDataType =
  | "private-key"
  | "jwt"
  | "bearer-token"
  | "cloud-access-key"
  | "credential-assignment"
  | "connection-credential"
  | "email";

export interface RedactionResult {
  sanitized: string;
  redactionCount: number;
  detectedTypes: SensitiveDataType[];
}

interface RedactionRule {
  type: SensitiveDataType;
  pattern: RegExp;
  replacement: string;
}

const rules: RedactionRule[] = [
  {
    type: "private-key",
    pattern: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    type: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: "[REDACTED_JWT]",
  },
  {
    type: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{12,}={0,2}/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
  },
  {
    type: "cloud-access-key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: "[REDACTED_ACCESS_KEY]",
  },
  {
    type: "connection-credential",
    pattern: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^:\s/@]+:)([^@\s]+)(@)/gi,
    replacement: "$1[REDACTED_PASSWORD]$3",
  },
  {
    type: "credential-assignment",
    pattern: /\b(api[_-]?key|secret|password|passwd|token|client[_-]?secret)\s*[:=]\s*["']?([^\s"',;]{6,})["']?/gi,
    replacement: "$1=[REDACTED_SECRET]",
  },
  {
    type: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]",
  },
];

export function redactSensitiveData(input: string): RedactionResult {
  let sanitized = input;
  let redactionCount = 0;
  const detectedTypes = new Set<SensitiveDataType>();

  for (const rule of rules) {
    const matches = sanitized.match(rule.pattern);
    if (matches?.length) {
      redactionCount += matches.length;
      detectedTypes.add(rule.type);
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return { sanitized, redactionCount, detectedTypes: [...detectedTypes] };
}
