import type { OpenAPIV3 } from "openapi-types";

const clerkAuth: OpenAPIV3.SecuritySchemeObject = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "JWT emitido por Clerk. Obtenelo desde `useAuth().getToken()` en el frontend.",
};

const serviceToken: OpenAPIV3.SecuritySchemeObject = {
  type: "apiKey",
  in: "header",
  name: "X-Service-Token",
  description: "Token de servicio para comunicación inter-apps (Payments → Buyer, Shipping → Buyer).",
};

const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  BuyerProfile: {
    type: "object",
    properties: {
      id: { type: "string" },
      clerkUserId: { type: "string" },
      displayName: { type: "string", nullable: true },
      email: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      documentNumber: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  Address: {
    type: "object",
    properties: {
      id: { type: "string" },
      buyerProfileId: { type: "string" },
      label: { type: "string", example: "Casa" },
      street: { type: "string", example: "Av. Corrientes 1234" },
      city: { type: "string", example: "Buenos Aires" },
      state: { type: "string", nullable: true },
      zip: { type: "string", example: "1043" },
      country: { type: "string", example: "AR" },
      phone: { type: "string", nullable: true },
      isDefault: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CartItem: {
    type: "object",
    properties: {
      id: { type: "string" },
      cartId: { type: "string" },
      productId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      unitPrice: { type: "number" },
      quantity: { type: "integer" },
      subtotal: { type: "number" },
      sellerId: { type: "string" },
      sellerName: { type: "string", nullable: true },
      imageUrl: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  Cart: {
    type: "object",
    properties: {
      id: { type: "string" },
      buyerProfileId: { type: "string" },
      items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
      total: { type: "number" },
      itemCount: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  FavoriteItem: {
    type: "object",
    properties: {
      id: { type: "string" },
      buyerProfileId: { type: "string" },
      productId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      sellerId: { type: "string" },
      sellerName: { type: "string", nullable: true },
      imageUrl: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  OrderItem: {
    type: "object",
    properties: {
      id: { type: "string" },
      orderId: { type: "string" },
      orderSellerGroupId: { type: "string" },
      productId: { type: "string" },
      title: { type: "string" },
      quantity: { type: "integer" },
      unitPrice: { type: "number" },
      subtotal: { type: "number" },
      sellerId: { type: "string" },
    },
  },
  OrderSellerGroup: {
    type: "object",
    properties: {
      id: { type: "string" },
      orderId: { type: "string" },
      sellerId: { type: "string" },
      sellerName: { type: "string" },
      status: {
        type: "string",
        enum: ["PENDING", "PREPARING", "READY_TO_SHIP", "IN_TRANSIT", "DELIVERED", "SETTLED"],
      },
      shippingCost: { type: "number" },
      trackingNumber: { type: "string", nullable: true },
      trackingUrl: { type: "string", nullable: true },
      orderItems: {
        type: "array",
        items: { $ref: "#/components/schemas/OrderItem" },
      },
    },
  },
  Order: {
    type: "object",
    properties: {
      id: { type: "string" },
      buyerProfileId: { type: "string" },
      orderNumber: { type: "string", example: "ORD-1716000000000" },
      status: {
        type: "string",
        enum: [
          "PENDING_PAYMENT",
          "PAID",
          "PARTIALLY_SHIPPED",
          "SHIPPED",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "REFUNDED",
        ],
      },
      totalAmount: { type: "number" },
      shippingAmount: { type: "number" },
      shippingAddressId: { type: "string" },
      paymentId: { type: "string", nullable: true },
      items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
      sellerGroups: {
        type: "array",
        items: { $ref: "#/components/schemas/OrderSellerGroup" },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  Product: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      price: { type: "number" },
      sellerId: { type: "string", nullable: true },
      sellerName: { type: "string", nullable: true },
      imageUrl: { type: "string", nullable: true },
      stock: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  Error: {
    type: "object",
    properties: {
      error: { type: "string", example: "Unauthorized" },
    },
  },
  Success: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
    },
  },
};

export const openapiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Buyer App API",
    version: "1.0.0",
    description:
      "API del Buyer App del marketplace. Incluye endpoints para el perfil del comprador, carrito, favoritos, órdenes y checkout. Los endpoints `/api/buyer/*` requieren autenticación Clerk. Los endpoints `/api/v1/*` requieren un X-Service-Token (uso inter-servicios).",
  },
  servers: [
    { url: "http://localhost:3000", description: "Desarrollo local" },
  ],
  components: {
    securitySchemes: { ClerkJWT: clerkAuth, ServiceToken: serviceToken },
    schemas,
  },
  paths: {
    "/api/products": {
      get: {
        tags: ["Productos"],
        summary: "Listar productos",
        description: "Devuelve todos los productos disponibles. Ruta pública.",
        responses: {
          "200": {
            description: "Lista de productos",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Product" } },
              },
            },
          },
        },
      },
    },

    "/api/v1/buyer/profile": {
      get: {
        tags: ["Perfil"],
        summary: "Obtener perfil del comprador",
        description: "Devuelve el perfil del comprador autenticado. Lo crea automáticamente si no existe.",
        security: [{ ClerkJWT: [] }],
        responses: {
          "200": {
            description: "Perfil del comprador",
            content: { "application/json": { schema: { $ref: "#/components/schemas/BuyerProfile" } } },
          },
          "401": { description: "No autenticado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        tags: ["Perfil"],
        summary: "Actualizar perfil",
        description: "Actualiza displayName, phone y/o documentNumber del perfil.",
        security: [{ ClerkJWT: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["displayName"],
                properties: {
                  displayName: { type: "string", minLength: 2 },
                  phone: { type: "string" },
                  documentNumber: { type: "string" },
                },
              },
              example: { displayName: "Camila Rojas", phone: "+54 9 11 0000-0000" },
            },
          },
        },
        responses: {
          "200": {
            description: "Perfil actualizado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/BuyerProfile" } } },
          },
          "400": { description: "Datos inválidos" },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/buyer/addresses": {
      get: {
        tags: ["Direcciones"],
        summary: "Listar direcciones",
        description: "Devuelve todas las direcciones guardadas del comprador.",
        security: [{ ClerkJWT: [] }],
        responses: {
          "200": {
            description: "Lista de direcciones",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Address" } } } },
          },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["Direcciones"],
        summary: "Agregar dirección",
        description: "Crea una nueva dirección para el comprador. Si `isDefault: true`, desactiva la anterior.",
        security: [{ ClerkJWT: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["label", "street", "city", "zip", "country"],
                properties: {
                  label: { type: "string", example: "Casa" },
                  street: { type: "string", example: "Av. Corrientes 1234" },
                  city: { type: "string", example: "Buenos Aires" },
                  state: { type: "string" },
                  zip: { type: "string", example: "1043" },
                  country: { type: "string", example: "AR" },
                  phone: { type: "string" },
                  isDefault: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Dirección creada",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Address" } } },
          },
          "400": { description: "Datos inválidos" },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/buyer/addresses/{addressId}": {
      patch: {
        tags: ["Direcciones"],
        summary: "Actualizar dirección",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "addressId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  street: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip: { type: "string" },
                  country: { type: "string" },
                  phone: { type: "string" },
                  isDefault: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Dirección actualizada", content: { "application/json": { schema: { $ref: "#/components/schemas/Address" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "Dirección no encontrada" },
        },
      },
      delete: {
        tags: ["Direcciones"],
        summary: "Eliminar dirección",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "addressId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Dirección eliminada", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "Dirección no encontrada" },
        },
      },
    },

    "/api/v1/buyer/cart": {
      get: {
        tags: ["Carrito"],
        summary: "Obtener carrito",
        description: "Devuelve el carrito con sus items, total e itemCount. Lo crea si no existe.",
        security: [{ ClerkJWT: [] }],
        responses: {
          "200": {
            description: "Carrito del comprador",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } },
          },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["Carrito"],
        summary: "Agregar item al carrito",
        description: "Agrega un producto. Si ya existe, incrementa la cantidad.",
        security: [{ ClerkJWT: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "title", "description", "unitPrice", "quantity", "sellerId"],
                properties: {
                  productId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  unitPrice: { type: "number", minimum: 0 },
                  quantity: { type: "integer", minimum: 1 },
                  sellerId: { type: "string" },
                  sellerName: { type: "string" },
                  imageUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Item actualizado (ya existía)", content: { "application/json": { schema: { $ref: "#/components/schemas/CartItem" } } } },
          "201": { description: "Item creado", content: { "application/json": { schema: { $ref: "#/components/schemas/CartItem" } } } },
          "400": { description: "Datos inválidos" },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/buyer/cart/{itemId}": {
      patch: {
        tags: ["Carrito"],
        summary: "Actualizar cantidad de item",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "itemId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: { quantity: { type: "integer", minimum: 1 } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Item actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/CartItem" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "Item no encontrado" },
        },
      },
      delete: {
        tags: ["Carrito"],
        summary: "Eliminar item del carrito",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "itemId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Item eliminado", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "Item no encontrado" },
        },
      },
    },

    "/api/v1/buyer/favorites": {
      get: {
        tags: ["Favoritos"],
        summary: "Listar favoritos",
        security: [{ ClerkJWT: [] }],
        responses: {
          "200": {
            description: "Favoritos del comprador",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/FavoriteItem" } } } },
          },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["Favoritos"],
        summary: "Agregar a favoritos",
        description: "Si el producto ya está en favoritos, devuelve el existente sin duplicar.",
        security: [{ ClerkJWT: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "title", "description", "sellerId"],
                properties: {
                  productId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  sellerId: { type: "string" },
                  sellerName: { type: "string" },
                  imageUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Ya existía en favoritos", content: { "application/json": { schema: { $ref: "#/components/schemas/FavoriteItem" } } } },
          "201": { description: "Agregado a favoritos", content: { "application/json": { schema: { $ref: "#/components/schemas/FavoriteItem" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/buyer/favorites/{favoriteId}": {
      delete: {
        tags: ["Favoritos"],
        summary: "Quitar de favoritos",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "favoriteId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Eliminado", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },

    "/api/v1/buyer/orders": {
      get: {
        tags: ["Órdenes"],
        summary: "Listar órdenes",
        description: "Devuelve todas las órdenes del comprador, ordenadas por fecha descendente.",
        security: [{ ClerkJWT: [] }],
        responses: {
          "200": {
            description: "Lista de órdenes",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } },
          },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/buyer/orders/{orderId}": {
      get: {
        tags: ["Órdenes"],
        summary: "Detalle de orden",
        description: "Devuelve una orden con sus items y grupos de vendedores.",
        security: [{ ClerkJWT: [] }],
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Detalle de la orden",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          "401": { description: "No autenticado" },
          "404": { description: "Orden no encontrada" },
        },
      },
    },

    "/api/v1/buyer/checkout": {
      post: {
        tags: ["Checkout"],
        summary: "Iniciar checkout",
        description: "Convierte el carrito en una orden, calcula el shipping por vendedor, crea la sesión de pago en Payments App y vacía el carrito.",
        security: [{ ClerkJWT: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shippingAddressId", "returnUrl"],
                properties: {
                  shippingAddressId: { type: "string", description: "ID de la dirección de envío guardada" },
                  returnUrl: { type: "string", format: "uri", description: "URL a redirigir tras el pago" },
                },
              },
              example: {
                shippingAddressId: "clx0abc123",
                returnUrl: "http://localhost:3000/orders",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Orden creada y sesión de pago iniciada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paymentUrl: { type: "string", format: "uri" },
                    orderId: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Carrito vacío o datos inválidos" },
          "401": { description: "No autenticado" },
        },
      },
    },

    "/api/v1/orders/{orderId}": {
      patch: {
        tags: ["Inter-servicios"],
        summary: "Actualizar estado de orden (Payments → Buyer)",
        description: "Llamado por Payments App cuando cambia el estado del pago. Requiere X-Service-Token configurado como `PAYMENTS_TO_BUYER_SERVICE_TOKEN`.",
        security: [{ ServiceToken: [] }],
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PAID", "CANCELLED", "REFUNDED"],
                  },
                  payment_id: { type: "string" },
                },
              },
              example: { status: "PAID", payment_id: "pay_abc123" },
            },
          },
        },
        responses: {
          "200": { description: "Estado actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
          "401": { description: "Token inválido" },
          "404": { description: "Orden no encontrada" },
        },
      },
    },

    "/api/v1/orders/{orderId}/seller-groups/{groupId}/shipping": {
      patch: {
        tags: ["Inter-servicios"],
        summary: "Actualizar estado de envío (Shipping → Buyer)",
        description: "Llamado por Shipping App cuando cambia el estado del envío de un grupo vendedor. Requiere X-Service-Token configurado como `SHIPPING_TO_BUYER_SERVICE_TOKEN`.",
        security: [{ ServiceToken: [] }],
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string" } },
          { name: "groupId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PREPARING", "READY_TO_SHIP", "IN_TRANSIT", "DELIVERED", "SETTLED"],
                  },
                  tracking_number: { type: "string" },
                  tracking_url: { type: "string", format: "uri" },
                },
              },
              example: {
                status: "IN_TRANSIT",
                tracking_number: "OCA-0000000",
                tracking_url: "https://tracking.oca.com.ar/track/OCA-0000000",
              },
            },
          },
        },
        responses: {
          "200": { description: "Estado de envío actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/OrderSellerGroup" } } } },
          "401": { description: "Token inválido" },
          "404": { description: "Grupo no encontrado" },
        },
      },
    },
  },
};
