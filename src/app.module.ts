import { Module } from '@nestjs/common';
import { RideModule } from './ride/ride.module.js';
import { UserRideModule } from './user-ride/user-ride.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransportRideTypeModule } from './transport-ride-type/transport-ride-type.module.js';
import { PostgresConfigService } from './config/postgres.config.service.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';

// SPEC_DEVIATION: dropped the redundant `TypeOrmModule.forRoot(dataSourceOptions)`
// static registration that used to sit alongside forRootAsync below.
// Reason: design.md's Risks table flagged this dual registration as a pre-existing
// issue with "no functional impact expected", to be validated but not fixed in this
// feature. Validating it while wiring AuthController (T13) showed real impact: the
// static registration (which globs compiled dist/**/*.entity.js classes) was
// winning Nest's DI resolution for `@InjectRepository()` app-wide over the
// autoLoadEntities-based forRootAsync connection below, so every repository call
// (not just UserService) hit "No metadata found" against real Postgres - AuthService
// couldn't complete signup/login at all (500s in e2e). `dataSourceOptions` (from
// datasource.config.ts) is only otherwise used by the TypeORM CLI directly via its
// own `-d` flag for migrations, so removing this Nest-side registration doesn't
// touch migrations.
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
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
