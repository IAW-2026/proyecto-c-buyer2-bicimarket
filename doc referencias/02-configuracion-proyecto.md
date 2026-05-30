# 02 — Configuración del proyecto

Guía paso a paso para levantar el Buyer App desde cero en tu máquina.

---

## Prerequisitos

Necesitás tener instalado:
- **Node.js 20+** — para correr el proyecto
- **npm** — viene con Node.js
- **Git** — para clonar el repo
- **Una base de datos PostgreSQL** — puede ser local o en la nube (ver más abajo)

---

## Paso 1: Clonar e instalar dependencias

```bash
git clone https://github.com/camilarojasfritz/proyecto-c-buyer-camilarojas
cd proyecto-c-buyer-camilarojas
npm install
```

`npm install` descarga todas las librerías listadas en `package.json` y las pone en `node_modules/`.

---

## Paso 2: Variables de entorno

Las variables de entorno son **configuraciones secretas** que no se guardan en el código (por seguridad). Se leen desde archivos `.env`.

Tu equipo tiene un `.env` con los valores reales. Copialo a `.env.local`:

```bash
cp .env .env.local
```

`.env.local` nunca se sube a GitHub (está en `.gitignore`). Es tu copia local.

### ¿Qué variable hace qué?

#### Base de datos

```
DATABASE_URL="postgresql://usuario:password@host:5432/nombre_db"
DIRECT_URL="postgresql://usuario:password@host:5432/nombre_db"
```

- `DATABASE_URL`: URL de conexión principal. Prisma la usa para todas las operaciones.
- `DIRECT_URL`: URL de conexión directa. La usa Prisma en entornos que tienen un proxy (como Supabase con PgBouncer). Si no usás proxy, puede ser igual a `DATABASE_URL`.

**¿Cómo conseguir estas URLs?**
- Si usás **Supabase** (recomendado): vas a tu proyecto → Settings → Database → Connection String. Copiás la de "Transaction pooler" para `DATABASE_URL` y la de "Direct connection" para `DIRECT_URL`.
- Si usás **PostgreSQL local**: `postgresql://postgres:tu_password@localhost:5432/buyer_db`

#### Clerk (autenticación)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: clave pública de Clerk. Se usa en el navegador. El prefijo `NEXT_PUBLIC_` hace que Next.js la exponga al cliente.
- `CLERK_SECRET_KEY`: clave secreta de Clerk. Solo se usa en el servidor. Nunca la expongas en el cliente.
- Las URLs de sign-in/sign-up le dicen a Clerk dónde están tus páginas de login y registro.
- Las URLs de after-sign-in/sign-up redirigen al usuario después de autenticarse.

**¿Cómo conseguir las keys de Clerk?**
1. Entrás a [clerk.com](https://clerk.com)
2. Creás un nuevo proyecto (el Buyer App tiene su propio proyecto, separado de las otras apps)
3. En el dashboard → API Keys copiás las dos claves

#### URLs de otras apps (inter-servicios)

```
SELLER_APP_URL=http://localhost:3001
SHIPPING_APP_URL=http://localhost:3002
PAYMENTS_APP_URL=http://localhost:3003
```

URLs de las otras apps del sistema. Si tus compañeros no tienen sus apps corriendo localmente, estas variables quedan vacías y el Buyer App usa datos mock automáticamente.

#### Service tokens (autenticación entre apps)

```
BUYER_TO_SELLER_SERVICE_TOKEN=...
BUYER_TO_SHIPPING_SERVICE_TOKEN=...
BUYER_TO_PAYMENTS_SERVICE_TOKEN=...
PAYMENTS_TO_BUYER_SERVICE_TOKEN=...
SHIPPING_TO_BUYER_SERVICE_TOKEN=...
```

Claves secretas compartidas entre pares de apps. Cada par de apps (ej: Buyer→Seller) tiene su propio token. Se acuerdan con el equipo y se guardan solo en variables de entorno, nunca en el código.

> **Importante**: Las variables que empiezan con `NEXT_PUBLIC_` son visibles en el navegador. Las que no tienen ese prefijo son solo del servidor. Nunca pongas un secreto en una variable con `NEXT_PUBLIC_`.

---

## Paso 3: Generar el cliente de Prisma

```bash
npx prisma generate
```

Esto lee `prisma/schema.prisma` y genera código TypeScript en `src/generated/prisma/`. Ese código es el "cliente" que usás para consultar la base de datos.

**¿Por qué es necesario?** Porque el cliente generado es específico para tu schema. Cada vez que cambiás el schema hay que regenerarlo.

---

## Paso 4: Crear las tablas en la base de datos

```bash
npx prisma db push
```

Este comando lee el schema y crea todas las tablas en tu base de datos si no existen. Es útil para desarrollo.

> **`db push` vs `migrate dev`**: 
> - `db push`: aplica los cambios directamente sin crear un archivo de migración. Ideal para desarrollo rápido.
> - `migrate dev`: crea un archivo SQL de migración con un nombre descriptivo. Ideal cuando ya tenés datos que no querés perder.

---

## Paso 5: Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

---

## Errores comunes al configurar

### Error: "Can't reach database server"

```
Error: P1001: Can't reach database server at `host:port`
```

**Causa**: la `DATABASE_URL` está mal o la base de datos no está corriendo.

**Solución**:
1. Verificá que la URL en `.env.local` sea correcta
2. Si usás Supabase, asegurate de que el proyecto esté activo (no en pausa)
3. Si usás PostgreSQL local, verificá que el servicio esté corriendo

### Error: "PrismaClient is not generated"

```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

**Solución**: correr `npx prisma generate`

### Error: "Invalid Clerk publishable key"

```
Error: Invalid publishable key. It must start with pk_test_ or pk_live_
```

**Solución**: verificá que `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en `.env.local` sea correcta y comience con `pk_test_`.

### Error: "Module not found: @/..."

```
Module not found: Can't resolve '@/hooks/use-buyer'
```

**Solución**: el alias `@/` apunta a `src/`. Verificá que `tsconfig.json` tenga configurado el path:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

### Error: "Port 3000 is already in use"

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución**: hay otro proceso usando el puerto 3000. Para encontrar y matar el proceso:
```bash
# En Mac/Linux:
lsof -ti:3000 | xargs kill -9

# O cambiar el puerto:
npm run dev -- -p 3001
```

---

## Cómo configurar Clerk desde cero

Si necesitás crear un Clerk nuevo (por ejemplo, para otro ambiente):

1. Ir a [clerk.com](https://clerk.com) → "Add application"
2. Nombrar la app "BiciMarket Buyer"
3. En "Sign-in options" seleccionar: Email address + Password
4. Copiar las API keys al `.env.local`
5. En Clerk dashboard → Redirects: configurar las URLs de tu app local

---

## Cómo configurar Supabase (base de datos gratuita en la nube)

1. Ir a [supabase.com](https://supabase.com) → "New project"
2. Elegir región (recomendado: South America para menor latencia desde Argentina)
3. Esperar que el proyecto inicie (~2 min)
4. Ir a Settings → Database
5. Copiar "Transaction pooler" como `DATABASE_URL` y "Direct connection" como `DIRECT_URL`

---

## Cómo explorar la base de datos visualmente

```bash
npx prisma studio
```

Abre una UI web en `http://localhost:5555` donde podés ver y editar los datos de todas las tablas. Muy útil para debugging.

---

## Siguiente paso

→ [03-prisma-modelos-buyer.md](03-prisma-modelos-buyer.md) — entendé cómo está modelada la base de datos y cómo hacer consultas.
