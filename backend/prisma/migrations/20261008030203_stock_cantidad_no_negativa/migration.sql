-- Defensa en profundidad: la base nunca acepta stock negativo,
-- aunque falle la lógica de aplicación (carreras, scripts manuales).
-- Verificado antes de crearla: no había filas con cantidad < 0 en dev ni en test.
ALTER TABLE "stock" ADD CONSTRAINT "stock_cantidad_no_negativa" CHECK ("cantidad" >= 0);
