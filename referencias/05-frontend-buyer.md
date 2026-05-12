# 05 — Frontend del Buyer App

Cómo están construidas las páginas del Buyer App, qué componentes se usan y cómo agregar nuevas funcionalidades de UI.

---

## Las páginas del Buyer App

### `/` — Home (`src/app/page.tsx`)
Página pública. Punto de entrada para usuarios no autenticados.

### `/dashboard` — Dashboard (`src/app/dashboard/page.tsx`)
Protegida por Clerk. Bienvenida personalizada al usuario.

### `/shop` — Tienda (`src/app/shop/page.tsx`)
Lista de productos. Actualmente usa la API local (`/api/products`). En integración real, llama a Seller App.

**Funcionalidades**:
- Mostrar grilla de productos
- Botón "Agregar al carrito"
- Botón "Agregar a favoritos"

### `/cart` — Carrito (`src/app/cart/page.tsx`)
Muestra el carrito activo con posibilidad de modificar cantidades.

**Funcionalidades**:
- Ver todos los items
- Aumentar/disminuir cantidad
- Eliminar item
- Ver total
- Botón "Continuar al checkout"

### `/checkout` — Checkout (`src/app/checkout/page.tsx`)
Formulario para seleccionar dirección de envío y confirmar la orden.

### `/orders` — Órdenes (`src/app/orders/page.tsx`)
Historial de compras del usuario.

### `/profile` — Perfil (`src/app/profile/page.tsx`)
Formulario para editar datos del perfil y gestionar direcciones.

---

## Componentes propios del Buyer App

Están en `src/components/buyer/`.

### `buyer-nav.tsx`
Barra de navegación del comprador. Incluye links a shop, cart, orders y profile.

### `cart-item-card.tsx`
Tarjeta para mostrar un item del carrito. Acepta props:
- `item: CartItem` — los datos del item
- `onIncrement: () => void` — acción al hacer click en "+"
- `onDecrement: () => void` — acción al hacer click en "-"
- `onRemove: () => void` — acción al eliminar

```tsx
<CartItemCard
  item={cartItem}
  onIncrement={() => updateCartItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
  onDecrement={() => updateCartItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
  onRemove={() => removeCartItem.mutate(item.id)}
/>
```

### `order-summary.tsx`
Resumen de una orden. Muestra número de orden, estado, items y total.

---

## shadcn/ui — los componentes de UI

shadcn/ui es una colección de componentes de UI copiados directamente en el proyecto (están en `src/components/ui/`). Están basados en Radix UI y estilizados con Tailwind CSS.

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variantes disponibles
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Eliminar</Button>
<Button variant="ghost">Ghost</Button>

// Tamaños
<Button size="sm">Pequeño</Button>
<Button size="lg">Grande</Button>

// Estado de carga
<Button disabled={isLoading}>
  {isLoading ? "Cargando..." : "Guardar"}
</Button>

// Con icono
import { ShoppingCart } from "lucide-react";
<Button>
  <ShoppingCart className="size-4" />
  Agregar al carrito
</Button>
```

### Card

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Título de la card</CardTitle>
    <CardDescription>Descripción opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Contenido de la card
  </CardContent>
</Card>
```

### Input y Label

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="phone">Teléfono</Label>
  <Input
    id="phone"
    type="tel"
    placeholder="+54 11 1234-5678"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
  />
