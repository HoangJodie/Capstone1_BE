import { Injectable } from '@nestjs/common';

interface QueueItem {
  userId: number;
  timestamp: number;
}

@Injectable()
export class RegistrationQueueService {
  private queues: Map<number, QueueItem[]> = new Map();

  addToQueue(classId: number, userId: number): void {
    if (!this.queues.has(classId)) {
      this.queues.set(classId, []);
    }
    
    // Kiểm tra nếu user đã trong hàng đợi
    const queue = this.queues.get(classId);
    if (!queue.some(item => item.userId === userId)) {
      queue.push({
        userId,
        timestamp: Date.now()
      });
    }
  }

  removeFromQueue(classId: number, userId: number): void {
    if (!this.queues.has(classId)) return;

    const queue = this.queues.get(classId);
    const index = queue.findIndex(item => item.userId === userId);
    
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  isInQueue(classId: number, userId: number): boolean {
    if (!this.queues.has(classId)) return false;
    
    return this.queues.get(classId).some(item => item.userId === userId);
  }

  getQueueCount(classId: number): number {
    if (!this.queues.has(classId)) return 0;
    return this.queues.get(classId).length;
  }

  // Tự động xóa các yêu cầu quá hạn (sau 5 phút)
  cleanExpiredRequests(classId: number): void {
    if (!this.queues.has(classId)) return;

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const queue = this.queues.get(classId);
    
    this.queues.set(
      classId,
      queue.filter(item => item.timestamp > fiveMinutesAgo)
    );
  }
}
