import { Module } from '@nestjs/common';
import { RideModule } from './ride/ride.module.js';
import { UserRideModule } from './user-ride/user-ride.module.js';
import { PostgresConfigService } from './config/postgres.config.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransportRideTypeModule } from './transport-ride-type/transport_ride_type.module.js';

@Module({
  imports: [
    RideModule, 
    UserRideModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: PostgresConfigService,
      inject: [PostgresConfigService]
    }),
    TransportRideTypeModule,
  ],
})
export class AppModule {}
