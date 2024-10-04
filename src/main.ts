import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS
  app.enableCors({
    origin: ['http://localhost:3001'], // Địa chỉ của frontend
    credentials: true, // Cho phép gửi cookie (nếu cần)
  });

  await app.listen(3000); // Cổng backend
}

bootstrap();
