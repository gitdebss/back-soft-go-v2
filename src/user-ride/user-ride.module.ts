import { Module } from '@nestjs/common';
import { UserRideController } from './user-ride.controller.js';
import { UserRideService } from './user-ride.service.js';

@Module({
  controllers: [UserRideController],
  providers: [UserRideService]
})
export class UserRideModule {}
