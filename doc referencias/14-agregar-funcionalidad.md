# 14 — Cómo agregar una nueva funcionalidad end-to-end

Tutorial completo que demuestra el proceso completo de agregar una nueva feature al Buyer App. Seguimos cada paso desde el schema de la DB hasta la UI.

---

## La funcionalidad que vamos a agregar

**"Reseñas de productos"**: el comprador puede dejar una reseña (puntuación 1-5 + comentario) en un producto que ya recibió.

---

## Paso 1: Definir el modelo en Prisma

Primero pensamos qué datos necesitamos guardar.

Una reseña tiene:
- `id`: identificador único
- `buyerProfileId`: quién la escribió
- `productId`: el producto que se reseña
- `orderItemId`: el item de orden que verifica que el comprador lo recibió
- `rating`: puntuación del 1 al 5
- `comment`: texto de la reseña (opcional)
- `createdAt`: cuándo fue escrita

**Editar `prisma/schema.prisma`:**

```prisma
model Review {
  id             String      @id @default(cuid())
  buyerProfile   BuyerProfile @relation(fields: [buyerProfileId], references: [id])
  buyerProfileId String
  productId      String
  orderItemId    String      @unique  // Cada item de orden puede tener una sola reseña
  rating         Int                  // 1 a 5
  comment        String?              // Opcional
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}
```

También agregar la relación en `BuyerProfile`:

```prisma
model BuyerProfile {
  // ...campos existentes...
  reviews       Review[]  // ← Agregar esta línea
}
```

**Aplicar los cambios:**

```bash
npx prisma db push
npx prisma generate
```

---

## Paso 2: Agregar los tipos TypeScript

**Editar `src/types/buyer.ts`:**

```ts
// Agregar al final del archivo
export type Review = {
  id: string;
  buyerProfileId: string;
  productId: string;
  orderItemId: string;
  rating: number;        // 1-5
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateReviewPayload = {
  productId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
};
```

---

## Paso 3: Crear la API route

Creamos el archivo `src/app/api/buyer/reviews/route.ts`:

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

// Schema de validación
const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(500).optional(),
});

