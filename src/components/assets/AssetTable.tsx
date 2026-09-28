"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { AssetStatus, Condition, ApprovalStatus } from "@prisma/client";
import {
  TableWrapper,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@/components/ui/Table";
import { StatusBadge } from "./StatusBadge";
import { ConditionBadge } from "./ConditionBadge";
import { ApprovalBadge } from "./ApprovalBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export type AssetRow = {
  id: string;
  assetCode: string;
  name: string;
  roadNumber: string | null;
  lengthKm: number | null;
  status: AssetStatus;
  condition: Condition;
  approvalStatus: ApprovalStatus;
  acquisitionCost: number | null;
  updatedAt: string | Date;
  category: { name: string };
  division: { name: string };
};

type SortField = "assetCode" | "name" | "lengthKm" | "acquisitionCost" | "createdAt";

export function AssetTable({
  rows,
  isAdmin,
}: {
  rows: AssetRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") ?? "desc";

  function toggleSort(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("order", nextOrder);
    router.push(`${pathname}?${params.toString()}`);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field)
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return order === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  }

  function SortableTh({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <Th className={className}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 uppercase hover:text-slate-700"
        >
          {children}
          <SortIcon field={field} />
        </button>
      </Th>
    );
  }

  return (
    <TableWrapper>
      <Thead>
        <Tr>
          <SortableTh field="assetCode">Code</SortableTh>
          <SortableTh field="name">Name</SortableTh>
          <Th>Category</Th>
          <Th>Road No</Th>
          <SortableTh field="lengthKm">Length (km)</SortableTh>
          {isAdmin && <Th>Division</Th>}
          <Th>Status</Th>
          <Th>Condition</Th>
          <Th>Approval</Th>
          <SortableTh field="acquisitionCost">Cost (₹)</SortableTh>
          <SortableTh field="createdAt">Updated</SortableTh>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row) => (
          <Tr key={row.id} onClick={() => router.push(`/assets/${row.id}`)}>
            <Td className="font-medium text-slate-900">{row.assetCode}</Td>
            <Td className="text-slate-900">{row.name}</Td>
            <Td>{row.category.name}</Td>
            <Td>{row.roadNumber ?? "—"}</Td>
            <Td className="tabular-nums">
              {row.lengthKm != null ? row.lengthKm : "—"}
            </Td>
            {isAdmin && <Td>{row.division.name}</Td>}
            <Td>
              <StatusBadge status={row.status} />
            </Td>
            <Td>
              <ConditionBadge condition={row.condition} />
            </Td>
            <Td>
              <ApprovalBadge status={row.approvalStatus} />
            </Td>
            <Td className="tabular-nums">
              {row.acquisitionCost != null
                ? formatCurrency(row.acquisitionCost)
                : "—"}
            </Td>
            <Td className="whitespace-nowrap">{formatDate(row.updatedAt)}</Td>
          </Tr>
        ))}
      </Tbody>
    </TableWrapper>
  );
}
