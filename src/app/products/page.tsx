"use client";

import { useState } from "react";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus } from "lucide-react";

export default function ProductsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: products, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createProduct.mutate(
      { title, description },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
        },
      }
    );
  };

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Productos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo CRUD con Prisma + TanStack Query
        </p>
      </div>

      {/* Formulario */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Crear Producto</CardTitle>
          <CardDescription>
            POST /api/products — Axios — useMutation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Titulo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre del producto"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion del producto"
              />
            </div>
            <Button type="submit" disabled={createProduct.isPending}>
              <Plus className="size-4" />
              {createProduct.isPending ? "Creando..." : "Crear Producto"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            GET /api/products — Axios — useQuery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {products && products.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No hay productos. Crea uno arriba.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {products?.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold">
                    {product.title}
                  </h3>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Producto
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.description}
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {product.id}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
