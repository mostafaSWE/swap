import {
  Armchair,
  Car,
  Gamepad2,
  type LucideIcon,
  MonitorSmartphone,
  Shirt,
  ShoppingBag,
  Volleyball,
  WashingMachine,
  Watch,
} from "lucide-react";

/** Maps a category `icon` key (see @swap/config categories) to a Lucide icon. */
const ICON_MAP: Record<string, LucideIcon> = {
  electronics: MonitorSmartphone,
  furniture: Armchair,
  cars: Car,
  appliances: WashingMachine,
  clothing: Shirt,
  watches: Watch,
  toys: Gamepad2,
  sports: Volleyball,
  other: ShoppingBag,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? ShoppingBag;
  return <Icon className={className} aria-hidden />;
}
