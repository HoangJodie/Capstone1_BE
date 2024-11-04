import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number; // Hoặc kiểu dữ liệu phù hợp với bạn
        role?: string;    // Có thể có thêm các thuộc tính khác nếu cần
        // Bạn có thể thêm bất kỳ thuộc tính nào khác mà bạn muốn
      };
    }
  }
}
