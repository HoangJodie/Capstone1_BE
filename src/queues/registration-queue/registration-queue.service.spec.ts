import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationQueueService } from './registration-queue.service';

describe('RegistrationQueueService', () => {
  let service: RegistrationQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationQueueService],
    }).compile();

    service = module.get<RegistrationQueueService>(RegistrationQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
