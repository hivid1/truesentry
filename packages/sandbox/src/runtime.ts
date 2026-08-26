import { SandboxExecResult } from "./types.js";
import { exec, spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface SandboxOptions {
  workingDirectory?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  networkDisabled?: boolean;
}

export class SandboxRuntime {
  public sandboxId: string;
  public sandboxDir: string;
  private onStdoutChunk?: (chunk: string) => void;
  private timeoutMs: number;
  private options?: SandboxOptions;

  constructor(
    sandboxId = `sbx_${Math.random().toString(36).substring(7)}`,
    onStdoutChunk?: (chunk: string) => void,
    options?: SandboxOptions
  ) {
    this.sandboxId = sandboxId;
    this.onStdoutChunk = onStdoutChunk;
    this.options = options;
    this.timeoutMs = options?.timeoutMs || 30000;

    if (options?.workingDirectory && fs.existsSync(options.workingDirectory)) {
      this.sandboxDir = path.resolve(options.workingDirectory);
    } else {
      this.sandboxDir = path.resolve(path.join(os.tmpdir(), "trueforge_sandboxes", this.sandboxId));
      if (!fs.existsSync(this.sandboxDir)) {
        fs.mkdirSync(this.sandboxDir, { recursive: true });
      }
    }
  }

  private sanitizeEnv(customEnv?: Record<string, string>): NodeJS.ProcessEnv {
    const sensitivePattern = /(_KEY|_SECRET|_TOKEN|_PASSWORD|AWS_|GITHUB_|SLACK_|DATABASE_|SUPABASE_|OPENAI_|ANTHROPIC_|AUTH_|CREDENTIAL_)/i;
    const sanitized: NodeJS.ProcessEnv = {};

    for (const [k, v] of Object.entries(process.env)) {
      if (!sensitivePattern.test(k) && v !== undefined) {
        sanitized[k] = v;
      }
    }

    // Network isolation flags (blackholing socket routing)
    const networkFlags: NodeJS.ProcessEnv = {
      HTTP_PROXY: "http://127.0.0.1:0",
      HTTPS_PROXY: "http://127.0.0.1:0",
      ALL_PROXY: "socks5://127.0.0.1:0",
      NO_PROXY: "",
      NODE_TLS_REJECT_UNAUTHORIZED: "1",
      TRUEFORGE_NETWORK_ISOLATED: "true",
    };

    return {
      ...sanitized,
      ...networkFlags,
      TRUEFORGE_SANDBOX_ID: this.sandboxId,
      NODE_ENV: "test",
      CI: "true",
      ...customEnv,
    };
  }

  public resolveSafePath(filePath: string): string {
    // 1. Reject null-byte injection
    if (filePath.includes("\0")) {
      throw new Error(`Security Violation: Null byte detected in file path (${filePath})`);
    }

    // 2. Reject Windows DOS device names and raw UNC paths
    if (/^((\\\\[^\\]+)|(\/\/[^\/]+))|\b(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(filePath)) {
      throw new Error(`Security Violation: Forbidden device or UNC path (${filePath})`);
    }

    const normalizedDir = path.resolve(this.sandboxDir);
    const fullPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(normalizedDir, filePath);

    // 3. Prevent standard traversal outside directory
    if (!fullPath.startsWith(normalizedDir)) {
      throw new Error(`Security Violation: Path traversal escape outside sandbox boundary (${filePath})`);
    }

    // 4. Resolve symlinks if file exists to prevent symlink target escape
    if (fs.existsSync(fullPath)) {
      const realPath = fs.realpathSync(fullPath);
      if (!realPath.startsWith(normalizedDir)) {
        throw new Error(`Security Violation: Symlink escape outside sandbox boundary (${filePath} -> ${realPath})`);
      }
      return realPath;
    }

    return fullPath;
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveSafePath(filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf8");
  }

  public async readFile(filePath: string): Promise<string | undefined> {
    const fullPath = this.resolveSafePath(filePath);
    if (!fs.existsSync(fullPath)) return undefined;
    return fs.readFileSync(fullPath, "utf8");
  }

  /**
   * Execute command safely with argument array (Zero shell interpolation, prevents injection).
   */
  public async execSafe(executable: string, args: string[], customCwd?: string): Promise<SandboxExecResult> {
    const startTime = Date.now();
    const cwd = customCwd ? path.resolve(customCwd) : this.sandboxDir;

    const emit = (str: string) => {
      if (this.onStdoutChunk) {
        this.onStdoutChunk(str);
      }
    };

    emit(`\x1b[36m[TrueForge-Sandbox:${this.sandboxId}]\x1b[0m $ ${executable} ${args.join(" ")}\n`);

    return new Promise((resolve) => {
      const child = spawn(executable, args, {
        cwd,
        timeout: this.timeoutMs,
        shell: false, // Strict: no shell wrapper, zero metacharacter expansion
        env: this.sanitizeEnv(this.options?.env),
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        const str = data.toString();
        stdout += str;
        emit(str);
      });

      child.stderr?.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        emit(`\x1b[33m${str}\x1b[0m`);
      });

      child.on("error", (err) => {
        stderr += err.message;
      });

      child.on("close", (code) => {
        const durationMs = Date.now() - startTime;
        let exitCode = code ?? 0;

        if (child.killed) {
          exitCode = 124;
          const timeoutMsg = `[Sandbox-Timeout] Process exceeded execution limit of ${this.timeoutMs}ms\n`;
          stderr += timeoutMsg;
          emit(`\x1b[31m${timeoutMsg}\x1b[0m`);
        }

        if (exitCode === 0) {
          emit(`\x1b[32m✓ Process finished (exit: 0, ${durationMs}ms)\x1b[0m\n`);
        } else {
          emit(`\x1b[31m✗ Process failed (exit: ${exitCode}, ${durationMs}ms)\x1b[0m\n`);
        }

        resolve({
          exitCode,
          stdout,
          stderr,
          durationMs,
        });
      });
    });
  }

  public async exec(command: string, customCwd?: string): Promise<SandboxExecResult> {
    const startTime = Date.now();
    const cwd = customCwd ? path.resolve(customCwd) : this.sandboxDir;

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
          env: this.sanitizeEnv(this.options?.env),
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const outStr = stdout ? stdout.toString() : "";
          let errStr = stderr ? stderr.toString() : "";
          let exitCode = error ? (error.code ?? 1) : 0;

          if (error && error.killed) {
            exitCode = 124;
            // Tree kill to clean up any orphaned descendants
            this.killProcessTree(child.pid);
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

  private killProcessTree(pid?: number): void {
    if (!pid) return;
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
      } else {
        process.kill(-pid, "SIGKILL");
      }
    } catch {
      // Process already terminated
    }
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
