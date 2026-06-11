[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Tl5PKMoG)

# BiciMarket — Buyer App

## Deploy

https://proyecto-c-buyer2-bicimarket.vercel.app/

---

## Usuarios de prueba

| Nombre | Email | Contraseña | Rol |
|--------|-------|------------|-----|
| buyer admin | buyerclerk_test@iaw.com | iawuser# | Admin (acceso a `/admin`) |
| buyer1 operator | buyer1clerk_test@iaw.com | iawuser# | Comprador |
| buyer2 operator | buyer2clerk_test@iaw.com | iawuser# | Comprador |

> El usuario `buyer admin` tiene `{ "admin": true }` en su `publicMetadata` de Clerk, lo que habilita el acceso al panel de administración.

---

## Instrucciones para evaluar la app

**Flujo de prueba sugerido:**
1. Ingresar con `buyer1clerktest@iaw.com` → navegar el catálogo → agregar productos al carrito
2. Ir a checkout → seleccionar dirección → confirmar pedido
3. Ver la orden generada en el historial de pedidos
4. Ingresar con `buyerclerktest@iaw.com` → revisar el panel `/admin`

---- 

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env .env.local   # Completar con los valores del grupo

# 3. Generar el cliente de Prisma y crear las tablas
npx prisma generate
npx prisma db push

# 4. Poblar la base de datos con datos de prueba
npm run seed

# 5. Iniciar el servidor de desarrollo
npm run dev
```

> **Nota:** cada vez que cambiás `prisma/schema.prisma` tenés que correr `npx prisma generate` y luego `npx prisma db push`.

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Seed
npm run seed

# Prisma
npx prisma generate        # Regenera el cliente (necesario después de cambiar schema.prisma)
npx prisma db push         # Aplica cambios del schema a la base de datos
npx prisma migrate dev     # Crea y aplica una migración con nombre
npx prisma studio          # UI para explorar la base de datos en el navegador

# Si el servidor no conecta a la DB
npx prisma generate && npm run dev
```

---

## Descripción del proyecto

BiciMarket es un marketplace de compra y venta de bicicletas y accesorios. Esta app es la interfaz del comprador: permite navegar el catálogo por categoría y precio, guardar favoritos, armar un carrito persistente, hacer checkout con múltiples vendedores, y hacer seguimiento del historial de pedidos con sus estados. Incluye además un panel de administración para gestionar compradores, carritos y órdenes.

El sistema completo está compuesto por cuatro apps independientes (Buyer, Seller, Shipping y Payments), cada una con su propia base de datos y desplegadas por separado. Todas comparten el mismo proyecto de Clerk para autenticación. La comunicación entre apps se hace server-to-server usando un `X-Service-Token`. La Buyer App consume el catálogo de productos del Seller App en tiempo real y expone endpoints que Payments, Seller y Shipping llaman para actualizar el estado de los pedidos.

**Stack:** Next.js 16 (App Router) · PostgreSQL · Prisma · Clerk · Tailwind CSS · shadcn/ui · Zustand · TanStack Query · Zod · react-hook-form · Framer Motion

El carrito persiste en base de datos (no solo en estado local). El checkout agrupa los items por vendedor, creando un `OrderSellerGroup` por cada uno con su propio estado de envío. Las órdenes mantienen un historial de estados y las direcciones de envío se guardan como snapshot en la orden para preservar el historial aunque el usuario las modifique después.

Ver `documentacion/` para la arquitectura completa del sistema.

---

## Notas para la corrección

**Integraciones simuladas:**
- **Pagos (Payments App):** La integración está simulada. Al confirmar el checkout se genera una URL de pago mock en lugar de contactar al Payments App real. Los endpoints para recibir actualizaciones de estado de pago están implementados y funcionan si Payments los llama.
- **Costos de envío (Shipping App):** Si `SHIPPING_APP_URL` no está configurada, los costos se calculan con una fórmula mock ($10.000 base + $4.000 por vendedor). El endpoint para recibir actualizaciones de estado de envío está implementado.

**Integraciones reales:**
- **Catálogo (Seller App):** Los productos se obtienen en tiempo real desde el Seller App. Hay un fallback a datos hardcodeados si la URL no está configurada, lo que permite que la app funcione de forma autónoma.
- La Buyer App implementa tres endpoints receptores que otras apps pueden llamar para actualizar el estado del pago, del envío y de la aceptación de cada orden por parte del vendedor.

**Decisiones de diseño:**
- Zustand solo maneja el estado de UI del checkout (dirección seleccionada, nota de pedido). El carrito persiste en PostgreSQL.
- Todas las integraciones externas tienen fallback graceful: la app funciona completamente sin las otras apps levantadas.
- `service-auth.ts` centraliza la validación de `X-Service-Token` y rechaza con 401 si el token es inválido, manteniendo los endpoints inter-servicios seguros en cualquier ambiente.

**Limitaciones conocidas:**
- El flujo de pago está simulado: al confirmar el checkout se genera una URL mock en lugar de redirigir a un gateway real.
- Los estados de las órdenes (pago, envío) solo avanzan si las otras apps del sistema llaman los endpoints correspondientes.

---

## Documentación

- [Estructura del proyecto](documentacion-buyer/estructura-proyecto.md)
- [Rutas de la app](documentacion-buyer/rutas.md)
- [Endpoints API](documentacion-buyer/endpoints-api.md)
- [Documentación general del sistema](documentacion/) — arquitectura, contratos de API, modelos compartidos
