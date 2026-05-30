"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Truck,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Star,
  Bike,
  Settings2,
  Package,
  Shirt,
  ExternalLink,
} from "lucide-react";
import { useProducts, useFavoriteItems, useBuyerCart } from "@/hooks/use-buyer";
import { useCartMutations } from "@/hooks/querys/cart/useCartMutations";
import { useFavoriteMutations } from "@/hooks/querys/favorites/useFavoriteMutations";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGridSkeleton } from "@/components/shop/product-grid-skeleton";
import { matchesCategory, CATEGORIES } from "@/lib/categories";
import type { Product } from "@/types/buyer";
import { cn } from "@/lib/utils";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};
const stagger = (delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: delay } },
});

/* ─── constants ─── */
const LANDING_CATEGORIES = [
  {
    id: "bicicletas",
    label: "Bicicletas",
    Icon: Bike,
    bg: "bg-rose-50",
    accent: "text-rose-700",
    border: "border-rose-100",
  },
  {
    id: "componentes",
    label: "Componentes",
    Icon: Settings2,
    bg: "bg-amber-50",
    accent: "text-amber-700",
    border: "border-amber-100",
  },
  {
    id: "accesorios",
    label: "Accesorios",
    Icon: Package,
    bg: "bg-sky-50",
    accent: "text-sky-700",
    border: "border-sky-100",
  },
  {
    id: "indumentaria",
    label: "Indumentaria",
    Icon: Shirt,
    bg: "bg-emerald-50",
    accent: "text-emerald-700",
    border: "border-emerald-100",
  },
];

const BENEFITS = [
  {
    Icon: Truck,
    title: "Envío hoy en CABA y AMBA",
    desc: "Logística propia. Si comprás antes de las 14 hs, llega el mismo día.",
  },
  {
    Icon: CreditCard,
    title: "Pago en pesos, cuotas sin interés",
    desc: "Tarjetas, MercadoPago, transferencia. 6 cuotas sin interés.",
  },
  {
    Icon: RefreshCw,
    title: "Cambios y devoluciones",
    desc: "Hasta 30 días para devolver, sin preguntas. Te coordinamos el retiro.",
  },
  {
    Icon: ShieldCheck,
    title: "Compra protegida",
    desc: "Si el producto no llega o no es lo que pediste, te devolvemos la plata.",
  },
];

const FOOTER_LINKS = {
  Tienda: ["Bicicletas", "Componentes", "Accesorios", "Indumentaria", "Ofertas"],
  Vendedores: ["Sumar mi bicicletería", "Panel del vendedor", "Política de comisiones", "Logística"],
  Ayuda: ["Cómo comprar", "Envíos", "Cambios y devoluciones", "Contacto"],
  Legales: ["Términos", "Privacidad", "Defensa al consumidor", "Arrepentimiento"],
};

