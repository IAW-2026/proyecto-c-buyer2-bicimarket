# 12 — Comunicación entre apps

Cómo el Buyer App se comunica con las otras tres apps del sistema BiciMarket.

---

## ¿Por qué no compartir una sola base de datos?

El sistema tiene 4 apps con 4 bases de datos separadas. Podría haber sido una sola DB, pero eso crearía problemas:

- **Acoplamiento**: si la Seller App cambia la estructura de su tabla `products`, el Buyer App se rompe
- **Escalabilidad**: cada app puede escalar independientemente
- **Responsabilidades claras**: cada app es la fuente de verdad de sus propios datos
- **Seguridad**: la Payments App solo expone lo que decide exponer

En cambio, las apps se comunican por **REST sobre HTTP**: requests y responses bien definidos.

---

## Dos tipos de autenticación

### 1. Usuario → Buyer App: JWT de Clerk

Cuando el browser del comprador llama a `/api/buyer/cart`, manda el JWT de Clerk automáticamente (en el cookie de sesión).

```
Browser → GET /api/buyer/cart
Header: Cookie: __session=<JWT de Clerk>
```

El Buyer App verifica el JWT con `auth()` de Clerk.

### 2. App → App: X-Service-Token

Cuando el Buyer App llama a la Shipping App (servidor a servidor), usa un header especial:

```
Buyer App (servidor) → POST https://shipping.bicimarket.com/api/v1/shipping-quotes
Header: X-Service-Token: secreto-compartido-buyer-shipping
Header: X-Request-Id: uuid-para-tracing
```

El token es un string secreto compartido entre el par de apps. Está en variables de entorno, nunca en el código.

**¿Por qué no reusar el JWT de Clerk?** Porque las llamadas inter-servicio son de servidor a servidor, sin usuario activo. Usar X-Service-Token provee una identidad de servicio clara, independiente de la sesión del usuario.

---

## Llamadas que hace el Buyer App (outbound)

### A la Seller App

**`GET /api/v1/products`** — catálogo de productos

```ts
// src/lib/seller-api.ts
export async function getSellerProducts(params?: SellerProductsParams) {
  const client = getClient();  // Crea un axios con X-Service-Token
  
  const { data } = await client.get("/api/v1/products", {
    params: { status: "active", ...params }
  });
  return data;
}
```

Request que sale del servidor del Buyer App:
```
GET https://seller.bicimarket.com/api/v1/products?status=active&page=1&limit=20
X-Service-Token: secreto-buyer-seller
X-Request-Id: uuid-xxx
```

**`GET /api/v1/products/{id}/availability`** — verificar que el producto esté activo

Se usa antes del checkout para confirmar que el producto sigue disponible y obtener precio y peso actualizados.

---

### A la Shipping App

**`POST /api/v1/shipping-quotes`** — cotizar envío

```ts
// src/lib/shipping-api.ts
export async function getShippingQuotes(requests: ShippingQuoteRequest[]) {
  const { data } = await client.post("/api/v1/shipping-quotes", requests);
  return data;
}
```

Request:
```json
POST https://shipping.bicimarket.com/api/v1/shipping-quotes
X-Service-Token: secreto-buyer-shipping

[
  {
    "seller_profile_id": "sel_001",
    "shipping_address": { "street": "...", "city": "Buenos Aires", "zip": "1043", "country": "Argentina" },
    "items": [{ "weight_grams": 13500, "quantity": 1 }]
  }
]
```

Response:
```json
[
  {
    "seller_profile_id": "sel_001",
    "cost": 1475,
    "estimated_days": 3,
    "packages_count": 1,
    "total_weight": 13500
  }
]
```

---

### A la Payments App

**`POST /api/v1/payments`** — crear sesión de pago

```ts
// src/lib/payments-api.ts
export async function createPayment(payload: CreatePaymentPayload) {
  const { data } = await client.post("/api/v1/payments", payload, {
    headers: { "Idempotency-Key": payload.idempotency_key }
  });
  return data;
}
```

El header `Idempotency-Key` es importante: si el request falla y se reintenta, el servidor de Payments no cobra dos veces.

---

## Llamadas que recibe el Buyer App (inbound)

Estas son las rutas en `src/app/api/v1/`:

### De Payments App: `PATCH /api/v1/orders/{orderId}`

Payments llama esto cuando el pago cambia de estado.

```
PATCH /api/v1/orders/ord_001
X-Service-Token: secreto-payments-buyer

{ "status": "paid", "payment_id": "pay_mp_real_123" }
```

El Buyer App en `src/app/api/v1/orders/[orderId]/route.ts`:
1. Verifica el `X-Service-Token` contra `PAYMENTS_TO_BUYER_SERVICE_TOKEN`
2. Actualiza `Order.status` en la DB

