import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertTransportRideTypes1789500253051 implements MigrationInterface {
    name = 'InsertTransportRideTypes1789500253051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO transport_ride_type (name)
            VALUES
                ('Uber'),
                ('Carro'),
                ('Ônibus');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM transport_ride_type
            WHERE name IN ('Uber', 'Carro', 'Ônibus');`
        );
    }

}
