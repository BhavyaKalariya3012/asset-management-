import { cn } from "@/lib/utils";

type Tone =
  | "slate"
  | "blue"
  | "green"
  | "amber"
  | "orange"
  | "red"
  | "gray"
  | "emerald"
  | "yellow"
  | "indigo";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-100 text-blue-700 ring-blue-200",
  green: "bg-green-100 text-green-700 ring-green-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  orange: "bg-orange-100 text-orange-700 ring-orange-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  gray: "bg-gray-200 text-gray-700 ring-gray-300",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
