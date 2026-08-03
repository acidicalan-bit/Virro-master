"use client";

// Adapted from Origin UI (MIT): https://github.com/shadcn/originui
import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-7", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex w-full gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/[.035] p-1.5", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "min-h-10 flex-1 whitespace-nowrap rounded-full px-4 text-sm font-medium text-white/50 outline-none transition-all hover:text-white data-[state=active]:bg-white data-[state=active]:text-[#080b10] focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
