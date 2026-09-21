import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full resize-y rounded-xl border border-input/80 bg-background/75 px-3.5 py-3 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/75 hover:border-primary/40 focus-visible:border-primary/70 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
