"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AssetStatus, Condition } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { STATUS_LABELS } from "@/lib/lifecycle";

type Option = { id: string; name: string };

const CONDITION_LABELS: Record<Condition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  CRITICAL: "Critical",
};

export function AssetFilters({
  categories,
  divisions,
  isAdmin,
}: {
  categories: Option[];
  divisions: Option[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the local search box in sync when the URL changes externally (Reset).
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // any filter change resets to page 1
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function onSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value) params.set("q", value);
        else params.delete("q");
      });
    }, 300);
  }

  function onSelect(key: string, value: string) {
    pushParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function reset() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-[220px] flex-1">
        <Input
          label="Search"
          placeholder="Name, code or road number"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="w-40">
        <Select
          label="Status"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => onSelect("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.values(AssetStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44">
        <Select
          label="Category"
          value={searchParams.get("categoryId") ?? ""}
          onChange={(e) => onSelect("categoryId", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-40">
        <Select
          label="Condition"
          value={searchParams.get("condition") ?? ""}
          onChange={(e) => onSelect("condition", e.target.value)}
        >
          <option value="">All conditions</option>
          {Object.values(Condition).map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>

      {isAdmin && (
        <div className="w-48">
          <Select
            label="Division"
            value={searchParams.get("divisionId") ?? ""}
            onChange={(e) => onSelect("divisionId", e.target.value)}
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Button variant="secondary" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}
