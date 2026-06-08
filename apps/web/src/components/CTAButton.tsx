import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary";

const base = {
  primary: "btn-primary",
  secondary: "btn-secondary",
} satisfies Record<Variant, string>;

/**
 * Primary call-to-action. Renders a locale-aware <Link> when `href` is given,
 * otherwise a <button>.
 */
export function CTAButton({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: {
  href?: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (href) {
    return (
      <Link href={href} className={cn(base[variant], "w-full", className)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cn(base[variant], className)} {...props}>
      {children}
    </button>
  );
}
