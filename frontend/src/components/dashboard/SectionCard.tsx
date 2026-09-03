import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card-surface app-section-card flex flex-col", className)}>
      <header className="app-section-card-header flex flex-wrap items-start justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div>
          <h2 className="text-sm leading-tight font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={cn("flex-1 p-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}
