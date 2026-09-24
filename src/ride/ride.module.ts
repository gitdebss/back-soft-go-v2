import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RideController } from './ride.controller.js';
import { RideService } from './ride.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideEntity } from './entities/ride.entity.js';
import { TransportRideTypeEntity } from '../transport-ride-type/entities/transport-ride-type.entity.js';
import { UserRideEntity } from '../user-ride/entities/user-ride.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RideEntity, TransportRideTypeEntity, UserRideEntity]),
    AuthModule,
  ],
  controllers: [RideController],
  providers: [RideService],
})
export class RideModule {}
