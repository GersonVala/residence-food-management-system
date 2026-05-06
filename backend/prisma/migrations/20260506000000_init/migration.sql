-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN_GLOBAL', 'ADMIN_RESIDENCIA', 'RESIDENTE');

-- CreateEnum
CREATE TYPE "Franja" AS ENUM ('ALMUERZO', 'CENA');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "Dificultad" AS ENUM ('FACIL', 'MEDIO', 'DIFICIL');

-- CreateEnum
CREATE TYPE "EstadoSeleccion" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'REVERTIDO');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "residencia_id" INTEGER,
    "first_login" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residencias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "capacidad_max" INTEGER NOT NULL,
    "rollback_horas" INTEGER NOT NULL DEFAULT 2,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residentes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "telefono" TEXT,
    "universidad" TEXT NOT NULL,
    "carrera" TEXT NOT NULL,
    "ciudad_origen" TEXT NOT NULL,
    "fecha_ingreso" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_cocina" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_cocina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_integrantes" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "residente_id" INTEGER NOT NULL,
    "fecha_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_egreso" TIMESTAMP(3),

    CONSTRAINT "grupos_integrantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_cocina" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "franja" "Franja" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_cocina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alimentos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "unidad_base" "Unidad" NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "calorias" DOUBLE PRECISION,
    "proteinas" DOUBLE PRECISION,
    "carbohidratos" DOUBLE PRECISION,
    "grasas" DOUBLE PRECISION,
    "ia_verificado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" SERIAL NOT NULL,
    "alimento_id" INTEGER NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" "Unidad" NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3),
    "stock_minimo" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" SERIAL NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "residente_id" INTEGER,
    "turno_id" INTEGER,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagen_url" TEXT,
    "video_url" TEXT,
    "dificultad" "Dificultad" NOT NULL,
    "tiempo_min" INTEGER NOT NULL,
    "residencia_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_ingredientes" (
    "id" SERIAL NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "alimento_id" INTEGER NOT NULL,
    "cantidad_base" DOUBLE PRECISION NOT NULL,
    "cantidad_por_persona" DOUBLE PRECISION NOT NULL,
    "unidad" "Unidad" NOT NULL,

    CONSTRAINT "menu_ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_grupos" (
    "id" SERIAL NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "grupo_id" INTEGER NOT NULL,

    CONSTRAINT "menu_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selecciones_menu" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "residente_id" INTEGER NOT NULL,
    "personas" INTEGER NOT NULL,
    "estado" "EstadoSeleccion" NOT NULL DEFAULT 'PENDIENTE',
    "rollback_deadline" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selecciones_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seleccion_ajustes" (
    "id" SERIAL NOT NULL,
    "seleccion_id" INTEGER NOT NULL,
    "alimento_id" INTEGER NOT NULL,
    "cantidad_calculada" DOUBLE PRECISION NOT NULL,
    "cantidad_real" DOUBLE PRECISION NOT NULL,
    "unidad" "Unidad" NOT NULL,

    CONSTRAINT "seleccion_ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" INTEGER,
    "residencia_id" INTEGER,
    "datos_prev_json" JSONB,
    "datos_new_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "residentes_user_id_key" ON "residentes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "residentes_dni_key" ON "residentes"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_cocina_grupo_id_fecha_franja_key" ON "turnos_cocina"("grupo_id", "fecha", "franja");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "menu_ingredientes_menu_id_alimento_id_key" ON "menu_ingredientes"("menu_id", "alimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_grupos_menu_id_grupo_id_key" ON "menu_grupos"("menu_id", "grupo_id");

-- CreateIndex
CREATE INDEX "selecciones_menu_estado_rollback_deadline_idx" ON "selecciones_menu"("estado", "rollback_deadline");

-- CreateIndex
CREATE INDEX "auditoria_logs_accion_user_id_residencia_id_created_at_idx" ON "auditoria_logs"("accion", "user_id", "residencia_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentes" ADD CONSTRAINT "residentes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentes" ADD CONSTRAINT "residentes_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_cocina" ADD CONSTRAINT "grupos_cocina_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_integrantes" ADD CONSTRAINT "grupos_integrantes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos_cocina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_integrantes" ADD CONSTRAINT "grupos_integrantes_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "residentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_cocina" ADD CONSTRAINT "turnos_cocina_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos_cocina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_cocina" ADD CONSTRAINT "turnos_cocina_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimentos" ADD CONSTRAINT "alimentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_alimento_id_fkey" FOREIGN KEY ("alimento_id") REFERENCES "alimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "residentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos_cocina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ingredientes" ADD CONSTRAINT "menu_ingredientes_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ingredientes" ADD CONSTRAINT "menu_ingredientes_alimento_id_fkey" FOREIGN KEY ("alimento_id") REFERENCES "alimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_grupos" ADD CONSTRAINT "menu_grupos_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_grupos" ADD CONSTRAINT "menu_grupos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos_cocina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selecciones_menu" ADD CONSTRAINT "selecciones_menu_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos_cocina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selecciones_menu" ADD CONSTRAINT "selecciones_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selecciones_menu" ADD CONSTRAINT "selecciones_menu_residente_id_fkey" FOREIGN KEY ("residente_id") REFERENCES "residentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seleccion_ajustes" ADD CONSTRAINT "seleccion_ajustes_seleccion_id_fkey" FOREIGN KEY ("seleccion_id") REFERENCES "selecciones_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seleccion_ajustes" ADD CONSTRAINT "seleccion_ajustes_alimento_id_fkey" FOREIGN KEY ("alimento_id") REFERENCES "alimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_residencia_id_fkey" FOREIGN KEY ("residencia_id") REFERENCES "residencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

