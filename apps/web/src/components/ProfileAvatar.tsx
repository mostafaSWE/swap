import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = { sm: 32, md: 48, lg: 80 } as const;

/** Round profile photo with an initials fallback. */
export function ProfileAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-elevated flex items-center justify-center shrink-0",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {src ? (
        <Image src={src} alt={name ?? ""} fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span className="font-semibold text-ink" style={{ fontSize: px / 2.5 }}>
          {initial}
        </span>
      )}
    </div>
  );
}
