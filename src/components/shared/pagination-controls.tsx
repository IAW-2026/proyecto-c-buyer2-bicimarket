"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const adjacent = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = Array.from(adjacent).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export function PaginationControls({ page, total, limit, onChange, className }: Props) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="flex size-8 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            size="icon"
            className="size-8 text-sm"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