// GET /api/buyer/reviews — listar mis reseñas
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autenticado" } },
      { status: 401 }
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const reviews = await prisma.review.findMany({
    where: { buyerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

// POST /api/buyer/reviews — crear una reseña
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autenticado" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map(i => i.message).join(", ") } },
      { status: 400 }
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  // Verificar que el orderItem pertenece al usuario
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      id: parsed.data.orderItemId,
      order: { buyerProfileId: profile.id },
    },
  });

  if (!orderItem) {
    return NextResponse.json(
      { error: { code: "ORDER_ITEM_NOT_FOUND", message: "No se encontró el item de orden" } },
      { status: 404 }
    );
  }

  // Verificar que no existe ya una reseña para este orderItem
  const existingReview = await prisma.review.findUnique({
    where: { orderItemId: parsed.data.orderItemId },
  });

  if (existingReview) {
    return NextResponse.json(
      { error: { code: "REVIEW_ALREADY_EXISTS", message: "Ya existe una reseña para este producto" } },
      { status: 409 }
    );
  }

  const review = await prisma.review.create({
    data: {
      buyerProfileId: profile.id,
      productId: parsed.data.productId,
      orderItemId: parsed.data.orderItemId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
```

---

## Paso 4: Crear los hooks con React Query

Agregar al final de `src/hooks/use-buyer.ts`:

```ts
import type { Review, CreateReviewPayload } from "@/types/buyer";

// Obtener mis reseñas
export function useMyReviews() {
  return useQuery<Review[]>({
    queryKey: ["my-reviews"],
    queryFn: async () => {
      const { data } = await api.get<Review[]>("/buyer/reviews");
      return data;
    },
  });
}

// Crear una reseña
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await api.post<Review>("/buyer/reviews", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });
}
```

---

## Paso 5: Crear el componente

Creamos `src/components/buyer/review-form.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/use-buyer";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, "El comentario debe tener al menos 5 caracteres").optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

type ReviewFormProps = {
  productId: string;
  orderItemId: string;
  onSuccess?: () => void;
};

export function ReviewForm({ productId, orderItemId, onSuccess }: ReviewFormProps) {
  const createReview = useCreateReview();
  const [selectedRating, setSelectedRating] = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  const onSubmit = async (data: ReviewFormData) => {
    await createReview.mutateAsync({
      productId,
      orderItemId,
      rating: selectedRating,
      comment: data.comment,
    });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Selector de estrellas */}
      <div>
        <p className="text-sm font-medium mb-2">Puntuación</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSelectedRating(star)}
              className={`text-2xl ${star <= selectedRating ? "text-yellow-400" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Comentario */}
      <div>
        <label className="text-sm font-medium">Comentario (opcional)</label>
        <Textarea
          {...register("comment")}
          placeholder="Contá tu experiencia con este producto..."
          rows={3}
        />
        {errors.comment && (
          <p className="text-sm text-destructive">{errors.comment.message}</p>
        )}
      </div>

      <Button type="submit" disabled={selectedRating === 0 || createReview.isPending}>
        {createReview.isPending ? "Enviando..." : "Publicar reseña"}
      </Button>
    </form>
  );
}
```

---

## Paso 6: Integrar en la página de órdenes

Modificar `src/app/orders/page.tsx` para mostrar el botón de reseña en items de órdenes entregadas:

```tsx
"use client";

import { useBuyerOrders } from "@/hooks/use-buyer";
import { ReviewForm } from "@/components/buyer/review-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const { data: orders, isLoading } = useBuyerOrders();

  if (isLoading) return <p>Cargando órdenes...</p>;

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Mis pedidos</h1>

      {orders?.map((order) => (
        <div key={order.id} className="mb-8 border rounded-lg p-4">
          <p>Orden: {order.orderNumber}</p>
          <p>Estado: {order.status}</p>

          {/* Mostrar items con botón de reseña si la orden fue entregada */}
          {order.status === "DELIVERED" && order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between mt-2">
              <span>{item.title}</span>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Dejar reseña
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reseña de {item.title}</DialogTitle>
                  </DialogHeader>
                  <ReviewForm
                    productId={item.productId}
                    orderItemId={item.id}
                  />
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Paso 7: Verificar que funciona

### 1. Verificar que el schema se aplicó

```bash
npx prisma studio
```

Verificar que la tabla `Review` existe en Prisma Studio.

### 2. Probar el endpoint directamente

```bash
# Crear una reseña
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"productId":"prd_1","orderItemId":"ci_xxx","rating":5,"comment":"Excelente producto!"}' \
  http://localhost:3000/api/buyer/reviews
```

### 3. Probar en la UI

1. `npm run dev`
2. Hacer un checkout para crear una orden
3. Ir a `/orders`
4. Si la orden está en estado `DELIVERED` (cambiar manualmente con Prisma Studio para testear), ver el botón "Dejar reseña"
5. Dejar una reseña
6. Verificar en Prisma Studio que se guardó

---

## Resumen del proceso

```
1. Schema (prisma/schema.prisma)
   ↓
2. Tipos (src/types/buyer.ts)
   ↓
3. API Route (src/app/api/buyer/reviews/route.ts)
   ↓
4. Hook (src/hooks/use-buyer.ts)
   ↓
5. Componente (src/components/buyer/review-form.tsx)
   ↓
6. Página (src/app/orders/page.tsx)
```

Este es el patrón para **cualquier** nueva funcionalidad en el Buyer App:
- **Datos persistentes** → schema + API route
- **Lógica de negocio** → API route o `buyer-service.ts`
- **Estado del servidor** → React Query hook
- **Interactividad** → componente con `"use client"`
- **Integración** → página existente o nueva

---

## Checklist para agregar una feature

- [ ] Definí el modelo en `schema.prisma` y aplicaste los cambios con `db push`
- [ ] Regeneraste el cliente Prisma con `npx prisma generate`
- [ ] Agregaste los tipos en `src/types/`
- [ ] Creaste la/s API route/s con validación Zod y auth de Clerk
- [ ] Creaste el/los hook/s en `src/hooks/use-buyer.ts`
- [ ] Creaste los componentes de UI necesarios
- [ ] Integraste en la página correspondiente
- [ ] Testeaste el flujo completo manualmente
- [ ] Verificaste que `npm run build` compila sin errores
