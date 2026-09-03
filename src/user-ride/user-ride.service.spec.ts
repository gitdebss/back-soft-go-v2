import { Test, TestingModule } from '@nestjs/testing';
import { UserRideService } from './user-ride.service.js';

describe('UserRideService', () => {
  let service: UserRideService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRideService],
    }).compile();

    service = module.get<UserRideService>(UserRideService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
