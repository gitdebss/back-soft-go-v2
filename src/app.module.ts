import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RideService } from './ride/ride.service.js';
import { RideModule } from './ride/ride.module.js';
import { UserRideModule } from './user-ride/user-ride.module.js';

@Module({
  imports: [RideModule, UserRideModule],
  controllers: [AppController],
  providers: [AppService, RideService],
})
export class AppModule {}
