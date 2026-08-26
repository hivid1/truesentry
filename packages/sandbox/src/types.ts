export interface SandboxExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ParsedErrorTrace {
  errorType: "SYNTAX_ERROR" | "LOCK_TIMEOUT" | "REGRESSION_TEST_FAILURE" | "SECURITY_VIOLATION" | "UNKNOWN";
  file?: string;
  lineNumber?: number;
  message: string;
  rawSnippet?: string;
}

export interface SelfCorrectionState {
  iteration: number;
  maxIterations: number;
  success: boolean;
  testsPassed: number;
  history: Array<{
    attemptedPatch: string;
    error?: ParsedErrorTrace;
    passed: boolean;
  }>;
  finalPatch?: string;
}
