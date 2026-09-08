import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { RideEntity } from "../ride/entities/ride.entity.js";
import { UserRideEntity } from "../user-ride/entities/user-ride.entity.js";

@Injectable()
export class PostgresConfigService implements TypeOrmOptionsFactory {
    constructor(private readonly configService: ConfigService) { }

    createTypeOrmOptions(): TypeOrmModuleOptions {
        console.log({
            host: this.configService.get<string>('DB_HOST'),
            port: this.configService.get<string>('DB_PORT'),
            username: this.configService.get<string>('DB_USERNAME'),
            database: this.configService.get<string>('DB_NAME'),
        });
        
        return {
            type: 'postgres',
            host: this.configService.get<string>('DB_HOST'),
            port: Number(this.configService.get<string>('DB_PORT')),
            username: this.configService.get<string>('DB_USERNAME'),
            password: this.configService.get<string>('DB_PASSWORD'),
            database: this.configService.get<string>('DB_NAME'),
            autoLoadEntities: true,
            synchronize: true,
        };
    }
}