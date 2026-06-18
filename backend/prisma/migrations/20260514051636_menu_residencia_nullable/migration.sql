-- DropForeignKey
ALTER TABLE "menus" DROP CONSTRAINT "menus_residencia_id_fkey";

-- AlterTable
ALTER TABLE "menus" ALTER COLUMN "residencia_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
