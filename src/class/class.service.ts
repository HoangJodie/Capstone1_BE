/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Renamedclass } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

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
    maxAttender: number
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
          maxAttender: maxAttender 
        },
      });
      return newClass; // Trả về lớp học mới đã được thêm vào
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to add class.'); // Thông báo lỗi
    }
  }
  
<<<<<<< Updated upstream
=======
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
    maxAttender: number
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
  

  
>>>>>>> Stashed changes

  

  async editClass(
    class_id: number,
    class_name: string,
    class_description: string,
    status_id: number,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
    image_url?: string, // Thêm tham số image_url
    oldImageId?: string // ID hình ảnh cũ
  ) {
    try {
      // Nếu có hình ảnh mới, thay thế hình ảnh cũ
      if (image_url && oldImageId) {
        // Xóa hình ảnh cũ
        await this.cloudinaryService.deleteImage(oldImageId);
      }
  
      const updatedClass = await this.prisma.renamedclass.update({
        where: { class_id: class_id },
        data: {
          class_name: class_name,
          class_description: class_description,
          status_id: status_id,
          class_type: class_type,
          start_date: start_date,
          end_date: end_date,
          fee: fee,
          ...(image_url && { image_url }), // Chỉ cập nhật nếu có image_url
        },
      });
      return updatedClass;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to update class.');
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
      return await this.prisma.renamedclass.delete({
        where: { class_id },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to delete class.');
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
      const result: any[] = await this.prisma.$queryRaw`
          CALL GetClassAndScheduleByClassOrScheduleID(${class_id}, null);
      `;

      if (result.length === 0) {
        throw new NotFoundException('Class or schedule not found.');
      }

      const classData = result[0];
      const schedules = result.map(schedule => ({
        days: schedule.f7,
        start_hour: schedule.f8,
        end_hour: schedule.f9,
      }));

      return {
        class_name: classData.f0,
        class_description: classData.f1,
        status_id: classData.f2,
        class_type: classData.f3,
        start_date: classData.f4,
        end_date: classData.f5,
        fee: classData.f6,
        schedules: schedules,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to fetch class and schedules.');
    }
  }

  //lấy class dựa trên status_id
  async findByStatus(status_id: number) {
    return this.prisma.renamedclass.findMany({ where: { status_id } });
  }

  // Lấy tất cả các lớp và trả về kèm với URL hình ảnh từ database
  async getAllClass(): Promise<Renamedclass[]> {
    try {
      const classes = await this.prisma.renamedclass.findMany();
      return classes.map(cls => ({
        ...cls,
        imageUrl: cls.image_url, // URL hình ảnh được lưu trong trường image_url
      }));
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw new InternalServerErrorException('Unable to fetch classes.');
    }
  }
}
