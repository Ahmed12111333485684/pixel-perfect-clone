import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // The thumb is positioned with logical insets (see below) so it travels
      // the right way in both LTR and RTL. The app switches the document
      // direction for Arabic, where a physical translate-x would push the
      // thumb straight out of the track.
      "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute start-0 top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-background shadow-lg ring-0 transition-[inset-inline-start] duration-200 data-[state=checked]:start-4 data-[state=unchecked]:start-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
