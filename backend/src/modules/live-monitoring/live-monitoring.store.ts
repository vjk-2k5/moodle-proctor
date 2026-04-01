type LiveFrameRecord = {
  roomCode: string;
  attemptId: number | null;
  userId: number;
  studentName: string;
  imageBase64: string;
  mimeType: string;
  updatedAt: number;
};

const MAX_RECORDS = 100;
const FRAME_TTL_MS = 20_000;

class LiveMonitoringStore {
  private readonly frames = new Map<string, LiveFrameRecord>();

  upsertFrame(record: Omit<LiveFrameRecord, 'updatedAt'> & { updatedAt?: number }) {
    const key = this.getKey(record.roomCode, record.attemptId, record.userId);

    this.frames.set(key, {
      ...record,
      updatedAt: record.updatedAt ?? Date.now(),
    });

    this.prune();
  }

  getRoomFrames(roomCode: string): LiveFrameRecord[] {
    this.prune();

    return Array.from(this.frames.values())
      .filter(frame => frame.roomCode.toUpperCase() === roomCode.toUpperCase())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private getKey(roomCode: string, attemptId: number | null, userId: number) {
    return `${roomCode.toUpperCase()}:${attemptId ?? 'no-attempt'}:${userId}`;
  }

  private prune() {
    const now = Date.now();

    for (const [key, frame] of this.frames.entries()) {
      if (now - frame.updatedAt > FRAME_TTL_MS) {
        this.frames.delete(key);
      }
    }

    if (this.frames.size <= MAX_RECORDS) {
      return;
    }

    const overflow = this.frames.size - MAX_RECORDS;
    const oldestKeys = Array.from(this.frames.entries())
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, overflow)
      .map(([key]) => key);

    for (const key of oldestKeys) {
      this.frames.delete(key);
    }
  }
}

export const liveMonitoringStore = new LiveMonitoringStore();

export type { LiveFrameRecord };
