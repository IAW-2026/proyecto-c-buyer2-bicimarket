# 17 — Cambio de estados del pedido

Qué significa cada estado de cada modelo, qué lo dispara, qué escribe en la DB y qué efecto tiene en la interfaz.

---

## Modelos que tienen estado

| Modelo | App dueña | Campo(s) de estado |
|---|---|---|
| `Order` | **Buyer App** | `status` |
| `OrderSellerGroup` | **Buyer App** | `status` + `shippingStatus` (espejo) |
| `payment` | **Payments App** | `status` |
| `settlement` | **Payments App** | `status` |
| `shipment` | **Shipping App** | `status` |
| `sales_order` | **Seller App** | `fulfillment_status` + `payment_status` + `shipping_status` (espejo) |

El Buyer App es la fuente de verdad de los dos primeros. Las otras apps notifican sus cambios al Buyer App (y entre sí) vía REST con `X-Service-Token`.

---

## 1. `Order.status` (Buyer App)

### `PENDING_PAYMENT`

**Qué significa**: la orden fue creada pero el pago aún no fue confirmado. El comprador está en Mercado Pago o acaba de volver.

**Quién lo asigna**: el checkout al crear la orden (`POST /api/v1/buyer/checkout`).

**Código**: `src/app/api/v1/buyer/checkout/route.ts`
```ts
await prisma.order.create({ data: { status: "PENDING_PAYMENT", ... } });
```

**Badge**: fondo amarillo — "Pago pendiente"

**Stepper**: paso 0 "Pedido" pulsa (anillo animado). Resto gris.

---

### `PAID`

**Qué significa**: Payments App confirmó que Mercado Pago aprobó el pago.

**Quién lo asigna**: Payments App llama `PATCH /api/v1/orders/{orderId}` con `{ status: "paid", payment_id: "pay_…" }`.

**Código**: `src/app/api/v1/orders/[orderId]/route.ts`
```ts
await prisma.order.update({ data: { status: "PAID", paymentId: payment_id } });
await prisma.orderStatusHistory.create({ data: { fromStatus, toStatus: "PAID", source: "payments" } });
```

**Badge**: fondo verde — "Pagado"

**Stepper**: paso 0 verde sólido, paso 1 "Pago" pulsa.

---

### `PARTIALLY_SHIPPED`

**Qué significa**: al menos un grupo de vendedor está `IN_TRANSIT` pero otros todavía no. El pedido está parcialmente en camino.

**Quién lo asigna**: Shipping App llama `PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping` con `status: "in_transit"`. El Buyer App detecta que no todos los grupos llegaron a `IN_TRANSIT` o superior.

**Condición exacta**:
```
algún grupo pasó a IN_TRANSIT  
&&  al menos un grupo NO está en [IN_TRANSIT, DELIVERED, SETTLED]
```

**Código**: `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts`

**Badge**: fondo azul — "Envío parcial"

**Stepper**: pasos 0/1/2 verdes sólidos, paso 3 "En camino" pulsa.

---

### `SHIPPED`

**Qué significa**: todos los grupos de vendedor están en tránsito o más avanzados.

**Quién lo asigna**: mismo endpoint que `PARTIALLY_SHIPPED`, cuando el Buyer App verifica que ahora todos los grupos están en `[IN_TRANSIT, DELIVERED, SETTLED]` y al menos uno no está todavía entregado.

**Condición exacta**:
```
todos los grupos están en [IN_TRANSIT, DELIVERED, SETTLED]  
&&  al menos uno NO está en [DELIVERED, SETTLED]
```

**Badge**: fondo primario (azul app) — "En camino"

**Stepper**: pasos 0/1/2 verdes sólidos, paso 3 "En camino" pulsa.

---

### `DELIVERED`

**Qué significa**: todos los grupos de vendedor fueron entregados al comprador.

**Quién lo asigna**: mismo endpoint de shipping cuando el último grupo pasa a `delivered` y el Buyer App verifica que todos los grupos están en `[DELIVERED, SETTLED]`.

**Condición exacta**:
```
todos los grupos están en [DELIVERED, SETTLED]
```

**Badge**: fondo verde — "Entregado"

**Stepper**: todos los 5 círculos verdes sólidos con checkmark. Sin animaciones.

---

### `COMPLETED`

**Qué significa**: pasaron N días desde la entrega sin disputas. Terminal.

**Quién lo asigna**: por ahora solo admin manualmente (`PATCH /api/admin/orders/{orderId}` con `{ status: "COMPLETED" }`). En el futuro: cron automático.

