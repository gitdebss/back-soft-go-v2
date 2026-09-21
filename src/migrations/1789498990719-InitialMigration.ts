import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1789498990719 implements MigrationInterface {
    name = 'InitialMigration1789498990719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transport_ride_type" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "PK_2cc01f3920f02553125160a6acf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ride" ("id" SERIAL NOT NULL, "date" DATE NOT NULL, "hour" character varying NOT NULL, "city" character varying NOT NULL, "complement" character varying, "name" character varying NOT NULL, "total_spots" integer NOT NULL, "obs" character varying, "phone" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "deleted_at" TIMESTAMP, "transport_type_id" integer NOT NULL, CONSTRAINT "PK_f6bc30c4dd875370bafcb54af1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ride_user" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "phone" character varying(15) NOT NULL, "id_ride" integer NOT NULL, CONSTRAINT "PK_5aa9cf38a33da4d5e5a03df37b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_d8efce9061043222a79f9c9d62d" FOREIGN KEY ("transport_type_id") REFERENCES "transport_ride_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD CONSTRAINT "FK_c980e829bcaefc5dd6fbbbe35f8" FOREIGN KEY ("id_ride") REFERENCES "ride"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride_user" DROP CONSTRAINT "FK_c980e829bcaefc5dd6fbbbe35f8"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_d8efce9061043222a79f9c9d62d"`);
        await queryRunner.query(`DROP TABLE "ride_user"`);
        await queryRunner.query(`DROP TABLE "ride"`);
        await queryRunner.query(`DROP TABLE "transport_ride_type"`);
    }

}
