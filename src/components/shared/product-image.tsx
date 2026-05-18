import Image from "next/image";
import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "size-10",
  md: "size-14",
  lg: "size-full aspect-video",
};

export function ProductImage({ src, alt, className, size = "md" }: ProductImageProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-md bg-muted", sizeClasses[size], className)}>
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-secondary/40",
        sizeClasses[size],
        className,
      )}
    >
      <Bike className="size-5 text-muted-foreground/50" />
    </div>
  );
}