**Badge**: fondo verde — "Completado"

**Stepper**: igual que `DELIVERED` — todos los círculos verdes sólidos.

---

### `CANCELLED`

**Qué significa**: el comprador canceló antes de que la orden fuera enviada. Solo posible desde `PENDING_PAYMENT`, `PAID` o `PAYMENT_FAILED`.

**Quién lo asigna**: comprador llama `POST /api/v1/buyer/orders/{orderId}/cancel`.

**Código**: `src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts`
```ts
const CANCELLABLE_STATUSES = ["PENDING_PAYMENT", "PAID", "PAYMENT_FAILED"];
// Si no está en esa lista → 409 "Order cannot be cancelled in its current status"
await prisma.order.update({ data: { status: "CANCELLED" } });
await prisma.orderStatusHistory.create({ data: { ..., source: "buyer" } });
```

**Badge**: fondo rojo — "Cancelada"

**Stepper**: todos los círculos en rojo (estado `error`). Sin progreso.

---

### `PAYMENT_FAILED`

**Qué significa**: Mercado Pago rechazó el pago.

**Quién lo asigna**: Payments App llama `PATCH /api/v1/orders/{orderId}` con `{ status: "payment_failed" }`.

**Badge**: fondo rojo — "Pago fallido"

**Stepper**: todos los círculos en rojo.

---

### `REFUNDED`

**Qué significa**: se procesó un reembolso total. Puede venir por rechazo del vendedor o por disputa post-entrega.

**Quién lo asigna**: Payments App llama `PATCH /api/v1/orders/{orderId}` con `{ status: "refunded" }`.

**Badge**: fondo naranja — "Reembolsado"

**Stepper**: todos los círculos en rojo.

---

## Transiciones válidas de `Order.status`

```
PENDING_PAYMENT ──► PAID
PENDING_PAYMENT ──► PAYMENT_FAILED
PENDING_PAYMENT ──► CANCELLED

PAID ──► PARTIALLY_SHIPPED     (orden con 2+ vendedores, primero en tránsito)
PAID ──► SHIPPED                (orden con un solo vendedor)
PAID ──► REFUNDED

PARTIALLY_SHIPPED ──► SHIPPED
PARTIALLY_SHIPPED ──► REFUNDED

SHIPPED ──► DELIVERED
SHIPPED ──► REFUNDED

DELIVERED ──► COMPLETED
DELIVERED ──► REFUNDED

COMPLETED      → terminal
PAYMENT_FAILED → terminal
CANCELLED      → terminal
REFUNDED       → terminal
```

---

## 2. `OrderSellerGroup.status` (Buyer App)

Cada grupo tiene su propio ciclo, independiente de los demás grupos de la misma orden.

### `PENDING`

**Qué significa**: el grupo fue creado al hacer checkout. El vendedor aún no respondió.

**Quién lo asigna**: checkout.

**Badge del grupo**: fondo amarillo — "Pendiente"

---

### `PREPARING`

**Qué significa**: el vendedor aceptó la orden en su app y está preparando el paquete.

**Quién lo asigna**: Seller App llama `PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/status` con `{ status: "preparing" }`.

**Código**: `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/status/route.ts`
```ts
// Solo acepta PENDING → PREPARING. Devuelve 409 si el grupo no está en PENDING.
await prisma.orderSellerGroup.update({ data: { status: SellerGroupStatus.PREPARING } });
await prisma.orderStatusHistory.create({ data: { ..., source: "seller" } });
```

**Efecto en `Order.status`**: ninguno. La orden permanece en `PAID`.

**Badge del grupo**: fondo azul — "Preparando"

---

### `READY_TO_SHIP`

**Qué significa**: el paquete está listo y esperando que el carrier lo retire.

**Quién lo asigna**: Shipping App llama el endpoint de shipping con `{ status: "ready_to_ship" }`.

**Efecto en `Order.status`**: ninguno.

**Badge del grupo**: fondo cyan — "Listo para enviar"

---

### `IN_TRANSIT`

**Qué significa**: el carrier retiró el paquete, está en camino hacia el comprador.

**Quién lo asigna**: Shipping App con `{ status: "in_transit" }`.

**Efecto en `Order.status`**: puede disparar `PARTIALLY_SHIPPED` o `SHIPPED` según cuántos grupos están en tránsito (ver sección 1).

**Badge del grupo**: fondo primario — "En camino"

---

