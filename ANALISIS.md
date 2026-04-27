# Análisis Completo del Sistema — Fundación Residencias Universitarias

## Contexto

La fundación gestiona 20+ residencias universitarias distribuidas en distintas provincias del país. Cada residencia aloja estudiantes que se organizan en **grupos de cocina** con turnos asignados. El sistema debe gestionar el ciclo completo: stock de alimentos → selección de menú → receta escalada → descuento de inventario, con trazabilidad total, reportes nutricionales para donaciones y un dashboard centralizado para el Admin Global.

- **Plazo**: 6 meses (análisis y diseño primero, luego implementación)
- **Equipo**: 1 desarrollador (el propio usuario)
- **Escala**: Real y productiva, diseñada para crecer
- **Prioridad técnica**: Mejores prácticas, escalabilidad, Docker + DevOps para aprendizaje

---

## Roles del Sistema

| Rol | Alcance | Capacidades clave |
|-----|---------|-------------------|
| **Admin Global** | Todas las residencias | CRUD global, dashboard total, reportes, configuración del sistema |
| **Admin por Residencia** (= Voluntario) | Solo su residencia | Gestión de residentes, grupos, turnos, menús, stock |
| **Residente** | Solo su residencia | Selección de menú, registro de stock entrante, vista de recetas |

---

## Módulos del Sistema

### 1. Autenticación y Usuarios
- Login/logout con email y contraseña
- Primer login obliga cambio de contraseña
- Importación masiva de usuarios desde Excel (columnas: email, DNI)
- Sistema crea cuentas con contraseña por defecto; usuarios la cambian al ingresar
- Reset de contraseña

### 2. Residencias (Admin Global)
- CRUD de residencias
- Datos: nombre, dirección, ciudad, provincia, capacidad máxima, cantidad actual de residentes, cantidad histórica, lista de admins/voluntarios
- Configuración de **ventana de rollback** (horas antes de confirmar descuento de stock) — configurable por residencia
- Vista de métricas y alertas por residencia

### 3. Residentes (Admin Residencia)
- CRUD de residentes
- Datos: nombre, apellido, DNI, edad, email, teléfono, universidad, carrera, ciudad de origen, fecha de ingreso
- Un residente pertenece a una única residencia (no cambia)
- Importación desde Excel
- Historial de residentes (activos e históricos)

### 4. Grupos de Cocina (Admin Residencia)
- CRUD de grupos
- Nombre del grupo basado en integrantes (configurable)
- Tamaño variable (sin mínimo/máximo fijo)
- Un residente puede pertenecer a más de un grupo
- Los grupos pueden disolverse y reformarse durante el año
- El admin asigna los menús disponibles a cada grupo (lista curada por grupo)

### 5. Turnos de Cocina (Admin Residencia + Residentes)
- El admin crea los turnos: fecha + franja horaria (Almuerzo / Cena) + grupo asignado
- **Calendario visual** semanal/mensual con buen diseño
- Soporte para turnos fijos y rotativos (cada residencia define su modelo)
- El admin gestiona intercambios entre grupos
- Notificaciones automáticas por **email** (ej: "Mañana te toca cocinar — Almuerzo")

### 6. Menús / Recetas (Admin Residencia)
- "Menú" = "Receta" — mismo concepto
- Cada residencia tiene su propio catálogo de menús (no compartido)
- Datos del menú: nombre, descripción, imagen(es), video tutorial, nivel de dificultad, tiempo estimado de preparación
- Ingredientes con cantidad base + cantidad por persona (para auto-escalado)
- Admin asigna menús específicos a cada grupo (los residentes solo ven los asignados)
- Para agregar un menú nuevo, el residente lo pide al admin quien lo crea y asigna

### 7. Inventario / Stock (Admin + Residentes)
- Stock completamente independiente por residencia
- **Quién registra entradas**: cualquier residente (con trazabilidad completa: quién, qué, cuándo)
- Unidades de medida: kg, gr, litros, ml, unidades, paquetes — con conversión automática
- Categorías de alimentos: lácteos, carnes, verduras, secos, enlatados, etc.
- Fecha de vencimiento por lote con alertas próximas al vencimiento
- Alertas de stock mínimo configurable por producto
- Historial completo de movimientos: entradas, salidas por cocina, ajustes manuales
- **IA para valores nutricionales**: al registrar un alimento/marca por primera vez, la IA busca sus valores nutricionales (calorías, proteínas, carbohidratos, grasas). El usuario revisa y confirma. Una vez registrado, se reutiliza automáticamente

### 8. Flujo Principal: Selección de Menú

