/*
  Warnings:

  - Added the required column `provincia_origen` to the `residentes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "residentes" ADD COLUMN     "provincia_origen" TEXT NOT NULL;
