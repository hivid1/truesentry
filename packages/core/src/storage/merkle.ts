import crypto from "crypto";

export class IncidentMerkleTree {
  public static computeRoot(events: Array<{ eventId: string; type: string; timestamp: number }>): string {
    if (events.length === 0) return crypto.createHash("sha256").update("EMPTY_TREE").digest("hex");

    const leafHashes = events.map((e) =>
      crypto.createHash("sha256").update(`${e.eventId}:${e.type}:${e.timestamp}`).digest("hex")
    );

    let currentLevel = leafHashes;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(crypto.createHash("sha256").update(left + right).digest("hex"));
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }
}
