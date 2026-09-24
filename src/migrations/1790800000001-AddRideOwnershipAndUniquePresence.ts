import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRideOwnershipAndUniquePresence1790800000001 implements MigrationInterface {
    name = 'AddRideOwnershipAndUniquePresence1790800000001'

    // As linhas existentes de `ride` e `ride_user` foram gravadas antes da
    // autenticação: guardam nome e telefone digitados e não têm como ser
    // atribuídas a nenhuma conta. Apagá-las é o que permite criar `user_id`
    // como NOT NULL e transformar a regra "uma confirmação por pessoa por
    // carona" em constraint de banco. Decisão registrada na spec (GA-3b).
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "ride_user"`);
        await queryRunner.query(`DELETE FROM "ride"`);

        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "user_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_ride_owner_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "ride_user" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "ride_user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD "user_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD CONSTRAINT "FK_ride_user_passenger_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD CONSTRAINT "UQ_ride_user_ride_user" UNIQUE ("id_ride", "user_id")`);
    }

    // `name` e `phone` voltam como nullable: os valores originais foram
    // apagados no `up` e não são recuperáveis.
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride_user" DROP CONSTRAINT "UQ_ride_user_ride_user"`);
        await queryRunner.query(`ALTER TABLE "ride_user" DROP CONSTRAINT "FK_ride_user_passenger_user"`);
        await queryRunner.query(`ALTER TABLE "ride_user" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD "phone" character varying(15)`);
        await queryRunner.query(`ALTER TABLE "ride_user" ADD "name" character varying(100)`);

        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_ride_owner_user"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "name" character varying`);
    }

}
