"use client";

// Adapted from Origin UI (MIT): https://github.com/shadcn/originui/blob/main/registry/default/ui/progress.tsx
import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("rebuild-progress", className)} {...props}>
      <ProgressPrimitive.Indicator className="rebuild-progress-indicator" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
