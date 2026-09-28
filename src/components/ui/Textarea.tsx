import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const autoId = useId();
    const areaId = id ?? autoId;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={areaId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={!!error}
          className={cn(
            "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500",
            error ? "border-red-400 focus:ring-red-500" : "border-slate-300",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