```
1. Admin asigna menús al grupo del turno
2. Residente del grupo accede a su turno activo
3. Ve la lista de menús asignados → selecciona uno
4. Declara cantidad de personas a cocinar
5. Sistema verifica stock:
   - Si alcanza → muestra receta escalada
   - Si no alcanza → ADVIERTE pero permite continuar
6. Residente puede ajustar cantidades (diferencia queda registrada)
7. Selección queda en estado PENDIENTE (stock NO se descuenta aún)
8. Ventana de rollback: configurable por el Admin de la residencia
   - Durante esa ventana: el grupo puede revertir sin consecuencias
9. Pasada la ventana → estado CONFIRMADO → stock se descuenta definitivamente
10. Todo queda en el historial de auditoría
```

### 9. Reportes y Dashboard (Admin Global + Admin Residencia)
- Consumo de alimentos por residencia y período
- Historial de menús cocinados por grupo
- Stock actual por residencia
- Residentes activos e históricos
- **Consumo nutricional estimado** por residencia → insumo para campañas de donación a empresas
- Dashboard Admin Global: vista unificada, alertas críticas, métricas clave
- Exportación a **Excel y PDF**

### 10. Auditoría Completa
- Log de toda acción: quién, qué, cuándo, datos anteriores y nuevos
- Cubre: cambios de stock, selecciones de menú, ajustes, creación/edición de usuarios, etc.

---

## Modelo de Datos (entidades principales)

```
User              → id, email, password_hash, role, residencia_id, first_login, active
Residencia        → id, nombre, dirección, ciudad, provincia, capacidad_max, rollback_horas
Residente         → id, user_id, nombre, apellido, DNI, edad, teléfono, universidad, carrera, ciudad_origen, fecha_ingreso
GrupoCocina       → id, nombre, residencia_id, activo
GrupoIntegrante   → grupo_id, residente_id, fecha_ingreso, fecha_egreso
TurnoCocina       → id, grupo_id, residencia_id, fecha, franja(almuerzo|cena), estado, rollback_deadline
Categoria         → id, nombre
Alimento          → id, nombre, marca, unidad_base, categoria_id, calorias, proteinas, carbohidratos, grasas, ia_verificado
Stock             → id, alimento_id, residencia_id, cantidad, unidad, fecha_vencimiento, stock_minimo
MovimientoStock   → id, stock_id, tipo(entrada|salida|ajuste), cantidad, residente_id, turno_id, motivo, created_at
Menu              → id, nombre, descripcion, imagen_url, video_url, dificultad, tiempo_min, residencia_id, activo
MenuIngrediente   → menu_id, alimento_id, cantidad_base, cantidad_por_persona, unidad
MenuGrupo         → menu_id, grupo_id
SeleccionMenu     → id, turno_id, menu_id, personas, estado(pendiente|confirmado|revertido), ajustes_json, created_at
Notificacion      → id, user_id, tipo, mensaje, enviado_at
AuditoriaLog      → id, user_id, accion, entidad, entidad_id, datos_prev_json, datos_new_json, created_at
```

---

## Stack Tecnológico (mejores prácticas + costo mínimo + escalable)

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router, React) | SSR, SEO, responsive, full-stack en un repo |
| **Backend** | Next.js API Routes + tRPC (opcional) | Type-safe end-to-end, sin duplicar código |
| **Base de datos** | PostgreSQL | Robusto, relacional, escalable, open source |
| **ORM** | Prisma | Type-safe, migraciones versionadas, excelente DX |
| **Auth** | NextAuth.js v5 | Flexible, soporta credenciales + OAuth futuro |
| **Storage** | MinIO (self-hosted vía Docker) o Supabase Storage | Imágenes y videos |
| **Email** | Resend o Brevo | Gratis hasta 300/día, API simple |
| **IA Nutrientes** | OpenAI API (gpt-4o-mini) | Bajo costo, solo se llama al registrar alimento nuevo |
| **Excel** | SheetJS (xlsx) | Open source, import/export |
| **PDF** | react-pdf o Puppeteer | Open source |
| **Contenedores** | Docker + Docker Compose | Entorno reproducible, base de DevOps |
| **CI/CD** | GitHub Actions | Gratis para repos privados, estándar de industria |
| **Hosting** | VPS (Railway / Render / DigitalOcean) | Control total + Docker, ~$5-10/mes |

---

## Arquitectura y Escalabilidad

### Estrategia: Monolito Modular → Microservicios cuando sea necesario

Para un solo desarrollador, comenzar con un **monolito modular bien estructurado** es la decisión correcta. El código se organiza por dominio (no por tipo de archivo), lo que facilita extraer servicios en el futuro si la escala lo requiere.

```
/src
  /modules
    /auth
    /residencias
    /residentes
    /grupos
    /turnos
    /menus
    /stock
    /reportes
    /auditoria
  /shared
    /components
    /hooks
    /utils
    /types
```