### `DELIVERED`

**Qué significa**: el paquete fue entregado al comprador.

**Quién lo asigna**: Shipping App con `{ status: "delivered" }`.

**Efecto en `Order.status`**: puede disparar `DELIVERED` si todos los grupos también están entregados.

**Badge del grupo**: fondo verde — "Entregado"

---

### `SETTLED`

**Qué significa**: Payments App ya transfirió el dinero al vendedor (liquidación completada). Estado final normal.

**Quién lo asigna**: Payments App (internamente, después de confirmar el payout a MP).

**Efecto en `Order.status`**: ninguno. A efectos del recálculo, `SETTLED` se trata igual que `DELIVERED`.

**Badge del grupo**: fondo gris — "Liquidado"

---

### `CANCELLED` / `REFUNDED`

**Qué significa**: el grupo fue cancelado o reembolsado (por rechazo del vendedor o disputa).

**Quién lo asigna**: Payments App.

**Badge del grupo**: rojo / naranja.

---

## 3. `payment.status` (Payments App)

El `payment` vive en la base de datos de Payments App. El Buyer App solo guarda el `paymentId` como referencia opaca.

### `pending`

**Qué significa**: la preferencia de pago fue creada en Mercado Pago. El comprador todavía no completó el pago.

**Quién lo asigna**: Payments App al crear el pago (`POST /api/v1/payments`).

**Efecto en Buyer App**: la orden ya tiene `paymentId` asignado pero sigue en `PENDING_PAYMENT`.

---

### `approved`

**Qué significa**: Mercado Pago procesó el pago y lo aprobó. El webhook llegó a Payments App, que confirmó el estado con `GET /v1/payments/{id}` a MP.

**Quién lo asigna**: Payments App al recibir el webhook de MP con `action: "payment.updated"`.

**Efecto en Buyer App**: Payments llama `PATCH /api/v1/orders/{orderId}` con `{ status: "paid" }`. La orden pasa a `PAID`.

**Efecto en Seller App**: Payments llama `POST /api/v1/sales-orders` creando una sub-orden por cada vendedor con `payment_status: "paid"`.

---

### `rejected`

**Qué significa**: Mercado Pago rechazó el pago (fondos insuficientes, tarjeta inválida, etc.).

**Quién lo asigna**: Payments App al recibir el webhook con status rechazado.

**Efecto en Buyer App**: Payments llama `PATCH /api/v1/orders/{orderId}` con `{ status: "payment_failed" }`.

---

### `cancelled`

**Qué significa**: el pago fue cancelado antes de completarse (expiró o se canceló manualmente).

**Quién lo asigna**: `POST /api/v1/payments/{paymentId}/cancel` (solo si está en `pending`), o admin override.

**Efecto en Buyer App**: si corresponde, Payments llama al endpoint de status con `{ status: "cancelled" }`.

---

### `refunded`

**Qué significa**: se procesó un reembolso parcial o total contra el pago aprobado.

**Quién lo asigna**: `POST /api/v1/payments/{paymentId}/refund` (lo llama Seller App al rechazar, o admin).

**Efecto en Buyer App**: Payments llama `PATCH /api/v1/orders/{orderId}` con `{ status: "refunded" }`.

---

## 4. `settlement.status` (Payments App)

La liquidación (`settlement`) representa el pago que Payments App le debe hacer al vendedor tras una entrega.

### `pending`

**Quién lo asigna**: Payments App crea el `settlement` automáticamente cuando recibe `POST /api/v1/internal/shipment-delivered` de Shipping.

**Efecto en Seller App**: Payments llama `PATCH /api/v1/sales-orders/{id}/payment-status` con `{ payment_status: "settled" }`.

---

### `paid`

**Qué significa**: el payout a Mercado Pago del vendedor fue completado.

**Quién lo asigna**: cron interno o admin llama `POST /api/v1/payouts` con el `settlement_id`.

---

### `failed` / `manual_review`

**Qué significa**: el payout falló (hasta 3 reintentos). `manual_review` indica que requiere intervención humana.

---

## 5. `shipment.status` (Shipping App)

El `shipment` vive en Shipping App. El Buyer App guarda una copia espejo en `OrderSellerGroup.shippingStatus`.

### `created`

**Qué significa**: el envío fue registrado en Shipping App. Todavía no tiene carrier asignado ni etiqueta.

**Quién lo dispara**: Seller App llama `POST /api/v1/shipments` cuando marca su `sales_order` como `ready_to_ship`.

