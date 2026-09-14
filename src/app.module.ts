import { Module } from '@nestjs/common';
import { RideModule } from './ride/ride.module.js';
import { UserRideModule } from './user-ride/user-ride.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransportRideTypeModule } from './transport-ride-type/transport-ride-type.module.js';
import { dataSourceOptions } from './config/typeorm.config.js';

@Module({
  imports: [
    RideModule, 
    UserRideModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TransportRideTypeModule,
  ],
})
export class AppModule {}
