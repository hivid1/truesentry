export interface ChaosFault {
  id: string;
  name: string;
  targetComponent: "POSTGRES" | "API_GATEWAY" | "KUBERNETES" | "REDIS";
  intensity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  durationSeconds: number;
  injectedAt: number;
  status: "ACTIVE" | "HEALED" | "ABORTED";
}

export class ChaosFaultInjector {
  private activeFaults: Map<string, ChaosFault> = new Map();

  public injectFault(faultType: "DEADLOCK" | "PACKET_DROP" | "MEMORY_PRESSURE" | "CORRUPT_MIGRATION"): ChaosFault {
    const faultId = `flt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let fault: ChaosFault;

    switch (faultType) {
      case "DEADLOCK":
        fault = {
          id: faultId,
          name: "PostgreSQL pg_locks Exclusive Deadlock Contention",
          targetComponent: "POSTGRES",
          intensity: "CRITICAL",
          durationSeconds: 120,
          injectedAt: Date.now(),
          status: "ACTIVE",
        };
        break;
      case "PACKET_DROP":
        fault = {
          id: faultId,
          name: "API Gateway 40% Ingress Packet Drop",
          targetComponent: "API_GATEWAY",
          intensity: "HIGH",
          durationSeconds: 60,
          injectedAt: Date.now(),
          status: "ACTIVE",
        };
        break;
      case "MEMORY_PRESSURE":
        fault = {
          id: faultId,
          name: "V8 Heap Allocation Leak (98% RSS)",
          targetComponent: "KUBERNETES",
          intensity: "HIGH",
          durationSeconds: 90,
          injectedAt: Date.now(),
          status: "ACTIVE",
        };
        break;
      case "CORRUPT_MIGRATION":
        fault = {
          id: faultId,
          name: "Un-indexed Foreign Key Constraint Migration",
          targetComponent: "POSTGRES",
          intensity: "CRITICAL",
          durationSeconds: 300,
          injectedAt: Date.now(),
          status: "ACTIVE",
        };
        break;
    }

    this.activeFaults.set(faultId, fault);
    return fault;
  }

  public healFault(faultId: string): boolean {
    const fault = this.activeFaults.get(faultId);
    if (!fault) return false;
    fault.status = "HEALED";
    return true;
  }

  public getActiveFaults(): ChaosFault[] {
    return Array.from(this.activeFaults.values()).filter((f) => f.status === "ACTIVE");
  }
}