**Efecto en Buyer App**: Shipping llama al endpoint de shipping con `{ status: "ready_to_ship" }` → `shippingStatus = CREATED`, `groupStatus = READY_TO_SHIP`.

---

### `ready_for_pickup`

**Qué significa**: la etiqueta fue generada y asignada a un operador logístico. El carrier puede venir a retirar.

**Quién lo dispara**: Shipping App internamente, al generar la etiqueta.

**Efecto en Buyer App**: `shippingStatus = READY_FOR_PICKUP`.

---

### `picked_up`

**Qué significa**: el carrier retiró el paquete del vendedor.

**Quién lo dispara**: evento de tracking (`POST /api/v1/shipments/{id}/tracking-events` con `event_type: "picked_up"`).

**Efecto en Buyer App**: `shippingStatus = PICKED_UP`. El `groupStatus` no cambia todavía.

---

### `in_transit`

**Qué significa**: el paquete está en movimiento hacia el destino final.

**Quién lo dispara**: evento de tracking con `event_type: "in_transit"`.

**Efecto en Buyer App**: Shipping llama `PATCH .../shipping` con `{ status: "in_transit" }` → `groupStatus = IN_TRANSIT`, `shippingStatus = IN_TRANSIT`, y la orden puede pasar a `PARTIALLY_SHIPPED` o `SHIPPED`.

---

### `out_for_delivery`

**Qué significa**: el paquete está en reparto, cerca del domicilio del comprador.

**Quién lo dispara**: evento de tracking con `event_type: "out_for_delivery"`.

**Efecto en Buyer App**: `shippingStatus = OUT_FOR_DELIVERY`. El `groupStatus` no cambia.

---

### `delivered`

**Qué significa**: el paquete fue entregado. El operador subió foto y/o firma como prueba.

**Quién lo dispara**: `POST /api/v1/shipments/{id}/deliver` con la prueba de entrega.

**Efecto en Buyer App**: Shipping llama `PATCH .../shipping` con `{ status: "delivered" }` → `groupStatus = DELIVERED`, `shippingStatus = DELIVERED`, y la orden puede pasar a `DELIVERED`.

**Efecto en Payments App**: Shipping llama `POST /api/v1/internal/shipment-delivered` para gatillar la liquidación al vendedor.

---

### `failed_delivery`

**Qué significa**: el carrier intentó entregar pero no pudo (nadie en casa, dirección incorrecta, etc.).

**Quién lo dispara**: evento de tracking con `event_type: "failed_delivery"`.

**Efecto en Buyer App**: `shippingStatus = FAILED_DELIVERY`. La orden no cambia de estado. Se agenda un segundo intento.

---

### `returned`

**Qué significa**: el paquete fue devuelto al vendedor tras múltiples intentos fallidos.

**Quién lo dispara**: evento de tracking con `event_type: "returned"` (luego de 3 intentos fallidos).

**Efecto en Buyer App**: `shippingStatus = RETURNED`. Dispara flujo de reembolso.

---

## 6. `sales_order.fulfillment_status` (Seller App)

La `sales_order` es la vista que tiene el vendedor de los productos que le corresponden dentro de una orden.

### `pending`

**Quién lo asigna**: Payments App al crear la sub-orden (`POST /api/v1/sales-orders`) cuando el pago es aprobado.

**Efecto en Buyer App**: ninguno.

---

### `accepted`

**Quién lo asigna**: vendedor hace `POST /api/v1/sales-orders/{id}/accept` en su app.

**Efecto en Buyer App**: Seller App llama `PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/status` con `{ status: "preparing" }`. El grupo pasa a `PREPARING`.

---

### `rejected`

**Quién lo asigna**: vendedor hace `POST /api/v1/sales-orders/{id}/reject`.

**Efecto en Buyer App**: Seller App llama a Payments para reembolso parcial. Payments luego notifica al Buyer App.

---

### `preparing`

**Quién lo asigna**: vendedor llama `PATCH /api/v1/sales-orders/{id}/prepare` en su app. El vendedor está armando el paquete.

**Efecto en Buyer App**: ninguno adicional (el grupo ya está en `PREPARING`).

---

### `ready_to_ship`

**Quién lo asigna**: vendedor llama el mismo `PATCH /prepare` con `{ fulfillment_status: "ready_to_ship" }`. Al pasar a este estado, Seller App crea el `shipment` en Shipping App (`POST /api/v1/shipments`).

