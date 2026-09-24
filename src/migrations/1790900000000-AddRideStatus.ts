import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRideStatus1790900000000 implements MigrationInterface {
    name = 'AddRideStatus1790900000000'

    // Ao contrário da migration de propriedade da carona, esta não apaga nada:
    // o default `active` já descreve corretamente toda carona que existe hoje,
    // porque até agora não havia como cancelar nenhuma.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "ride_status_enum" AS ENUM('active', 'canceled', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "status" "ride_status_enum" NOT NULL DEFAULT 'active'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "ride_status_enum"`);
    }

}
