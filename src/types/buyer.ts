export type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  weightGrams: number;
  imageUrl?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BuyerProfile = {
  id: string;
  clerkUserId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  defaultShippingAddressId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Address = {
  id: string;
  buyerProfileId: string;
  alias: string;
  street: string;
  number: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export enum CartStatus {
  ACTIVE = "ACTIVE",
  CONVERTED = "CONVERTED",
}

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  sellerProfileId: string;
  quantity: number;
  addedAt: string;
  // Enriched at read time from live seller catalog
  productName: string;
  unitPriceCents: number;
  currency: string;
  weightGrams: number;
  imageUrl?: string | null;
};

export type Cart = {
  id: string;
  buyerProfileId: string;
  status: CartStatus;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  totalCents: number;
  itemCount: number;
};

export type FavoriteItem = {
  id: string;
  buyerProfileId: string;
  productId: string;
  addedAt: string;
};

export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  PREPARING = "PREPARING",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum SellerGroupStatus {
  PENDING = "PENDING",
  PREPARING = "PREPARING",
  READY_TO_SHIP = "READY_TO_SHIP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  SETTLED = "SETTLED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum ShippingStatus {
  CREATED = "CREATED",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED = "RETURNED",
}

export type OrderSellerGroup = {
  id: string;
  orderId: string;
  sellerProfileId: string;
  itemsSubtotalCents: number;
  shippingCostCents: number;
  shippingQuoteId?: string | null;
  shipmentId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  weightGramsTotal: number;
  status: SellerGroupStatus;
  shippingStatus?: ShippingStatus | null;
  createdAt: string;
  updatedAt: string;
  orderItems?: OrderItem[];
};

export type OrderItem = {
  id: string;
  orderId: string;
  sellerGroupId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  weightGramsSnapshot: number;
};

export type Order = {
  id: string;
  buyerProfileId: string;
  paymentId?: string | null;
  status: OrderStatus;
  itemsTotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  currency: string;
  shippingAddressSnapshot: Record<string, unknown>;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  sellerGroups: OrderSellerGroup[];
};
