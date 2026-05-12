export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BuyerProfile = {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  documentNumber?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  id: string;
  productId: string;
  title: string;
  description: string;
  unitPrice: number;
  quantity: number;
  sellerId: string;
  sellerName?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
};

export type Cart = {
  id: string;
  buyerProfileId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  total: number;
  itemCount: number;
};

export type FavoriteItem = {
  id: string;
  productId: string;
  title: string;
  description: string;
  sellerId: string;
  sellerName?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
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
}

export type OrderSellerGroup = {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName?: string | null;
  shippingCost: number;
  status: SellerGroupStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  orderSellerGroupId?: string | null;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  buyerProfileId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAmount: number;
  paymentId?: string | null;
  shippingAddressId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  sellerGroups: OrderSellerGroup[];
};
