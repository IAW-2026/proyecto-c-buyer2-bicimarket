import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

// Tipos
interface Product {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateProductData {
  title: string;
  description: string;
}

// GET — trae todos los productos
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/products");
      return data;
    },
  });
}

// POST — crea un producto nuevo
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProduct: CreateProductData) => {
      const { data } = await api.post("/products", newProduct);
      return data;
    },
    onSuccess: () => {
      // Invalida el cache para que se refetcheen los productos
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