### Principios de Escalabilidad Aplicados
- **Base de datos**: índices en todas las FK y campos de búsqueda frecuente
- **Paginación**: todas las listas paginadas desde el inicio
- **Soft deletes**: nunca borrar datos, solo marcar como inactivo (trazabilidad)
- **Timestamps**: `created_at` y `updated_at` en todas las tablas
- **Auditoría**: log de cambios desacoplado del modelo de negocio
- **Variables de entorno**: toda configuración en `.env`, nunca hardcodeada
- **Migraciones versionadas**: Prisma Migrate, nunca editar la DB directamente

---

## Docker y DevOps

### Configuración Docker Local (aprendizaje + consistencia)

```
docker-compose.yml
├── app (Next.js)
├── postgres (base de datos)
├── redis (caché/queues — para futuras notificaciones en background)
└── mailhog (servidor de email local para desarrollo)
```

### CI/CD con GitHub Actions

```
.github/workflows/
├── ci.yml        → En cada PR: lint, tests, build
└── deploy.yml    → En merge a main: build Docker image → deploy a VPS
```

### Pipeline CI/CD básico (nivel aprendizaje)
1. **Lint + Format**: ESLint + Prettier
2. **Type check**: TypeScript strict
3. **Tests**: Jest + Testing Library (unit) + Playwright (e2e críticos)
4. **Build**: verificar que el build no rompe
5. **Deploy**: push de imagen Docker al registro → actualizar en servidor

### Buenas Prácticas DevOps para Aprender
- **Dockerfile multi-stage**: imagen de producción liviana
- **Variables de entorno secretas**: GitHub Secrets → nunca en el repo
- **Health checks**: endpoint `/api/health` monitoreado
- **Logs estructurados**: formato JSON para fácil parsing
- **Backups automáticos**: script de backup de PostgreSQL vía cron en el servidor
- **HTTPS**: certificado SSL automático (Let's Encrypt vía Caddy o Nginx)

---

## Fases del Proyecto (6 meses)

### Fase 0 — Análisis y Diseño (semanas 1–3) ← ESTAMOS AQUÍ
- Análisis de requerimientos completo (este documento)
- Diseño de base de datos (diagrama entidad-relación)
- Diseño UI/UX en Figma (wireframes → mockups)
- Definición de arquitectura de carpetas
- Setup del entorno: repo GitHub, Docker Compose local, CI básico

### Fase 1 — Core (Mes 1–2)
- Autenticación: login, roles, cambio de contraseña obligatorio
- Importación de usuarios desde Excel
- CRUD: Residencias, Residentes, Grupos de Cocina
- Inventario básico: alimentos, categorías, stock, movimientos

### Fase 2 — Cocina (Mes 2–3)
- CRUD de Menús/Recetas (con imágenes y videos)
- Asignación de menús a grupos
- Turnos de cocina + Calendario visual
- Flujo completo de selección de menú con rollback configurable

### Fase 3 — Inteligencia y Alertas (Mes 3–4)
- IA para valores nutricionales (OpenAI API)
- Alertas de stock mínimo y vencimiento
- Notificaciones automáticas por email
- Auditoría completa del sistema

### Fase 4 — Reportes (Mes 4–5)
- Dashboard Admin Global
- Reportes: consumo, nutrición, historial, residentes
- Exportación Excel y PDF

### Fase 5 — Pulido, DevOps y Documentación (Mes 5–6)
- UI/UX refinement
- Pipeline CI/CD completo (GitHub Actions → VPS)
- Tests e2e de flujos críticos con Playwright
- Documentación técnica para futuros mantenedores
- Feature IA importación de stock (segunda etapa)

---

## Puntos Abiertos (a resolver en etapa de diseño)

- Umbral de stock mínimo: ¿lo define el admin por alimento o es un porcentaje global?
- Diseño UI: a definir en Figma antes de implementar
- Servidor de hosting definitivo (Railway vs Render vs DigitalOcean VPS)
- IA de importación de stock (leer pedidos/planillas): segunda etapa, no en MVP

---

## Verificación del Sistema (flujos críticos a testear)

1. Importar residentes desde Excel → verificar cuentas creadas con contraseña por defecto
2. Primer login → sistema fuerza cambio de contraseña
3. Crear grupo de cocina, asignar integrantes, asignar menús
4. Crear turno (fecha + almuerzo) → verificar aparición en calendario
5. Ingresar stock → verificar movimiento en historial con trazabilidad
6. Como residente: seleccionar menú para 6 personas → ver receta escalada → estado PENDIENTE
7. Simular fin de ventana de rollback → verificar descuento definitivo de stock
8. Revertir selección dentro de la ventana → verificar que stock NO se modificó
9. Auditoría refleja todas las acciones anteriores
10. Exportar reporte de consumo nutricional en PDF