**Efecto en Buyer App**: Shipping App notifica el nuevo envío → `groupStatus = READY_TO_SHIP`, `shippingStatus = CREATED`.

---

### `handed_over`

**Qué significa**: el carrier retiró el paquete del vendedor (equivale a `picked_up` en el shipment).

**Quién lo asigna**: Shipping App llama `PATCH /api/v1/sales-orders/{id}/shipping-status` con `shipping_status: "picked_up"`.

---

### `delivered`

**Quién lo asigna**: Shipping App llama `PATCH /api/v1/sales-orders/{id}/shipping-status` con `shipping_status: "delivered"`.

---

## Cómo se propaga cada cambio (mapa completo)

```
Mercado Pago
  └─► POST /webhooks/mercadopago  (Payments App)
        └─► Payments resuelve estado real con GET a MP
        └─► PATCH /api/v1/orders/{id}  →  Buyer App actualiza order.status
        └─► POST /api/v1/sales-orders  →  Seller App crea sub-órdenes (si approved)

Vendedor acepta en Seller App
  └─► POST /api/v1/sales-orders/{id}/accept  (Seller App)
        └─► PATCH /api/v1/orders/{id}/seller-groups/{g}/status  →  Buyer App: group = PREPARING

Vendedor marca ready_to_ship
  └─► PATCH /api/v1/sales-orders/{id}/prepare  (Seller App)
        └─► POST /api/v1/shipments  →  Shipping App crea el shipment
              └─► PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping  →  Buyer App: group = READY_TO_SHIP

Evento de tracking
  └─► POST /api/v1/shipments/{id}/tracking-events  (Shipping App)
        └─► PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping  →  Buyer App: group + shippingStatus actualizados
        └─► PATCH /api/v1/sales-orders/{id}/shipping-status  →  Seller App: shipping_status espejo

Entrega confirmada
  └─► POST /api/v1/shipments/{id}/deliver  (Shipping App)
        └─► PATCH .../shipping  →  Buyer App: group = DELIVERED, order puede pasar a DELIVERED
        └─► PATCH .../shipping-status  →  Seller App: fulfilled
        └─► POST /api/v1/internal/shipment-delivered  →  Payments App: crea settlement

Comprador cancela
  └─► POST /api/v1/buyer/orders/{orderId}/cancel  (Buyer App)
        └─► order.status = CANCELLED

Admin
  └─► PATCH /api/admin/orders/{orderId}  (Buyer App)
        └─► order.status = cualquier valor
```

---

## Resumen visual en el stepper del comprador

El componente `OrderStatusStepper` (`src/components/orders/order-status-flow.tsx`) muestra:  
**Pedido (0) · Pago (1) · Preparación (2) · En camino (3) · Entregado (4)**

| `order.status` | Paso activo | Efecto visual |
|---|---|---|
| `PENDING_PAYMENT` | 0 | Solo "Pedido" pulsa. Resto gris. |
| `PAID` | 1 | "Pedido" verde. "Pago" pulsa. |
| `PARTIALLY_SHIPPED` | 3 | 0/1/2 verdes. "En camino" pulsa. |
| `SHIPPED` | 3 | 0/1/2 verdes. "En camino" pulsa. |
| `DELIVERED` | — | Los 5 círculos verdes sólidos con checkmark. Sin pulsación. |
| `COMPLETED` | — | Igual que `DELIVERED`. |
| `PAYMENT_FAILED` / `CANCELLED` / `REFUNDED` | — | Todos los círculos en rojo. |

> El paso 2 "Preparación" no tiene un `order.status` correspondiente. Queda verde cuando la orden avanza a `PARTIALLY_SHIPPED` o superior porque `i < currentStep`.

---

## Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `src/app/api/v1/orders/[orderId]/route.ts` | Recibe updates de Payments App |
| `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/status/route.ts` | Recibe update de Seller App (PENDING → PREPARING) |
| `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts` | Recibe updates de Shipping App, recalcula `order.status` |
| `src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts` | Permite al comprador cancelar |
| `src/app/api/admin/orders/[orderId]/route.ts` | Permite al admin cambiar cualquier estado |
| `src/components/orders/order-status-flow.tsx` | Stepper visual — mapeo status → paso |
| `src/components/shared/status-badge.tsx` | Badge de color por estado |
| `src/types/buyer.ts` | Enums `OrderStatus`, `SellerGroupStatus`, `ShippingStatus` |
| `src/types/inter-service.ts` | Payloads que mandan Payments y Shipping al Buyer App |
