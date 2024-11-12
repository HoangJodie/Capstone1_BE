/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Renamedclass, user_class } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

interface EditClassParams {
  class_id: number;
  class_name: string;
  class_description: string;
  status_id: number;
  class_type: number;
  fee: number;
  start_date: Date;
  end_date: Date;
  image_url?: string;
  oldImageId?: string;
  pt_id: number;
  maxAttender: number;
  class_subject: string;
}

interface ClassSearchResult {
  class_id: number;
  class_name: string;
  class_description: string;
  status_id: number;
  class_type: number;
  fee: number;
  start_date: Date;
  end_date: Date;
  image_url: string;
  pt_id: number;
  maxAttender: number;
  class_subject: string;
  trainer_name: string;
  current_attender: number;
  remainingSlots: number;
}

@Injectable()
export class ClassService {
  constructor(private prisma: DatabaseService, private cloudinaryService: CloudinaryService) { }

  async addClass(
    class_name: string,
    class_description: string,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
    image_url: string, // Thêm tham số image_url
    pt_id: number,
    maxAttender: number,
    class_subject: string
  ) {
    try {
      const newClass = await this.prisma.renamedclass.create({
        data: {
          class_name: class_name,
          class_description: class_description,
          status_id: 1, // Trạng thái lớp học mặc định
          class_type: class_type, // class_type phải là số nguyên
          start_date: start_date, // start_date là kiểu Date
          end_date: end_date, // end_date là kiểu Date
          fee: fee, // fee là kiểu số thập phân
          image_url: image_url, // Lưu URL vào cơ sở dữ liệu
          pt_id: pt_id,
          maxAttender: maxAttender,
          class_subject: class_subject,
        },
      });
      return newClass; // Trả về lớp học mới đã được thêm vào
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to add class.'); // Thông báo lỗi
    }
  }

  //Addclass cho PT
  async addClassWithOwnership(
    class_name: string,
    class_description: string,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
    image_url: string,
    user_id: number,
    maxAttender: number,
    class_subject: string
  ): Promise<Renamedclass> {
    try {
      console.log('Adding class with data:', {
        class_name,
        class_description,
        class_type,
        fee,
        start_date,
        end_date,
        image_url,
        user_id,
        maxAttender,
        class_subject,
      }); // Log dữ liệu đầu vào
  
      // Tạo bản ghi mới trong bảng Renamedclass
      const newClass = await this.prisma.renamedclass.create({
        data: {
          class_name: class_name,
          class_description: class_description,
          status_id: 1,
          class_type: class_type,
          start_date: start_date,
          end_date: end_date,
          fee: fee,
          image_url: image_url,
          pt_id: user_id,
          maxAttender: maxAttender,
          class_subject: class_subject,
        },
      });
  
      console.log('New class created:', newClass); // Log lớp học vừa tạo
  
      // Tạo bản ghi liên kết giữa user và class trong bảng user_class
      await this.prisma.user_class.create({
        data: {
          user_id: user_id,
          class_id: newClass.class_id,
          status_id: 1,
        },
      });
  
      return newClass; // Trả về thông tin lớp học vừa tạo
    } catch (error) {
      console.error('Error adding class:', error); // Log lỗi nếu có
      throw new InternalServerErrorException('Unable to add class.');
    }
  }
  

  async editClass(params: EditClassParams): Promise<Renamedclass> {
    const {
      class_id,
      class_name,
      class_description,
      status_id,
      class_type,
      fee,
      start_date,
      end_date,
      image_url,
      pt_id,
      maxAttender,
      class_subject
    } = params;

    try {
      // Nếu có image_url mới, cập nhật với image mới
      if (image_url) {
        if (params.oldImageId) {
          // Xóa ảnh cũ nếu có
          await this.cloudinaryService.deleteImage(params.oldImageId);
        }

        return await this.prisma.renamedclass.update({
          where: { class_id },
          data: {
            class_name,
            class_description,
            status_id,
            class_type,
            fee,
            start_date,
            end_date,
            image_url,
            pt_id,
            maxAttender,
            class_subject
          },
        });
      }

      // Nếu không có image mới, cập nhật không có image
      return await this.prisma.renamedclass.update({
        where: { class_id },
        data: {
          class_name,
          class_description,
          status_id,
          class_type,
          fee,
          start_date,
          end_date,
          pt_id,
          maxAttender,
          class_subject
        },
      });
    } catch (error) {
      console.error('Error in editClass:', error);
      throw new Error('Failed to update class');
    }
  }

  // sửa status id của class
  async updateStatus(classId: number, statusId: number) {
    const updatedClass = await this.prisma.renamedclass.update({
      where: { class_id: classId }, // Assuming 'id' is the primary key for classes
      data: { status_id: statusId },
    });

    if (!updatedClass) {
      throw new NotFoundException('Class not found');
    }

    return updatedClass;
  }
  
  // Xóa một lớp
  async deleteClass(class_id: number): Promise<Renamedclass> {
    try {
      // Thực hiện xóa theo thứ tự để tránh vi phạm ràng buộc khóa ngoại
      
      // 1. Xóa tất cả các bản ghi trong bảng schedule liên quan đến lớp học
      await this.prisma.schedule.deleteMany({
        where: { class_id },
      });

      // 2. Xóa tất cả các bản ghi trong bảng user_class liên quan đến lớp học
      await this.prisma.user_class.deleteMany({
        where: { class_id },
      });

      // 3. Lấy thông tin lớp học trước khi xóa để lấy image_url
      const classToDelete = await this.prisma.renamedclass.findUnique({
        where: { class_id },
      });

      if (!classToDelete) {
        throw new NotFoundException('Không tìm thấy lớp học');
      }

      // 4. Xóa lớp học từ bảng renamedclass
      const deletedClass = await this.prisma.renamedclass.delete({
        where: { class_id },
      });

      // 5. Nếu có image_url, xóa ảnh từ Cloudinary
      if (classToDelete.image_url) {
        const publicId = classToDelete.image_url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      }

      return deletedClass;
    } catch (error) {
      console.error('Lỗi khi xóa lớp học:', error);
      throw new InternalServerErrorException('Không thể xóa lớp học. Vui lòng thử lại sau.');
    }
  }