</div>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Nuevo</Badge>
<Badge variant="secondary">Secundario</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Select

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select onValueChange={(val) => setSelectedAddress(val)}>
  <SelectTrigger>
    <SelectValue placeholder="Seleccionar dirección" />
  </SelectTrigger>
  <SelectContent>
    {addresses.map(address => (
      <SelectItem key={address.id} value={address.id}>
        {address.label} — {address.street}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Dialog (modal)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título del modal</DialogTitle>
    </DialogHeader>
    <p>Contenido del modal</p>
  </DialogContent>
</Dialog>
```

### Skeleton (carga)

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Mostrar mientras los datos cargan
{isLoading ? (
  <div className="space-y-3">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
) : (
  <p>{data?.title}</p>
)}
```

---

## Formularios con React Hook Form + Zod

La combinación de React Hook Form y Zod es el patrón estándar para formularios en este proyecto.

### Ejemplo completo: formulario de edición de perfil

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBuyerProfile } from "@/hooks/use-buyer";

// 1. Definir el schema de validación
const profileSchema = z.object({
  displayName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  documentNumber: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm({ initialData }: { initialData: ProfileFormData }) {
  const updateProfile = useUpdateBuyerProfile();

  // 2. Inicializar el formulario
  const {
    register,       // Conecta un input al formulario
    handleSubmit,   // Envuelve tu función de submit con validación
    formState: { errors, isSubmitting },  // Estado del formulario
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),  // Conecta Zod con React Hook Form
    defaultValues: initialData,            // Valores iniciales
  });

  // 3. Función de envío (solo se llama si la validación pasa)
  const onSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Nombre</Label>
        <Input id="displayName" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-sm text-red-500">{errors.displayName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" {...register("phone")} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
```

**¿Qué hace cada parte?**
- `z.object({...})` → define las reglas de validación
- `z.infer<typeof schema>` → genera el tipo TypeScript automáticamente
- `zodResolver(schema)` → conecta Zod con React Hook Form
- `register("fieldName")` → conecta el input al formulario (agrega `name`, `onChange`, `onBlur`, `ref`)
- `handleSubmit(fn)` → valida antes de llamar a `fn`
- `formState.errors` → los mensajes de error de cada campo

---

## Cómo proteger una página con Clerk

Las páginas protegidas requieren que el usuario esté autenticado. Esto se maneja en el middleware:

```ts
// src/middleware.ts
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();  // Redirige a /sign-in si no está autenticado
  }
});
```

Si querés proteger solo páginas específicas, podés usar `auth.protect()` directamente en la página:

```tsx
// src/app/profile/page.tsx (Server Component)
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  
  // ...resto de la página
}
```

---

## Cómo agregar una nueva página

Ejemplo: agregar `/favorites` para ver los favoritos.

**Paso 1**: Crear `src/app/favorites/page.tsx`

```tsx
"use client";

import { useFavoriteItems, useRemoveFavoriteItem } from "@/hooks/use-buyer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavoriteItems();
  const removeFavorite = useRemoveFavoriteItem();

  if (isLoading) return <p>Cargando favoritos...</p>;

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Mis favoritos</h1>

      {favorites?.length === 0 && (
        <p className="text-muted-foreground">No tenés favoritos guardados.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {favorites?.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.sellerName}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeFavorite.mutate(item.id)}
                disabled={removeFavorite.isPending}
              >
                <Heart className="size-4" />
                Quitar de favoritos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Paso 2**: Agregar el link en la navegación (`src/components/buyer/buyer-nav.tsx`).

**Paso 3**: La ruta `/favorites` ya está disponible automáticamente.

---

## Manejo de estados de carga y error

Patrón estándar para cualquier página que carga datos:

```tsx
export default function MyPage() {
  const { data, isLoading, error } = useSomeHook();

  // 1. Estado de carga
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // 2. Estado de error
  if (error) {
    return (
      <p className="text-destructive">
        Error al cargar los datos. Intenta refrescar la página.
      </p>
    );
  }

  // 3. Estado sin datos
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No hay datos para mostrar.</p>;
  }

  // 4. Estado normal
  return <div>{/* renderizar data */}</div>;
}
```

---

## Tailwind CSS — clases útiles

```tsx
// Espaciado
<div className="p-4">         {/* padding 4 en todos los lados */}
<div className="px-6 py-8">   {/* padding horizontal 6, vertical 8 */}
<div className="space-y-4">   {/* gap vertical entre hijos */}
<div className="gap-4">       {/* gap en grid/flex */}

// Layout
<div className="flex items-center justify-between">
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
<div className="container mx-auto">   {/* ancho máximo centrado */}

// Tipografía
<h1 className="text-3xl font-bold">
<p className="text-sm text-muted-foreground">   {/* texto gris suave */}
<p className="text-destructive">                {/* texto rojo para errores */}

// Bordes y fondo
<div className="border border-border/60 rounded-lg bg-muted">
```

---

## Siguiente paso

→ [06-react-query-zustand.md](06-react-query-zustand.md) — cómo funciona la gestión de datos con React Query y Zustand.
