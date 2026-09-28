import { cn } from "@/lib/utils";

export function TableWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function Th({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(onClick && "cursor-pointer hover:bg-slate-50", className)}
    >
      {children}
    </tr>
  );
}

export function Td({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <td className={cn("px-4 py-3 text-slate-700", className)}>{children}</td>;
}
