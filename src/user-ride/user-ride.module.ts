import { Module } from '@nestjs/common';
import { UserRideController } from './user-ride.controller.js';
import { UserRideService } from './user-ride.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRideEntity } from './entities/user-ride.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRideEntity]),
  ],
  controllers: [UserRideController],
  providers: [UserRideService]
})
export class UserRideModule {}
