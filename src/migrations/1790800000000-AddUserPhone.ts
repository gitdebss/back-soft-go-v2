import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPhone1790800000000 implements MigrationInterface {
    name = 'AddUserPhone1790800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(15)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }

}