### De Shipping App: `PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping`

Shipping llama esto cuando el estado del envío cambia.

```
PATCH /api/v1/orders/ord_001/seller-groups/osg_001/shipping
X-Service-Token: secreto-shipping-buyer

{ "status": "in_transit", "tracking_number": "TRK987654" }
```

El Buyer App en `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts`:
1. Verifica el token
2. Actualiza `OrderSellerGroup.status`
3. Calcula si hay que actualizar `Order.status` (ej: si todos los grupos están en `DELIVERED`)

---

## Cómo funciona `validateServiceToken`

El helper en `src/lib/service-auth.ts` verifica el token:

```ts
export function validateServiceToken(request: Request, envVarName: string): NextResponse | null {
  const expectedToken = process.env[envVarName];
  
  if (!expectedToken) {
    // La variable no está configurada → error de config del servidor
    return NextResponse.json({ error: "SERVICE_TOKEN_NOT_CONFIGURED" }, { status: 500 });
  }
  
  const receivedToken = request.headers.get("X-Service-Token");
  
  if (!receivedToken || receivedToken !== expectedToken) {
    // Token ausente o incorrecto → no autorizado
    return NextResponse.json({ error: "INVALID_SERVICE_TOKEN" }, { status: 401 });
  }
  
  return null;  // null significa "todo bien, continuar"
}
```

Uso en un endpoint:
```ts
export async function PATCH(request: NextRequest, context) {
  const tokenError = validateServiceToken(request, "PAYMENTS_TO_BUYER_SERVICE_TOKEN");
  if (tokenError) return tokenError;  // Si hay error, devolver y cortar
  
  // ...resto del handler
}
```

---

## Cómo funciona el mock de desarrollo

Cuando las otras apps no están corriendo (que es el caso la mayor parte del tiempo en desarrollo), las funciones de `seller-api.ts`, `shipping-api.ts` y `payments-api.ts` detectan que las variables de entorno no están configuradas y retornan datos mock:

```ts
// seller-api.ts
function getClient() {
  const baseURL = process.env.SELLER_APP_URL;
  const token = process.env.BUYER_TO_SELLER_SERVICE_TOKEN;
  
  if (!baseURL || !token) return null;  // Variables no configuradas
  
  return createServiceClient(baseURL, token);
}

export async function getSellerProducts() {
  const client = getClient();
  
  if (!client) {
    // Retornar datos mock directamente
    return {
      data: MOCK_PRODUCTS,
      pagination: { total: 3, page: 1, limit: 20, has_more: false }
    };
  }
  
  // Si hay cliente, llamar a la Seller App real
  const { data } = await client.get("/api/v1/products");
  return data;
}
```

**Para activar las llamadas reales**, configurar en `.env.local`:
```
SELLER_APP_URL=http://localhost:3001
BUYER_TO_SELLER_SERVICE_TOKEN=valor-acordado-con-el-equipo
```

---

## Variables de entorno por servicio

| Variable | Para qué |
|----------|---------|
| `SELLER_APP_URL` | URL de la Seller App |
| `BUYER_TO_SELLER_SERVICE_TOKEN` | Token para llamar a Seller App |
| `SHIPPING_APP_URL` | URL de la Shipping App |
| `BUYER_TO_SHIPPING_SERVICE_TOKEN` | Token para llamar a Shipping App |
| `PAYMENTS_APP_URL` | URL de la Payments App |
| `BUYER_TO_PAYMENTS_SERVICE_TOKEN` | Token para llamar a Payments App |
| `PAYMENTS_TO_BUYER_SERVICE_TOKEN` | Token que Payments usa para llamarnos |
| `SHIPPING_TO_BUYER_SERVICE_TOKEN` | Token que Shipping usa para llamarnos |

---

## El X-Request-Id para tracing

Cada llamada inter-app incluye un `X-Request-Id` con un UUID:

```ts
config.headers["X-Request-Id"] = crypto.randomUUID();
```

Si algo falla, podés buscar ese UUID en los logs de ambas apps para reconstruir qué ocurrió. El ID se propaga a lo largo de toda la cadena de llamadas.

---

## Reintentos automáticos

Si una llamada inter-app falla (ej: Shipping App está caída), el sistema retrocede con backoff exponencial:
- Intento 1: inmediato
- Intento 2: espera 1 segundo
- Intento 3: espera 3 segundos
- Si los 3 fallan: falla con error

Este comportamiento está en los axios interceptors o en el código del caller. Por ahora los mocks no simulan esto, pero es el comportamiento esperado en producción.

---

## Siguiente paso

→ [13-typescript-guia.md](13-typescript-guia.md) — cómo usar TypeScript en este proyecto.
