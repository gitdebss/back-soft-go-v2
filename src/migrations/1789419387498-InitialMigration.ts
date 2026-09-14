import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1789419387498 implements MigrationInterface {
    name = 'InitialMigration1789419387498'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "hour"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "hour" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "city" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "complement"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "complement" character varying`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "obs"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "obs" character varying`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "updated_at" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "phone" character varying(15) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "obs"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "obs" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "complement"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "complement" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "city" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "hour"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "hour" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "date" date NOT NULL`);
    }

}
