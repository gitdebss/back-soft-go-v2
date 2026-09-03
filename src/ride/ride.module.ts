import { Module } from '@nestjs/common';
import { RideController } from './ride.controller.js';

@Module({
  controllers: [RideController]
})
export class RideModule {}
