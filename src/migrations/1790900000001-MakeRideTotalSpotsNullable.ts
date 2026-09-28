import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeRideTotalSpotsNullable1790900000001 implements MigrationInterface {
    name = 'MakeRideTotalSpotsNullable1790900000001'

    // Ônibus não tem vaga limitada: o formulário deixa de exigir o campo para
    // esse tipo de transporte, e `total_spots` nulo é o sinal de capacidade
    // ilimitada que o resto do backend passa a entender.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "total_spots" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "total_spots" SET NOT NULL`);
    }

}