  // Lấy thông tin lớp
  async getClassInfo(class_id: number): Promise<any> {
    try {
      const result = await this.prisma.renamedclass.findUnique({
        where: { class_id: class_id },
        select: {
          class_name: true,
          class_description: true,
          status_id: true,
          class_type: true,
          start_date: true,
          end_date: true,
          fee: true,
          image_url: true, 
          pt_id: true,
          maxAttender: true,
        },
      });

      if (!result) {
        throw new NotFoundException('Class not found.');
      }
      return result; // Trả về thông tin lớp
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to fetch class info.');
    }
  }

  // Lấy class và tất cả schedule của nó
  async getClass(class_id: number): Promise<any> {
    try {
      // Lấy thông tin lớp học
      const classDetail = await this.prisma.renamedclass.findUnique({
        where: { class_id: class_id }
      });

      if (!classDetail) {
        throw new NotFoundException('Class not found');
      }

      // Lấy thông tin PT riêng
      const trainer = await this.prisma.user.findUnique({
        where: { user_id: classDetail.pt_id },
        select: { name: true }
      });

      // Lấy số lượng học viên
      const currentAttenders = await this.prisma.user_class.count({
        where: {
          class_id: class_id,
          status_id: 1
        }
      });

      return {
        ...classDetail,
        currentAttender: currentAttenders,
        remainingSlots: classDetail.maxAttender - currentAttenders,
        trainer_name: trainer?.name
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to fetch class details.');
    }
  }

  //lấy class dựa trên status_id
  async findByStatus(status_id: number) {
    return this.prisma.renamedclass.findMany({ where: { status_id } });
  }

  // Lấy tất cả các lớp và trả về kèm với URL hình ảnh từ database
  async getAllClass(): Promise<any[]> {
    try {
      const classes = await this.prisma.renamedclass.findMany({
        select: {
          class_id: true,
          class_name: true,
          class_description: true,
          status_id: true,
          class_type: true,
          fee: true,
          start_date: true,
          end_date: true,
          image_url: true,
          pt_id: true,
          maxAttender: true,
          class_subject: true, 
        }
      });

      // Lấy số lượng học viên cho từng lớp và xử lý dữ liệu
      const classesWithDetails = await Promise.all(
        classes.map(async (cls) => {
          const currentAttender = await this.prisma.user_class.count({
            where: {
              class_id: cls.class_id,
              status_id: 1
            }
          });

          const trainer = await this.prisma.user.findUnique({
            where: { user_id: cls.pt_id },
            select: { name: true }
          });

          // Chuyển đổi Decimal sang number cho fee và thêm các thông tin bổ sung
          return {
            ...cls,
            fee: Number(cls.fee),
            imageUrl: cls.image_url,
            trainer_name: trainer?.name || 'Chưa có PT',
            currentAttender: currentAttender,
            remainingSlots: cls.maxAttender - currentAttender
          };
        })
      );

      return classesWithDetails;
    } catch (error) {
      console.error('Error fetching all classes:', error);
      throw new InternalServerErrorException('Unable to fetch classes.');
    }
  }

  async getClassesOwnedByPT(userId: number): Promise<any[]> {
    try {
      const classes = await this.prisma.renamedclass.findMany({
        where: {
          pt_id: userId
        }
      });

      // Lấy số lượng học viên cho từng lớp
      const classesWithAttenders = await Promise.all(
        classes.map(async (cls) => {
          const currentAttenders = await this.prisma.user_class.count({
            where: {
              class_id: cls.class_id,
              status_id: 1
            }
          });

          return {
            ...cls,
            imageUrl: cls.image_url,
            currentAttender: currentAttenders,
            remainingSlots: cls.maxAttender - currentAttenders
          };
        })
      );

      return classesWithAttenders;
    } catch (error) {
      console.error('Error fetching classes owned by PT:', error);
      throw new InternalServerErrorException('Unable to fetch classes owned by PT.');
    }
  }
  
  
  
  
  
  
  

  async searchClassesByName(name: string): Promise<any[]> {
    try {
      const classes = await this.prisma.renamedclass.findMany({
        where: {
          class_name: {
            contains: name
          }
        }
      });

      // Lấy thông tin PT và số lượng học viên cho từng lớp
      const classesWithDetails = await Promise.all(
        classes.map(async (cls) => {
          const trainer = await this.prisma.user.findUnique({
            where: { user_id: cls.pt_id },
            select: { name: true }
          });

          const currentAttender = await this.prisma.user_class.count({
            where: {
              class_id: cls.class_id,
              status_id: 1
            }
          });

          // Chuyển đổi Decimal sang number cho fee
          const classData = {
            ...cls,
            fee: Number(cls.fee),
            trainer_name: trainer?.name || 'Chưa có PT',
            current_attender: currentAttender,
            remainingSlots: cls.maxAttender - currentAttender
          };

          return classData;
        })
      );

      return classesWithDetails;
    } catch (error) {
      console.error('Lỗi chi tiết khi tìm kiếm lớp:', error);
      throw new InternalServerErrorException('Không thể tìm kiếm lớp');
    }
  }

}
