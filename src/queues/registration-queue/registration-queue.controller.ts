import { Controller, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { RegistrationQueueService } from './registration-queue.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { DatabaseService } from 'src/database/database.service';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class RegistrationQueueController {
  constructor(
    private readonly queueService: RegistrationQueueService,
    private readonly database: DatabaseService,
  ) {}

  @Post(':classId/queue-registration')
  async addToQueue(@Param('classId') classId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const classIdNum = parseInt(classId);

      // Kiểm tra số lượng slot còn lại
      const currentCount = await this.database.user_class.count({
        where: { class_id: classIdNum }
      });

      const classInfo = await this.database.renamedclass.findUnique({
        where: { class_id: classIdNum },
        select: { maxAttender: true }
      });

      if (!classInfo) {
        return {
          success: false,
          message: 'Không tìm thấy lớp học'
        };
      }

      // Tính tổng số người đang đăng ký
      const totalCount = currentCount + this.queueService.getQueueCount(classIdNum);

      if (totalCount >= classInfo.maxAttender) {
        return {
          success: false,
          message: 'Lớp học đã đầy'
        };
      }

      // Thêm vào queue
      this.queueService.addToQueue(classIdNum, userId);

      return {
        success: true,
        message: 'Đã thêm vào hàng đợi đăng ký'
      };

    } catch (error) {
      console.error('Lỗi đăng ký hàng đợi:', error);
      return {
        success: false,
        message: 'Không thể đăng ký vào hàng đợi'
      };
    }
  }

  @Delete(':classId/queue-registration')
  removeFromQueue(@Param('classId') classId: string, @Request() req) {
    const userId = req.user.id;
    const classIdNum = parseInt(classId);

    this.queueService.removeFromQueue(classIdNum, userId);

    return {
      success: true,
      message: 'Đã hủy đăng ký'
    };
  }

  @Post(':classId/complete-registration') 
  async completeRegistration(@Param('classId') classId: string, @Request() req) {
    const userId = req.user.id;
    const classIdNum = parseInt(classId);

    try {
      // Kiểm tra xem user có trong queue không
      if (!this.queueService.isInQueue(classIdNum, userId)) {
        return {
          success: false,
          message: 'Yêu cầu đăng ký đã hết hạn hoặc không tồn tại'
        };
      }

      // Kiểm tra lại số lượng slot
      const currentCount = await this.database.user_class.count({
        where: { class_id: classIdNum }
      });

      const classInfo = await this.database.renamedclass.findUnique({
        where: { class_id: classIdNum },
        select: { maxAttender: true }
      });

      if (currentCount >= classInfo.maxAttender) {
        this.queueService.removeFromQueue(classIdNum, userId);
        return {
          success: false,
          message: 'Lớp học hiện đã đầy'
        };
      }

      // Thực hiện đăng ký
      await this.database.user_class.create({
        data: {
          user_id: userId,
          class_id: classIdNum
        }
      });

      // Xóa khỏi queue
      this.queueService.removeFromQueue(classIdNum, userId);

      return {
        success: true,
        message: 'Đăng ký thành công'
      };

    } catch (error) {
      this.queueService.removeFromQueue(classIdNum, userId);
      return {
        success: false,
        message: 'Không thể hoàn tất đăng ký'
      };
    }
  }
}
