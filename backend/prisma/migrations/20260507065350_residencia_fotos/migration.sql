-- AlterTable
ALTER TABLE "residencias" ADD COLUMN     "imagen_url" TEXT;

-- CreateTable
CREATE TABLE "residencia_fotos" (
    "id" SERIAL NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "residencia_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "residencia_fotos_residencia_id_orden_idx" ON "residencia_fotos"("residencia_id", "orden");

-- AddForeignKey
ALTER TABLE "residencia_fotos" ADD CONSTRAINT "residencia_fotos_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
