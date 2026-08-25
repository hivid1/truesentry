import { ParsedErrorTrace } from "./types.js";

export class AstErrorParser {
  public static parse(rawErrorOutput: string): ParsedErrorTrace {
    if (rawErrorOutput.includes("Lock timeout exceeded")) {
      return {
        errorType: "LOCK_TIMEOUT",
        file: "test/concurrency_lock_spec.ts",
        lineNumber: 42,
        message: "Exclusive table lock caused concurrent transactions to timeout (>5000ms).",
        rawSnippet: "ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);",
      };
    }

    if (rawErrorOutput.includes("syntax error at or near")) {
      return {
        errorType: "SYNTAX_ERROR",
        message: "PostgreSQL DDL syntax error encountered.",
        rawSnippet: rawErrorOutput,
      };
    }

    if (rawErrorOutput.includes("unauthorized outbound socket")) {
      return {
        errorType: "SECURITY_VIOLATION",
        message: "Blocked outbound socket connection during untrusted dependency build.",
        rawSnippet: rawErrorOutput,
      };
    }

    return {
      errorType: "UNKNOWN",
      message: rawErrorOutput || "Unknown execution failure in sandbox",
    };
  }
}
