import { SandboxExecResult } from "./types.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface SandboxOptions {
  workingDirectory?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export class SandboxRuntime {
  public sandboxId: string;
  public sandboxDir: string;
  private onStdoutChunk?: (chunk: string) => void;
  private timeoutMs: number;

  constructor(
    sandboxId = `sbx_${Math.random().toString(36).substring(7)}`,
    onStdoutChunk?: (chunk: string) => void,
    options?: SandboxOptions
  ) {
    this.sandboxId = sandboxId;
    this.onStdoutChunk = onStdoutChunk;
    this.timeoutMs = options?.timeoutMs || 30000;

    if (options?.workingDirectory && fs.existsSync(options.workingDirectory)) {
      this.sandboxDir = options.workingDirectory;
    } else {
      this.sandboxDir = path.join(os.tmpdir(), "trueforge_sandboxes", this.sandboxId);
      if (!fs.existsSync(this.sandboxDir)) {
        fs.mkdirSync(this.sandboxDir, { recursive: true });
      }
    }
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.sandboxDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf8");
  }

  public async readFile(filePath: string): Promise<string | undefined> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.sandboxDir, filePath);
    if (!fs.existsSync(fullPath)) return undefined;
    return fs.readFileSync(fullPath, "utf8");
  }

  public async exec(command: string, customCwd?: string): Promise<SandboxExecResult> {
    const startTime = Date.now();
    const cwd = customCwd || this.sandboxDir;

    const emit = (str: string) => {
      if (this.onStdoutChunk) {
        this.onStdoutChunk(str);
      }
    };

    emit(`\x1b[36m[TrueForge-Sandbox:${this.sandboxId}]\x1b[0m $ ${command}\n`);

    return new Promise((resolve) => {
      const child = exec(
        command,
        {
          cwd,
          timeout: this.timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            TRUEFORGE_SANDBOX_ID: this.sandboxId,
            NODE_ENV: "test",
            CI: "true",
          },
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const outStr = stdout ? stdout.toString() : "";
          let errStr = stderr ? stderr.toString() : "";
          let exitCode = error ? (error.code ?? 1) : 0;

          if (error && error.killed) {
            exitCode = 124;
            const timeoutMsg = `[Sandbox-Timeout] Process exceeded execution limit of ${this.timeoutMs}ms\n`;
            errStr += timeoutMsg;
            emit(`\x1b[31m${timeoutMsg}\x1b[0m`);
          }

          if (outStr) emit(outStr);
          if (errStr && !errStr.includes("Sandbox-Timeout")) emit(`\x1b[33m${errStr}\x1b[0m`);

          if (exitCode === 0) {
            emit(`\x1b[32m✓ Process finished (exit: 0, ${durationMs}ms)\x1b[0m\n`);
          } else {
            emit(`\x1b[31m✗ Process failed (exit: ${exitCode}, ${durationMs}ms)\x1b[0m\n`);
          }

          resolve({
            exitCode,
            stdout: outStr,
            stderr: errStr,
            durationMs,
          });
        }
      );
    });
  }

  public cleanup(): void {
    try {
      if (fs.existsSync(this.sandboxDir) && this.sandboxDir.includes("trueforge_sandboxes")) {
        fs.rmSync(this.sandboxDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors on busy files
    }
  }
}
