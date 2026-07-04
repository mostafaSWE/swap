import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand lockup. The supplied logo set does not include a wide horizontal lockup,
 * so navigation uses the new mark asset with live text to stay legible in tight
 * headers. The default tone follows the global theme; `tone="dark"`/`"onDark"`
 * force the high-contrast mark for navy panels, while `tone="light"` forces the
 * light-surface lockup.
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
  const forceDark = tone === "dark" || tone === "onDark";
  const forceLight = tone === "light";
  const swapTextClassName = forceLight
    ? "text-[#020d51]"
    : forceDark
      ? "text-onnavy"
      : "text-[#020d51] dark:text-onnavy";
  const markClassName = cn(
    "h-10 w-10 shrink-0 bg-transparent object-contain sm:h-11 sm:w-11",
    forceDark && "drop-shadow-[0_0_14px_rgba(24,182,106,0.22)]",
  );

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {forceDark ? (
        <Image
          src="/brand/justswap-logo-mark-dark.png"
          alt={withText ? "" : "JustSwap"}
          width={1254}
          height={1254}
          className={markClassName}
          priority={priority}
        />
      ) : forceLight ? (
        <Image
          src="/brand/justswap-logo-mark.png"
          alt={withText ? "" : "JustSwap"}
          width={1254}
          height={1254}
          className={markClassName}
          priority={priority}
        />
      ) : (
        <>
          <Image
            src="/brand/justswap-logo-mark.png"
            alt={withText ? "" : "JustSwap"}
            width={1254}
            height={1254}
            className={cn(markClassName, "dark:hidden")}
            priority={priority}
          />
          <Image
            src="/brand/justswap-logo-mark-dark.png"
            alt={withText ? "" : "JustSwap"}
            width={1254}
            height={1254}
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
            "text-2xl font-bold leading-none tracking-tight",
            "sm:text-[1.65rem]",
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
