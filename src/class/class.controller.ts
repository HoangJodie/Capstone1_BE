/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body, Patch, Delete, HttpException, HttpStatus, UseInterceptors, UploadedFile, InternalServerErrorException } from '@nestjs/common';
import { ClassService } from './class.service';
import { Renamedclass } from '@prisma/client'; // Sử dụng mô hình Renamedclass
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { isValid, parseISO } from 'date-fns';
import { NotFoundException } from '@nestjs/common';

@Controller('classes')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly cloudinaryService: CloudinaryService // Inject CloudinaryService
  ) {}

  // Lấy tất cả các lớp và trả về kèm theo URL hình ảnh
  @Get()
  async getAllClass(): Promise<Renamedclass[]> {
    try {
      const classes = await this.classService.getAllClass();
      return classes; // Trả về danh sách các lớp kèm theo URL hình ảnh
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to fetch classes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('info/:id')
  async getClassInfo(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClassInfo(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  // Lấy lớp theo ID (gồm cả lịch học)
  @Get(':id')
  async getClass(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClass(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  //lấy lớp theo status_id
  @Get('status/:statusId')
  findByStatus(@Param('statusId') statusId: string) {
      return this.classService.findByStatus(+statusId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Sử dụng FileInterceptor để nhận file
  async addClass(
    @Body() classData: { 
      className: string; 
      classDescription: string; 
      classType: string; // Đổi thành string vì giá trị nhận được là string
      fee: string; // Đổi thành string vì giá trị nhận được là string
<<<<<<< Updated upstream
      startDate: string;  
      endDate: string;    
=======
      startDate: string;
      endDate: string;
      pt_id: string;
      maxAttender: string;
>>>>>>> Stashed changes
    },
    @UploadedFile() file: Express.Multer.File 
  ) {
    try {
      if (!file) {
        throw new HttpException('File not provided.', HttpStatus.BAD_REQUEST);
      }
  
      // Log dữ liệu đầu vào
      console.log('Received Class Data:', classData);
  
      // Upload hình ảnh lên Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      
      // Chuyển đổi chuỗi thành đối tượng Date
      const startDate = parseISO(classData.startDate);
      
      // Loại bỏ ký tự không mong muốn và chuyển đổi endDate
      const endDate = parseISO(classData.endDate.trim());
  
      // Log giá trị ngày tháng sau khi chuyển đổi
      console.log('Parsed Start Date:', startDate);
      console.log('Parsed End Date:', endDate);
  
      // Kiểm tra xem các giá trị Date có hợp lệ không
      if (!isValid(startDate) || !isValid(endDate)) {
        throw new HttpException('Invalid date provided.', HttpStatus.BAD_REQUEST);
      }
  
      // Lưu URL hình ảnh vào cơ sở dữ liệu
      const newClass = await this.classService.addClass(
        classData.className,
        classData.classDescription,
        parseInt(classData.classType), // Chuyển đổi thành số nếu cần
        parseInt(classData.fee),        // Chuyển đổi thành số nếu cần
        startDate,
        endDate,
        uploadResult.secure_url,
        parseInt(classData.pt_id),
        parseInt(classData.maxAttender)
      );
  
      return newClass; 
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to add class.');
    }
  }


  @Patch(':id')
@UseInterceptors(FileInterceptor('file'))
async editClass(
  @Param('id') classId: string,
  @Body() classData: {
    className: string;
    classDescription: string;
    statusId: string; // Keep this as string for parsing
    classType: string; // Keep this as string for parsing
    startDate: string;
<<<<<<< Updated upstream
    endDate: string; // Keep this as string for parsing
    fee: string; // Keep this as string for parsing
    oldImageId?: string;
=======
    endDate: string;
    maxAttender: string;
>>>>>>> Stashed changes
  },
  @UploadedFile() file: Express.Multer.File
) {
  const id = parseInt(classId, 10);
  if (isNaN(id)) {
    throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
  }

  try {
    console.log('Received Class Data:', classData);
    
    const startDate = parseISO(classData.startDate.trim());
    const endDate = parseISO(classData.endDate.trim().replace(/\n/g, '')); // Trim newline

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new HttpException('Invalid date provided.', HttpStatus.BAD_REQUEST);
    }

    let imageUrl: string | undefined;
    let oldImageId: string | undefined;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      imageUrl = uploadResult.secure_url;
      oldImageId = classData.oldImageId;
    }

    // Parse to integers
    const updatedClass = await this.classService.editClass(
      id,
      classData.className,
      classData.classDescription,
      parseInt(classData.statusId), // Convert to integer
      parseInt(classData.classType), // Convert to integer
      parseInt(classData.fee), // Convert to integer
      startDate,
      endDate,
<<<<<<< Updated upstream
      imageUrl,
      oldImageId
=======
      uploadResult.secure_url,
      user.user_id,
      parseInt(classData.maxAttender),
>>>>>>> Stashed changes
    );

    return updatedClass;
  } catch (error) {
    console.error(error);
    throw new HttpException('Unable to update class.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


    // sửa status id của lớp
    @Patch(':id/status')
    async updateClassStatus(
      @Param('id') classId: string,
      @Body('statusId') statusId: number,
    ) {
      const updatedClass = await this.classService.updateStatus(+classId, statusId);
      if (!updatedClass) {
        throw new NotFoundException('Class not found');
      }
      return updatedClass;
    }

  // Xóa một lớp
  @Delete(':id')
  async deleteClass(@Param('id') id: string): Promise<Renamedclass> {
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.deleteClass(classId);
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to delete class.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
