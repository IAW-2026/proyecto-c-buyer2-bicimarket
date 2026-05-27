import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Bike, ShoppingCart, Truck, CreditCard } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/shop");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Bike className="size-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">BiciMarket</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <span>Cómo funciona</span>
          <span>Vendedores</span>
          <span>Ayuda</span>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 py-20 text-center">
          <p className="mb-4 flex items-center gap-1.5 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Marketplace de bicicletas en Argentina
          </p>
          <h1 className="font-heading max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Tu próxima bici,{" "}
            <span className="block">en una sola compra.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Compará vendedores, armá un solo pedido con productos de varias
            tiendas y seguí cada envío en tiempo real.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
              Iniciar sesión
            </Link>
            <Link href="/sign-up" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Crear cuenta
            </Link>
          </div>
        </section>

        {/* Product showcase */}
        <section className="px-6 pb-16">
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {["hero · mountain bike", "casco", "accesorios"].map((label) => (
              <div
                key={label}
                className="flex aspect-video items-center justify-center rounded-xl border border-border/60 bg-secondary/30"
              >
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/60 px-6 py-16">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <Feature
              icon={ShoppingCart}
              title="Un solo pedido, varios vendedores"
              description="Mezclá productos de distintas tiendas en una misma compra. Los envíos se coordinan automáticamente por vendedor."
            />
            <Feature
              icon={Truck}
              title="Seguí tu envío en tiempo real"
              description="Cada vendedor te da un código de tracking. Mirá el estado de cada parte de tu pedido."
            />
            <Feature
              icon={CreditCard}
              title="Pagá de forma segura"
              description="Procesamos tus pagos con Mercado Pago. Tu información siempre está protegida."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
        <Icon className="size-5 text-primary" />
      </div>
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
