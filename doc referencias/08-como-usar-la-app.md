# 08 — Cómo usar el Buyer App

Tutorial paso a paso para probar todas las funcionalidades del Buyer App localmente.

---

## Antes de empezar

Verificá que la app esté corriendo:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el browser.

---

## Flujo completo de una compra

### Paso 1: Registrarse

1. Ir a `/sign-up` o hacer click en el botón de registro en la home
2. Ingresar email y password
3. Verificar el email si Clerk lo pide
4. Serás redirigido a `/dashboard`

**¿Qué pasa internamente?**
- Clerk crea el usuario en su sistema
- La primera vez que hacés cualquier request autenticado, `getOrCreateBuyerProfile()` crea tu `BuyerProfile` en la DB con el nombre "Comprador"

### Paso 2: Completar el perfil

1. Ir a `/profile`
2. Editar el nombre (actualmente dice "Comprador")
3. Opcionalmente agregar teléfono y número de documento
4. Hacer click en "Guardar"

**¿Qué pasa internamente?**
- `PATCH /api/buyer/profile` actualiza el `BuyerProfile` en la DB
- React Query invalida el cache del perfil y lo recarga

### Paso 3: Agregar una dirección de envío

1. En `/profile`, bajar a la sección de direcciones
2. Hacer click en "Agregar dirección"
3. Completar el formulario: label, calle, ciudad, CP, país
4. Guardar

**Necesitás al menos una dirección para poder hacer checkout.**

### Paso 4: Explorar la tienda

1. Ir a `/shop`
2. Si la Seller App no está configurada, verás productos mock (bicis y accesorios de ejemplo)
3. Hacer click en "Agregar al carrito" en un producto

**¿Qué pasa internamente?**
- `POST /api/buyer/cart` crea un `CartItem` con un snapshot del producto
- React Query invalida el cache del carrito

### Paso 5: Ver y modificar el carrito

1. Ir a `/cart`
2. Ver los productos que agregaste
3. Podés aumentar/disminuir cantidades
4. Podés eliminar items
5. Ver el total

### Paso 6: Hacer checkout

1. Desde `/cart`, hacer click en "Continuar al checkout"
2. En `/checkout`, seleccionar la dirección de envío
3. Revisar el resumen de la orden
4. Hacer click en "Confirmar orden"

**¿Qué pasa internamente?**
1. `POST /api/buyer/checkout` se llama con la `shippingAddressId`
2. Se agrupan los items por vendedor
3. Se calculan los costos de envío (mock si no hay Shipping App)
4. Se crea la `Order` en la DB con status `PENDING_PAYMENT`
5. Se crea un `OrderSellerGroup` por cada vendedor
6. Se crean los `OrderItem`
7. Se vacía el carrito
8. Se crea una sesión de pago (mock si no hay Payments App)
9. Serás redirigido a la URL de pago (o a `/orders` si es mock)

### Paso 7: Ver órdenes

1. Ir a `/orders`
2. Ver el historial de compras
3. Hacer click en una orden para ver el detalle

---

## Cómo crear productos de prueba

Como el Buyer App no tiene su propia interfaz para crear productos (eso es responsabilidad de la Seller App), hay dos opciones para tener productos de prueba:

### Opción A: Usar los productos mock (recomendado)

Si `SELLER_APP_URL` no está configurada en `.env.local`, el Buyer App usa productos mock automáticamente. Aparecen en `/shop` sin necesidad de hacer nada.

Los productos mock están definidos en `src/lib/seller-api.ts` (constante `MOCK_PRODUCTS`). Podés editarlos para agregar más productos de prueba.

### Opción B: Crear un producto directamente en la DB con Prisma Studio

```bash
npx prisma studio
```

1. Abrí [http://localhost:5555](http://localhost:5555)
2. Seleccioná el modelo `Product`
3. Hacé click en "Add record"
4. Completá los campos:
   - `title`: "Bicicleta de prueba"
   - `description`: "Descripción de prueba"
   - `price`: 100000
   - `isActive`: true
5. Guardar

---

## Cómo simular el callback de Payments

En el flujo real, Payments App llama al Buyer App cuando el pago es aprobado. Para simular esto localmente:

```bash
# Obtener el ID de una orden pendiente
# Primero hacé un checkout para crear una orden

# Luego simular el PATCH de Payments al Buyer App
curl -X PATCH \
  -H "X-Service-Token: TU_PAYMENTS_TO_BUYER_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid", "payment_id": "pay_test_123"}' \
  http://localhost:3000/api/v1/orders/ID_DE_TU_ORDEN
```

Reemplazá `TU_PAYMENTS_TO_BUYER_SERVICE_TOKEN` con el valor de tu `.env.local` y `ID_DE_TU_ORDEN` con el ID de la orden creada.

Después de ejecutar esto, el status de la orden cambia a `PAID` en la DB.

---

## Checklist de funcionalidades

Usá esta lista para verificar que todo funciona correctamente:

- [ ] Registro de usuario en `/sign-up`
- [ ] Login en `/sign-in`
- [ ] Dashboard visible en `/dashboard` después del login
- [ ] Edición de perfil en `/profile`
- [ ] Agregar dirección en `/profile`
- [ ] Editar dirección en `/profile`
- [ ] Eliminar dirección en `/profile`
- [ ] Ver productos en `/shop`
- [ ] Agregar producto al carrito desde `/shop`
- [ ] Agregar producto a favoritos desde `/shop`
- [ ] Ver carrito en `/cart`
- [ ] Cambiar cantidad en `/cart`
- [ ] Eliminar item en `/cart`
- [ ] Checkout exitoso desde `/cart` → `/checkout`
- [ ] Orden creada visible en `/orders`
- [ ] Detalle de orden accesible

---

## Verificar la base de datos con Prisma Studio

```bash
npx prisma studio
```

Esto abre [http://localhost:5555](http://localhost:5555). Podés:

- Ver todos los `BuyerProfile` creados
- Ver los `CartItem` de un usuario
- Ver las `Order` creadas después del checkout
- Ver los `OrderSellerGroup` de cada orden
- Modificar datos directamente para testing

---

## Logs del servidor

La terminal donde corre `npm run dev` muestra los logs del servidor. Cuando se hace una request a la API, aparece:

```
GET /api/buyer/cart 200 in 45ms
POST /api/buyer/cart 201 in 78ms
```

Si hay un error en el servidor (ej: error en Prisma), el stack trace completo aparece en la terminal.

---

## Siguiente paso

→ [09-debugging-nextjs.md](09-debugging-nextjs.md) — errores comunes y cómo resolverlos.
