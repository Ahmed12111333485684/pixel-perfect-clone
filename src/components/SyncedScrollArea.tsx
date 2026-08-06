import * as React from "react";

import { cn } from "@/lib/utils";

interface SyncedScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps horizontally-scrollable content with a synced scrollbar strip on top,
 * so users can scroll left/right without reaching the bottom of the page.
 * The top strip is only shown when the content actually overflows, and it
 * stays in sync with the main scroll container in both directions.
 */
export function SyncedScrollArea({ children, className }: SyncedScrollAreaProps) {
  const topRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const spacerRef = React.useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const main = mainRef.current;
    const top = topRef.current;
    const spacer = spacerRef.current;
    if (!main || !top || !spacer) return;

    const update = () => {
      const width = main.scrollWidth;
      spacer.style.width = `${width}px`;
      setOverflowing(width > main.clientWidth + 1);
    };

    const syncToTop = () => {
      top.scrollLeft = main.scrollLeft;
    };
    const syncToMain = () => {
      main.scrollLeft = top.scrollLeft;
    };

    update();
    main.addEventListener("scroll", syncToTop);
    top.addEventListener("scroll", syncToMain);

    const observer = new ResizeObserver(update);
    observer.observe(main);

    return () => {
      main.removeEventListener("scroll", syncToTop);
      top.removeEventListener("scroll", syncToMain);
      observer.disconnect();
    };
  });

  return (
    <div className="relative flex w-full flex-col">
      <div
        ref={topRef}
        aria-hidden="true"
        className={cn("relative w-full shrink-0 overflow-x-auto", overflowing ? "" : "hidden")}
      >
        <div ref={spacerRef} className="h-4" />
      </div>
      <div ref={mainRef} className={cn("relative w-full overflow-auto", className)}>
        {children}
      </div>
    </div>
  );
}
