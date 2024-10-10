import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS
  app.enableCors({
    origin: ['http://localhost:5173'], // Địa chỉ của frontend
    credentials: true, // Cho phép gửi cookie (nếu cần)
  });
  app.useGlobalPipes(new ValidationPipe()); // Sử dụng ValidationPipe
  await app.listen(3000); // Cổng backend
}

bootstrap();
