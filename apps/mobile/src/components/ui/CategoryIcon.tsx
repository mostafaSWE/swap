import type { LucideIcon } from "lucide-react-native";
import {
  Armchair, Baby, Bike, BookOpen, Briefcase, Camera, Car, Dog, Dumbbell,
  Gamepad2, Gem, Hammer, Heart, Laptop, Monitor, MonitorSmartphone, Music,
  Package2, PackageOpen, Repeat2, Shirt, ShoppingBag, Smartphone, Sofa,
  Sparkles, Trophy, WashingMachine, Watch, Wrench,
} from "lucide-react-native";
import { colors } from "../../theme";
import { Icon } from "./Icon";

/** Maps a category `icon` key (see @swap/config categories) to a lucide icon —
 *  the RN port of web `CategoryIcon`, kept in sync with it. */
const ICON_MAP: Record<string, LucideIcon> = {
  electronics: MonitorSmartphone,
  mobiles: Smartphone,
  computers: Laptop,
  gaming: Gamepad2,
  appliances: WashingMachine,
  furniture: Armchair,
  "home-garden": Sofa,
  cars: Car,
  motorcycles: Bike,
  "auto-parts": Wrench,
  fashion: Shirt,
  watches: Watch,
  baby: Baby,
  toys: Trophy,
  sports: Dumbbell,
  books: BookOpen,
  tools: Hammer,
  health: Heart,
  pets: Dog,
  music: Music,
  cameras: Camera,
  materials: Package2,
  office: Briefcase,
  collectibles: Gem,
  "open-exchange": Repeat2,
  other: ShoppingBag,
  // legacy / misc fallbacks
  jewelry: Sparkles,
  monitor: Monitor,
  open: PackageOpen,
};

export function CategoryIcon({
  icon,
  size = 20,
  color = colors.text,
}: {
  icon: string;
  size?: number;
  color?: string;
}) {
  return <Icon icon={ICON_MAP[icon] ?? ShoppingBag} size={size} color={color} />;
}
