"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/ui/Pagination";

export function AssetPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onPageChange(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
    />
  );
}