/* ─── Featured products tabs ─── */
const TABS = [
  { id: "todos", label: "Todos" },
  { id: "bicicletas", label: "Bicicletas" },
  { id: "componentes", label: "Componentes" },
  { id: "accesorios", label: "Accesorios" },
  { id: "indumentaria", label: "Indumentaria" },
];

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function HomePage() {
  const { data: products, isLoading } = useProducts();
  const { data: favorites } = useFavoriteItems();
  const { data: cart } = useBuyerCart();
  const { addItem: addCartItem } = useCartMutations();
  const { addItem: addFavoriteItem, removeItem: removeFavoriteItem } = useFavoriteMutations();

  const favoriteProductIds = new Set(favorites?.map((f) => f.productId) ?? []);
  const cartProductIds = new Set(cart?.items.map((i) => i.productId) ?? []);

  async function handleAddToCart(product: Product) {
    await addCartItem.mutateAsync({
      productId: product.id,
      sellerProfileId: product.sellerId ?? "unknown",
      productNameSnapshot: product.title,
      unitPriceCents: Math.round((product.price ?? 0) * 100),
      quantity: 1,
      weightGramsSnapshot: 0,
    });
  }

  async function handleToggleFavorite(product: Product) {
    const existing = favorites?.find((f) => f.productId === product.id);
    if (existing) {
      await removeFavoriteItem.mutateAsync(existing.id);
    } else {
      await addFavoriteItem.mutateAsync({ productId: product.id });
    }
  }

  /* category product counts */
  const categoryCounts = useMemo(() => {
    if (!products) return {} as Record<string, number>;
    return Object.fromEntries(
      CATEGORIES.map((cat) => [
        cat.id,
        products.filter((p) => matchesCategory(p, cat.id)).length,
      ]),
    );
  }, [products]);

  /* unique sellers derived from products */
  const sellers = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const p of products) {
      const id = p.sellerId ?? "unknown";
      const name = p.sellerName ?? "Vendedor";
      const cur = map.get(id);
      map.set(id, { id, name, count: (cur?.count ?? 0) + 1 });
    }
    return Array.from(map.values()).slice(0, 3);
  }, [products]);

  const sellerCount = useMemo(() => {
    if (!products) return undefined;
    return new Set(products.map((p) => p.sellerId ?? "unknown")).size;
  }, [products]);

  return (
    <>
      <HeroSection productCount={products?.length} sellerCount={sellerCount} />

      <CategoriesSection counts={categoryCounts} />

      <FeaturedSection
        products={products}
        isLoading={isLoading}
        favoriteProductIds={favoriteProductIds}
        cartProductIds={cartProductIds}
        addCartItem={addCartItem}
        addFavoriteItem={addFavoriteItem}
        removeFavoriteItem={removeFavoriteItem}
        onAddToCart={handleAddToCart}
        onToggleFavorite={handleToggleFavorite}
      />

      <PromoBanner />

      <BenefitsSection />

      <SellersSection sellers={sellers} />

      <Footer />
    </>
  );
}

