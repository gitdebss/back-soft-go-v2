import { Module } from '@nestjs/common';
import { RideModule } from './ride/ride.module.js';
import { UserRideModule } from './user-ride/user-ride.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransportRideTypeModule } from './transport-ride-type/transport-ride-type.module.js';
import { dataSourceOptions } from './config/datasource.config.js';
import { PostgresConfigService } from './config/postgres.config.service.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    RideModule,
    UserRideModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forRootAsync({
      useClass: PostgresConfigService,
      inject: [PostgresConfigService]
    }),
    TransportRideTypeModule,
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
