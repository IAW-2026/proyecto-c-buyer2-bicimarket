# 11 — El flujo completo de una compra multi-vendedor

Traza paso a paso de lo que ocurre cuando un comprador hace una compra con productos de dos vendedores distintos. Es el flujo más importante del sistema y el que más apps involucra.

---

## El escenario

El comprador tiene en su carrito:
- **Producto A**: "Bicicleta Trek Marlin 5" de BiciShop Buenos Aires
- **Producto B**: "Casco Giro" de Urban Bike Store

Va a hacer el checkout. Resultado esperado:
- Una `Order` en el Buyer App
- Dos `OrderSellerGroup` (uno por vendedor)
- Cuatro `OrderItem` (dos por grupo)
- Una sesión de pago creada en Payments App
- El comprador redirigido a Mercado Pago

---

## Fase 1: Agregar productos al carrito

### ¿Qué hace el frontend?

En `/shop`, el usuario hace click en "Agregar al carrito" para el Producto A.

```tsx
// shop/page.tsx
const handleAddToCart = async (product: Product) => {
  await addCartItem.mutateAsync({
    productId: product.id,
    title: product.title,
    description: product.description,
    unitPrice: product.price,
    quantity: 1,
    sellerId: product.seller_profile_id,
    sellerName: product.seller_name,
  });
};
```

### ¿Qué hace la API?

`POST /api/buyer/cart` en `src/app/api/buyer/cart/route.ts`:

1. Verifica autenticación con Clerk
2. Obtiene o crea el `BuyerProfile` del usuario
3. Obtiene o crea el `Cart` del usuario
4. Si el producto ya está en el carrito → suma la cantidad
5. Si no → crea un nuevo `CartItem` con snapshot del producto

**Estado de la DB después de agregar los dos productos:**

```
Cart (cart_001)
├── CartItem (ci_001): productId="prd_001", title="Bicicleta Trek", unitPrice=450000, qty=1, sellerId="sel_001"
└── CartItem (ci_002): productId="prd_002", title="Casco Giro", unitPrice=35000, qty=1, sellerId="sel_002"
```

---

## Fase 2: Iniciar el checkout

El usuario va a `/checkout`, selecciona una dirección de envío y confirma.

### ¿Qué hace el frontend?

```tsx
// checkout/page.tsx
const { mutateAsync: checkout } = useCheckoutCart();

const handleConfirm = async () => {
  const result = await checkout({
    shippingAddressId: selectedAddressId,
    returnUrl: window.location.origin + "/orders",
  });
  
  window.location.href = result.paymentUrl;  // Redirigir a Mercado Pago
};
```

### ¿Qué hace la API?

`POST /api/buyer/checkout` en `src/app/api/buyer/checkout/route.ts`:

**Paso 1: Verificar que el carrito no está vacío**
```ts
const cart = await prisma.cart.findUnique({
  where: { buyerProfileId: profile.id },
  include: { items: true },
});
if (!cart || cart.items.length === 0) {
  return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
}
```

**Paso 2: Agrupar items por vendedor**
```ts
const groupedItems = groupItemsBySeller(cart.items);
// Resultado:
// {
//   "sel_001": [CartItem_Bicicleta],
//   "sel_002": [CartItem_Casco]
// }
```

**Paso 3: Calcular costos de envío por grupo**
```ts
// Llama a Shipping App (o usa mock si no está configurada)
const shippingQuotes = await getShippingQuotes([
  {
    seller_profile_id: "sel_001",
    shipping_address: { street: "Av. Corrientes 1234", city: "Buenos Aires", ... },
    items: [{ weight_grams: 13500, quantity: 1 }]
  },
  {
    seller_profile_id: "sel_002",
    shipping_address: { ... },
    items: [{ weight_grams: 320, quantity: 1 }]
  }
]);
// Resultado: [{ seller_profile_id: "sel_001", cost: 1475 }, { seller_profile_id: "sel_002", cost: 816 }]
```

**Paso 4: Calcular totales**
```
Total items:    450000 + 35000 = 485000
Total shipping: 1475 + 816 = 2291
Total orden:    487291 (centavos de ARS = $4872.91)
```

**Paso 5: Crear la Order en la DB**
```ts
const order = await prisma.order.create({
  data: {
    buyerProfileId: profile.id,
    orderNumber: "ORD-1716823847291",
    status: "PENDING_PAYMENT",
    totalAmount: 485000,
    shippingAmount: 2291,
    shippingAddressId: "adr_001",
  },
});
```

**Paso 6: Crear los OrderSellerGroups**
```ts
const group1 = await prisma.orderSellerGroup.create({
  data: {
    orderId: order.id,
    sellerId: "sel_001",
    sellerName: "BiciShop Buenos Aires",
    shippingCost: 1475,
    status: "PENDING",
  },
});

const group2 = await prisma.orderSellerGroup.create({
  data: {
    orderId: order.id,
    sellerId: "sel_002",
    sellerName: "Urban Bike Store",
    shippingCost: 816,
    status: "PENDING",
  },
});
```

**Paso 7: Crear los OrderItems**
```ts
await prisma.orderItem.createMany({
  data: [
    {
      orderId: order.id,
      orderSellerGroupId: group1.id,
      productId: "prd_001",
      title: "Bicicleta Trek Marlin 5",
      quantity: 1,
      unitPrice: 450000,
      subtotal: 450000,
      sellerId: "sel_001",
    },
    {
      orderId: order.id,
      orderSellerGroupId: group2.id,
      productId: "prd_002",
      title: "Casco Giro Register",
      quantity: 1,
      unitPrice: 35000,
      subtotal: 35000,
      sellerId: "sel_002",
    },
  ],
});
```

