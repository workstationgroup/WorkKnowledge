"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface LessonsFilterProps {
  categories: Category[];
  isAdmin: boolean;
  total: number;
}

export function LessonsFilter({ categories, isAdmin, total }: LessonsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      params.delete("page"); // reset to page 1 on any filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Debounce search input → URL update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ q: query }), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Sync query state when URL changes externally (e.g. back button)
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const activeCategory = searchParams.get("category") ?? "";
  const activeStatus = searchParams.get("status") ?? "";

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons by title or description..."
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills + status filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category */}
        <button onClick={() => push({ category: "" })}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            !activeCategory
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          All categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => push({ category: cat.slug })}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              activeCategory === cat.slug
                ? "text-white border-transparent"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
            style={activeCategory === cat.slug ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
          >
            {cat.name}
          </button>
        ))}

        {/* Status (admin only) — on its own row on mobile */}
        {isAdmin && (
          <div className="flex items-center gap-1 w-full sm:w-auto sm:ml-2 sm:pl-2 sm:border-l sm:border-gray-200 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            {(["", "PUBLISHED", "DRAFT", "CANCELLED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => push({ status: s })}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  activeStatus === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s === "" ? "All" : s === "PUBLISHED" ? "Published" : s === "DRAFT" ? "Draft" : "Cancelled"}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400">{total} lesson{total !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Build page number array: always show first, last, current ±1, with ellipsis
  const range: (number | "…")[] = [];
  const add = (n: number) => { if (!range.includes(n)) range.push(n); };
  add(1);
  if (page > 3) range.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page < totalPages - 2) range.push("…");
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {range.map((r, i) =>
        r === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={r}
            onClick={() => go(r)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              r === page
                ? "bg-indigo-600 text-white"
                : "text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {r}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}
