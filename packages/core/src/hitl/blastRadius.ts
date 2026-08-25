export interface BlastRadiusParams {
  affectedServicesCount: number;
  lockDurationMs: number;
  isDestructive: boolean;
}

export class BlastRadiusCalculator {
  public static calculate(params: BlastRadiusParams): number {
    let score = 0;
    // Downstream service weight (max 30 pts)
    score += Math.min(params.affectedServicesCount * 8, 30);

    // Lock duration weight (max 30 pts)
    if (params.lockDurationMs > 5000) score += 30;
    else if (params.lockDurationMs > 1000) score += 20;
    else if (params.lockDurationMs > 100) score += 10;
    else score += 4;

    // Destructive data loss potential (max 40 pts)
    if (params.isDestructive) {
      score += 40;
    } else {
      score += 5; // Schema-only / index change
    }

    return Math.min(Math.max(score, 1), 100);
  }
}
