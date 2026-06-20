import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  withText = true,
  className,
  priority,
}: {
  withText?: boolean;
  className?: string;
  priority?: boolean;
}) {
  if (!withText) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src="/brand/justswap-mark.png"
          alt="JustSwap"
          width={1024}
          height={1024}
          className="h-10 w-10 bg-transparent object-contain"
          priority={priority}
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/brand/justswap-horizontal.png"
        alt="JustSwap"
        width={1268}
        height={307}
        className="h-10 w-auto bg-transparent object-contain sm:h-11 lg:h-12"
        priority={priority}
      />
    </span>
  );
}
