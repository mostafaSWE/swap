import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand lockup. The wordmark is rendered as live text (not a baked PNG) so it
 * stays crisp and legible across themes. The default tone follows the global
 * theme; `tone="dark"` forces the high-contrast mark for navy panels, while
 * `tone="light"` forces the light-theme lockup for bright surfaces.
 */
export function Logo({
  withText = true,
  className,
  priority,
  tone = "default",
  compactOnSmall = false,
}: {
  withText?: boolean;
  className?: string;
  priority?: boolean;
  tone?: "default" | "dark" | "onDark" | "light";
  compactOnSmall?: boolean;
}) {
  const forceDark = tone === "dark";
  const forceLight = tone === "light";
  const forceTextOnDark = tone === "dark";
  const swapTextClassName = forceLight
    ? "text-[#020d51]"
    : forceTextOnDark
      ? "text-onnavy"
      : "text-[#020d51] dark:text-onnavy";
  const markClassName = cn(
    "h-9 w-9 shrink-0 bg-transparent object-contain sm:h-10 sm:w-10",
    forceDark && "drop-shadow-[0_0_14px_rgba(24,182,106,0.22)]",
  );

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {forceDark ? (
        <Image
          src="/brand/justswap-mark-dark.png"
          alt={withText ? "" : "JustSwap"}
          width={1024}
          height={1024}
          className={markClassName}
          priority={priority}
        />
      ) : forceLight ? (
        <Image
          src="/brand/justswap-mark.png"
          alt={withText ? "" : "JustSwap"}
          width={1024}
          height={1024}
          className={markClassName}
          priority={priority}
        />
      ) : (
        <>
          <Image
            src="/brand/justswap-mark.png"
            alt={withText ? "" : "JustSwap"}
            width={1024}
            height={1024}
            className={cn(markClassName, "dark:hidden")}
            priority={priority}
          />
          <Image
            src="/brand/justswap-mark-dark.png"
            alt={withText ? "" : "JustSwap"}
            width={1024}
            height={1024}
            className={cn(
              markClassName,
              "hidden dark:block dark:drop-shadow-[0_0_14px_rgba(24,182,106,0.22)]",
            )}
            priority={priority}
          />
        </>
      )}
      {withText ? (
        <span
          className={cn(
            "text-xl font-bold leading-none tracking-tight",
            "sm:text-2xl",
            compactOnSmall && "max-[430px]:hidden",
          )}
        >
          <span className="text-accent">Just</span>
          <span className={swapTextClassName}>Swap</span>
        </span>
      ) : null}
    </span>
  );
}