/* ──────────────────────────────────────────────
   HERO
──────────────────────────────────────────────── */
function HeroSection({ productCount, sellerCount }: { productCount?: number; sellerCount?: number }) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-6 py-16 lg:flex-row lg:gap-16 lg:py-20">
      {/* Left */}
      <motion.div
        className="flex flex-1 flex-col gap-6"
        variants={stagger(0)}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Marketplace argentino · {productCount ? `+${productCount}` : "+12.000"} productos
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-heading text-4xl font-black leading-tight tracking-tight lg:text-5xl xl:text-6xl"
        >
          De la bicicletería{" "}
          <span className="text-primary">al pedal</span>
          {", "}sin escalas.
        </motion.h1>

        <motion.p variants={fadeUp} className="max-w-md text-base text-muted-foreground">
          Bicicletas, repuestos y accesorios de bicicleterías de todo el país. Logística propia,
          envío hoy en CABA y AMBA, y pago en pesos con cuotas.
        </motion.p>

        <motion.div variants={fadeUp} className="flex items-center gap-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Explorar tienda
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="https://proyecto-c-seller-pierinospina.vercel.app/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Soy bicicletería
            <ExternalLink className="size-3.5" />
          </a>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-8 border-t border-border/60 pt-6">
          {[
            { value: sellerCount ? `+${sellerCount}` : "+340", label: "Bicicleterías vendiendo" },
            { value: "24 h", label: "Envío promedio en CABA" },
            { value: "4.8 ★", label: "Promedio de reseñas" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right — bicycle illustration card */}
      <motion.div
        className="w-full max-w-sm flex-shrink-0 lg:max-w-none lg:w-96 xl:w-[460px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-orange-50 to-pink-100 p-8 pb-12">
          {/* Floating card top */}
          <motion.div
            className="absolute right-4 top-4 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Truck className="size-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">Tu envío</p>
              <p className="text-xs font-semibold">Llega hoy 18-20 hs</p>
            </div>
          </motion.div>

          {/* Bike illustration */}
          <div className="flex items-center justify-center py-8">
            <BikeIllustration />
          </div>

          {/* Floating card bottom */}
          <motion.div
            className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-amber-100">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium">BiciSur · Caballito</p>
              <p className="text-[10px] text-muted-foreground">4,9 · 128 reseñas</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   CATEGORIES
──────────────────────────────────────────────── */
function CategoriesSection({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="bg-muted/30 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Categorías
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Explorá por categoría
            </h2>
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {LANDING_CATEGORIES.map((cat) => {
            const count = counts[cat.id] ?? 0;
            return (
              <motion.div key={cat.id} variants={fadeUp}>
                <Link
                  href={`/shop?category=${cat.id}`}
                  className={cn(
                    "group flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 transition-shadow hover:shadow-md",
                    cat.bg,
                    cat.border,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-heading text-base font-bold">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {count > 0 ? `${count} productos` : "Ver todos"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex justify-end">
                    <cat.Icon className={cn("size-16 opacity-20", cat.accent)} strokeWidth={1} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   FEATURED PRODUCTS
──────────────────────────────────────────────── */
type FeaturedSectionProps = {
  products: Product[] | undefined;
  isLoading: boolean;
  favoriteProductIds: Set<string>;
  cartProductIds: Set<string>;
  addCartItem: ReturnType<typeof useCartMutations>["addItem"];
  addFavoriteItem: ReturnType<typeof useFavoriteMutations>["addItem"];
  removeFavoriteItem: ReturnType<typeof useFavoriteMutations>["removeItem"];
  onAddToCart: (p: Product) => void;
  onToggleFavorite: (p: Product) => void;
};

function FeaturedSection({
  products,
  isLoading,
  favoriteProductIds,
  cartProductIds,
  addCartItem,
  addFavoriteItem,
  removeFavoriteItem,
  onAddToCart,
  onToggleFavorite,
}: FeaturedSectionProps) {
  const [activeTab, setActiveTab] = useState("todos");

  const filtered = useMemo(() => {
    if (!products) return [];
    const base =
      activeTab === "todos" ? products : products.filter((p) => matchesCategory(p, activeTab));
    return base.filter((p) => p.isActive).slice(0, 8);
  }, [products, activeTab]);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Más vendidos
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Productos destacados esta semana
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curado por nuestro equipo según ventas, reseñas y disponibilidad.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            Ver toda la tienda
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const count =
              tab.id === "todos"
                ? products?.filter((p) => p.isActive).length ?? 0
                : products?.filter((p) => p.isActive && matchesCategory(p, tab.id)).length ?? 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[10px]",
                      activeTab === tab.id ? "opacity-60" : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && <ProductGridSkeleton />}

        {!isLoading && filtered.length > 0 && (
          <motion.div
            key={activeTab}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={stagger(0)}
            initial="hidden"
            animate="show"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} variants={fadeUp}>
                <ProductCard
                  product={product}
                  isFavorite={favoriteProductIds.has(product.id)}
                  isInCart={cartProductIds.has(product.id)}
                  isAddingToCart={addCartItem.isPending}
                  isAddingFavorite={addFavoriteItem.isPending || removeFavoriteItem.isPending}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   PROMO BANNER
──────────────────────────────────────────────── */
function PromoBanner() {
  return (
    <motion.section
      className="mx-6 mb-8 overflow-hidden rounded-3xl lg:mx-auto lg:max-w-7xl"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between lg:p-12"
        style={{ backgroundColor: "oklch(0.22 0.05 168)" }}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Hot Sale BiciMarket · 24-31 Mayo
          </p>
          <h2 className="font-heading text-2xl font-bold leading-tight text-white lg:text-3xl">
            Hasta 35% off en cubiertas,<br />cámaras y accesorios.
          </h2>
          <p className="max-w-sm text-sm text-white/60">
            Bonificación de envío en todas las compras + 6 cuotas sin interés con bancos
            seleccionados. Stock limitado en cada bicicletería.
          </p>
          <Link
            href="/shop"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ver ofertas
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Decorative percentage */}
        <div className="relative flex items-center justify-center">
          <span
            className="select-none font-heading text-8xl font-black opacity-20 lg:text-9xl"
            style={{ color: "oklch(0.60 0.155 168)" }}
          >
            35%
          </span>
          <div
            className="absolute right-0 top-0 size-16 rounded-full border-4 opacity-20"
            style={{ borderColor: "oklch(0.60 0.155 168)" }}
          />
          <div
            className="absolute bottom-0 left-0 size-10 rounded-full border-4 opacity-10"
            style={{ borderColor: "oklch(0.60 0.155 168)" }}
          />
        </div>
      </div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────
   BENEFITS
──────────────────────────────────────────────── */
function BenefitsSection() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {BENEFITS.map((b) => (
            <motion.div key={b.title} variants={fadeUp} className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <b.Icon className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SELLERS
──────────────────────────────────────────────── */
function SellersSection({
  sellers,
}: {
  sellers: { id: string; name: string; count: number }[];
}) {
  return (
    <section id="vendedores" className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Bicicleterías
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Comprá directo a vendedores verificados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada producto sale de una bicicletería real, con stock físico y atención humana.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            Ver todos
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {sellers.length > 0
            ? sellers.map((seller) => (
                <motion.div key={seller.id} variants={fadeUp}>
                  <SellerCard name={seller.name} count={seller.count} />
                </motion.div>
              ))
            : /* placeholder cards when no data */
              ["BiciSur", "Pedales del Plata", "La Rueda"].map((name) => (
                <motion.div key={name} variants={fadeUp}>
                  <SellerCard name={name} count={0} />
                </motion.div>
              ))}
        </motion.div>
      </div>
    </section>
  );
}

function SellerCard({ name, count }: { name: string; count: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/shop?q=${encodeURIComponent(name)}`}
      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        {count > 0 && (
          <p className="text-xs text-muted-foreground">{count} productos</p>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-medium">4.9</span>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────
   FOOTER
──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ backgroundColor: "oklch(0.15 0.01 160)" }}>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <Bike className="size-3.5 text-primary-foreground" />
              </div>
              <span className="font-heading text-base font-semibold text-white">BiciMarket</span>
            </div>
            <p className="text-xs leading-relaxed text-white/50">
              El marketplace argentino de bicicletas y repuestos. De bicicleterías reales, con envío
              de verdad.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                {section}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-white/60 transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-white/30">
            © 2026 BiciMarket S.A. · CUIT 30-71234567-8 · Av. Corrientes 1234, CABA
          </p>
          <div className="flex items-center gap-2">
            {["VISA", "MC", "Amex", "MP"].map((p) => (
              <span
                key={p}
                className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────
   BIKE ILLUSTRATION (inline SVG)
──────────────────────────────────────────────── */
function BikeIllustration() {
  return (
    <svg
      viewBox="0 0 260 180"
      fill="none"
      className="w-full max-w-xs"
      stroke="oklch(0.40 0.13 168)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Rear wheel */}
      <circle cx="65" cy="115" r="48" />
      {/* Front wheel */}
      <circle cx="195" cy="115" r="48" />
      {/* Rear axle to bottom bracket */}
      <line x1="65" y1="115" x2="130" y2="67" />
      {/* Seat tube */}
      <line x1="130" y1="67" x2="118" y2="115" />
      {/* Chainstay */}
      <line x1="118" y1="115" x2="65" y2="115" />
      {/* Down tube */}
      <line x1="118" y1="115" x2="158" y2="52" />
      {/* Top tube */}
      <line x1="130" y1="67" x2="158" y2="52" />
      {/* Fork */}
      <line x1="158" y1="52" x2="195" y2="115" />
      {/* Head tube */}
      <line x1="155" y1="44" x2="160" y2="60" />
      {/* Handlebar stem */}
      <line x1="155" y1="44" x2="172" y2="44" />
      {/* Handlebar drops */}
      <line x1="148" y1="44" x2="176" y2="44" />
      {/* Seat */}
      <line x1="116" y1="60" x2="145" y2="60" />
      {/* Seat post */}
      <line x1="130" y1="60" x2="130" y2="67" />
      {/* Rear wheel spokes */}
      <line x1="65" y1="67" x2="65" y2="163" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="17" y1="115" x2="113" y2="115" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="31" y1="81" x2="99" y2="149" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="31" y1="149" x2="99" y2="81" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Front wheel spokes */}
      <line x1="195" y1="67" x2="195" y2="163" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="147" y1="115" x2="243" y2="115" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="161" y1="81" x2="229" y2="149" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="161" y1="149" x2="229" y2="81" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Chain ring */}
      <circle cx="118" cy="115" r="14" strokeOpacity="0.5" />
    </svg>
  );
}
