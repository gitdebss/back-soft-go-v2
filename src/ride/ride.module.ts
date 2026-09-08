import { Module } from '@nestjs/common';
import { RideController } from './ride.controller.js';
import { RideService } from './ride.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideEntity } from './entities/ride.entity.js';
import { TransportRideTypeEntity } from '../transport-ride-type/entities/transport-ride-type.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RideEntity, TransportRideTypeEntity]),
  ],
  controllers: [RideController],
  providers: [RideService],
})
export class RideModule {}