**Paso 8: Vaciar el carrito**
```ts
await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
```

**Paso 9: Crear sesión de pago**
```ts
// Llama a Payments App (o usa mock)
const payment = await createPayment({
  order_id: order.id,
  total_amount: 487291,
  currency: "ARS",
  buyer_email: "buyer@example.com",
  items: [...],
  return_url: "https://buyer.bicimarket.com/orders",
  idempotency_key: order.id,
});
// Resultado: { payment_id: "pay_xxx", checkout_url: "https://mercadopago.com/..." }
```

**Paso 10: Guardar el paymentId y responder**
```ts
await prisma.order.update({
  where: { id: order.id },
  data: { paymentId: payment.payment_id },
});

return NextResponse.json({
  orderId: order.id,
  paymentUrl: payment.checkout_url,
});
```

**Estado de la DB después del checkout:**

```
Order (ord_001)
├── status: PENDING_PAYMENT
├── totalAmount: 485000
├── shippingAmount: 2291
├── paymentId: "pay_xxx"
├── OrderSellerGroup (osg_001) — BiciShop
│   ├── status: PENDING
│   ├── shippingCost: 1475
│   └── OrderItem: "Bicicleta Trek" qty=1 unitPrice=450000
└── OrderSellerGroup (osg_002) — Urban Bike
    ├── status: PENDING
    ├── shippingCost: 816
    └── OrderItem: "Casco Giro" qty=1 unitPrice=35000

Cart (cart_001): items = [] (vaciado)
```

---

## Fase 3: El comprador paga en Mercado Pago

El comprador fue redirigido a la URL de MP. Completa el pago.

Mercado Pago notifica a la **Payments App** (NO al Buyer App directamente). Esta es la única notificación webhook del sistema.

---

## Fase 4: Payments actualiza el estado de la orden

Payments App recibió la confirmación de MP y ahora le avisa al Buyer App:

```
PATCH /api/v1/orders/{orderId}
Headers: X-Service-Token: [secret]
Body: { "status": "paid", "payment_id": "pay_mp_official_123" }
```

El Buyer App maneja esto en `src/app/api/v1/orders/[orderId]/route.ts`:

```ts
const updated = await prisma.order.update({
  where: { id: orderId },
  data: { status: "PAID", paymentId: "pay_mp_official_123" },
});
```

**Estado de la DB:**
```
Order (ord_001)
└── status: PAID  ← cambió de PENDING_PAYMENT a PAID
```

---

## Fase 5: Payments crea las sales_orders en Seller App

Payments App le avisa a la Seller App (esto es responsabilidad de Payments, no del Buyer App).

La Seller App crea las sub-órdenes y prepara los paquetes.

---

## Fase 6: Shipping actualiza el estado de los envíos

Cuando el paquete sale a distribución, la Shipping App notifica al Buyer App:

```
PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping
Headers: X-Service-Token: [secret]
Body: { "status": "in_transit", "tracking_number": "TRK123456" }
```

El Buyer App en `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts`:

```ts
await prisma.orderSellerGroup.update({
  where: { id: groupId },
  data: { status: "IN_TRANSIT" },
});

// Como este grupo está in_transit, actualizar el status de la Order
await prisma.order.update({
  where: { id: orderId },
  data: { status: "SHIPPED" },
});
```

---

## Fase 7: Entrega y liquidación

Cuando el paquete es entregado:

```
PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping
Body: { "status": "delivered" }
```

Si **todos** los grupos quedan en `DELIVERED`, la Order también pasa a `DELIVERED`.

Finalmente, Payments App hace la liquidación al vendedor y marca el grupo como `SETTLED`.

---

## Diagrama de estados de la Order

```
PENDING_PAYMENT
    ↓ (Payments PATCH paid)
PAID
    ↓ (Shipping PATCH in_transit en algún grupo)
PARTIALLY_SHIPPED (si solo algunos grupos salieron)
    ↓ (todos los grupos en in_transit)
SHIPPED
    ↓ (todos los grupos en delivered)
DELIVERED
    ↓ (confirmar recepción)
COMPLETED

Desde cualquier estado:
PENDING_PAYMENT → CANCELLED (si el pago falla o el usuario cancela)
Cualquiera → REFUNDED (si hay un reembolso)
```

---

## ¿Por qué se usan snapshots?

Los `OrderItem` guardan `title`, `unitPrice`, `sellerId`, etc. en el momento del checkout. No referencian el producto actual de la Seller App.

**Razón**: un vendedor puede modificar o eliminar un producto después de que fue comprado. La orden debe reflejar el producto exactamente como era al momento de la compra, no como está ahora.

Este es el principio del **snapshot**: capturar el estado de un dato externo en un momento específico del tiempo.

---

## ¿Por qué el Buyer App es "soberano" de las órdenes?

El `order_id` lo genera el Buyer App. Todas las demás apps (Seller, Shipping, Payments) guardan ese `order_id` como referencia externa, sin FK a ninguna tabla propia.

Esto significa:
- No hay duplicados de órdenes (una sola fuente de verdad)
- El Buyer App controla el ciclo de vida de la orden
- Las demás apps pueden consultar el estado de la orden al Buyer App si lo necesitan

---

## Siguiente paso

→ [12-inter-servicios.md](12-inter-servicios.md) — cómo funciona la comunicación entre las 4 apps del sistema.
