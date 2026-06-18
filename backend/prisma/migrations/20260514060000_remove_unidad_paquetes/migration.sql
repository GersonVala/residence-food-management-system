-- Primero actualizamos los registros que usen PAQUETES a UNIDADES
UPDATE menu_ingredientes SET unidad = 'UNIDADES' WHERE unidad = 'PAQUETES';
UPDATE stock SET unidad = 'UNIDADES' WHERE unidad = 'PAQUETES';
UPDATE alimentos SET unidad_base = 'UNIDADES' WHERE unidad_base = 'PAQUETES';
UPDATE alimentos SET unidad_contenido = 'UNIDADES' WHERE unidad_contenido = 'PAQUETES';
UPDATE seleccion_ajustes SET unidad = 'UNIDADES' WHERE unidad = 'PAQUETES';

-- Recrear el enum sin PAQUETES en PostgreSQL
-- Paso 1: convertir columnas a texto
ALTER TABLE menu_ingredientes ALTER COLUMN unidad TYPE TEXT;
ALTER TABLE stock ALTER COLUMN unidad TYPE TEXT;
ALTER TABLE alimentos ALTER COLUMN unidad_base TYPE TEXT;
ALTER TABLE alimentos ALTER COLUMN unidad_contenido TYPE TEXT;
ALTER TABLE seleccion_ajustes ALTER COLUMN unidad TYPE TEXT;

-- Paso 2: eliminar el enum viejo y crear el nuevo
DROP TYPE "Unidad";
CREATE TYPE "Unidad" AS ENUM ('KG', 'GR', 'LITROS', 'ML', 'UNIDADES');

-- Paso 3: reconvertir las columnas al nuevo enum
ALTER TABLE menu_ingredientes ALTER COLUMN unidad TYPE "Unidad" USING unidad::"Unidad";
ALTER TABLE stock ALTER COLUMN unidad TYPE "Unidad" USING unidad::"Unidad";
ALTER TABLE alimentos ALTER COLUMN unidad_base TYPE "Unidad" USING unidad_base::"Unidad";
ALTER TABLE alimentos ALTER COLUMN unidad_contenido TYPE "Unidad" USING unidad_contenido::"Unidad";
ALTER TABLE seleccion_ajustes ALTER COLUMN unidad TYPE "Unidad" USING unidad::"Unidad";
