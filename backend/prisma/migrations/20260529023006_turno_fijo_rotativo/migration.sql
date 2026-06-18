-- CreateEnum
CREATE TYPE "TipoTurno" AS ENUM ('FIJO', 'ROTATIVO');

-- DropIndex
DROP INDEX "turnos_cocina_grupo_id_fecha_franja_key";

-- AlterTable
ALTER TABLE "turnos_cocina" ADD COLUMN     "dia_semana" INTEGER,
ADD COLUMN     "tipo" "TipoTurno" NOT NULL DEFAULT 'ROTATIVO',
ALTER COLUMN "fecha" DROP NOT NULL;
