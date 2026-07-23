import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Star } from "lucide-react-native";
import { colors, spacing } from "../src/theme";
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  Divider,
  Icon,
  Input,
  ListRow,
  RatingStars,
  SegmentedControl,
  Select,
  Skeleton,
  StatCell,
  StrengthMeter,
  Textarea,
} from "../src/components/ui";
import { SwapPair } from "../src/components/SwapPair";
import { ItemArtwork } from "../src/components/ItemArtwork";
import { FollowButton } from "../src/components/FollowButton";
import { MessageButton } from "../src/components/MessageButton";
import { NotificationBell } from "../src/components/NotificationBell";
import { ChatBubble } from "../src/components/ChatBubble";
import { ConversationCard } from "../src/components/ConversationCard";
import { SellerCard } from "../src/components/SellerCard";
import { FeaturedCard } from "../src/components/FeaturedCard";
import { WantedCard } from "../src/components/WantedCard";
import { CategoryCarousel } from "../src/components/CategoryCard";
import { ProfileHeader } from "../src/components/ProfileHeader";
import { ReportDialog } from "../src/components/ReportDialog";
import { AvatarUpload } from "../src/components/AvatarUpload";

/** Dev-only preview of the RN component kit (like /m0-check). Not a tab —
 *  reached via the `justswap://ui-kit` route. Used to verify the kit renders
 *  correctly in both LTR and RTL. */
export default function UiKit() {
  const [rating, setRating] = useState(3);
  const [checked, setChecked] = useState(false);
  const [country, setCountry] = useState<string>();
  const [text, setText] = useState("");
  const [seg, setSeg] = useState("all");
  const [following, setFollowing] = useState(false);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Section title="Buttons">
        <Button label="Primary" onPress={() => undefined} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Danger" variant="danger" onPress={() => undefined} />
        <Button label="Loading" loading />
      </Section>

      <Section title="Badges">
        <View style={styles.rowWrap}>
          <Badge label="Active" tone="positive" />
          <Badge label="Pending" tone="warning" />
          <Badge label="Disputed" tone="danger" />
          <Badge label="Countered" tone="info" />
          <Badge label="Confirming" tone="special" />
          <Badge label="Hidden" tone="neutral" />
        </View>
      </Section>

      <Section title="SwapPair (signature)">
        <View style={styles.rowWrap}>
          <SwapPair categoryIcon="electronics" size="sm" />
          <SwapPair categoryIcon="cars" size="md" />
        </View>
        <SwapPair categoryIcon="mobiles" size="lg" />
      </Section>

      <Section title="ItemArtwork">
        <View style={styles.artRow}>
          <ItemArtwork title="iPhone 14 Pro" categoryIcon="mobiles" style={styles.art} />
          <ItemArtwork title="Office Chair" categoryIcon="furniture" style={styles.art} />
          <ItemArtwork title="Mountain Bike" categoryIcon="motorcycles" style={styles.art} />
        </View>
      </Section>

      <Section title="Avatar · Stats · Rating">
        <View style={styles.rowCenter}>
          <Avatar name="Ahmed" size="lg" />
          <View style={styles.stats}>
            <StatCell value={12} label="Swaps" />
            <StatCell value="4.8" label="Rating" />
            <StatCell value={30} label="Listings" />
          </View>
        </View>
        <RatingStars value={rating} onChange={setRating} size="lg" label="Rate" />
      </Section>

      <Section title="Chips · Segmented · Strength">
        <View style={styles.rowWrap}>
          <Chip label="All" active />
          <Chip label="Electronics" onPress={() => undefined} />
          <Chip label="Cars" onPress={() => undefined} />
        </View>
        <SegmentedControl
          segments={[
            { value: "all", label: "All" },
            { value: "gives", label: "Gives" },
            { value: "wants", label: "Wants" },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <StrengthMeter score={3} label="Strong" />
      </Section>

      <Section title="ListRow · Accordion">
        <ListRow
          leading={<Avatar name="Sara" size="sm" />}
          title="Sara Al-Amiri"
          subtitle="Riyadh · 4.9 ★"
          trailing={<Icon icon={ChevronRight} size={18} color={colors.textFaint} mirror />}
          onPress={() => undefined}
        />
        <Accordion title="Shipping & pickup" defaultOpen>
          <Text style={styles.body}>Meet in a public place, or arrange delivery within the city.</Text>
        </Accordion>
        <Accordion title="Return policy">
          <Text style={styles.body}>Swaps are final once both sides confirm.</Text>
        </Accordion>
      </Section>

      <Section title="Inputs · Select · Checkbox">
        <Input label="Title" hint="required" placeholder="Enter a title" />
        <Select
          label="Country"
          placeholder="Select a country"
          value={country}
          onChange={setCountry}
          options={[
            { value: "sa", label: "Saudi Arabia" },
            { value: "ae", label: "United Arab Emirates" },
            { value: "qa", label: "Qatar" },
            { value: "kw", label: "Kuwait" },
          ]}
        />
        <Textarea label="Description" placeholder="Describe your item" value={text} onChangeText={setText} />
        <Checkbox checked={checked} onChange={setChecked} label="I accept the terms" hint="Required to post" />
      </Section>

      <Section title="FeaturedCard · WantedCard">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hrail}>
          <FeaturedCard title="iPhone 14 Pro Max" categoryIcon="mobiles" ownerName="Khalid" cityName="Riyadh" onPress={() => undefined} />
          <FeaturedCard title="Herman Miller Chair" categoryIcon="furniture" ownerName="Sara" cityName="Jeddah" onPress={() => undefined} />
        </ScrollView>
        <WantedCard wanted="MacBook Pro M3 or an equivalent laptop" categoryIcon="computers" />
        <WantedCard wanted="__any__" categoryIcon="open-exchange" />
      </Section>

      <Section title="Categories (carousel)">
        <CategoryCarousel
          items={[
            { icon: "electronics", name: "Electronics" },
            { icon: "cars", name: "Cars" },
            { icon: "furniture", name: "Furniture" },
            { icon: "fashion", name: "Fashion" },
            { icon: "sports", name: "Sports" },
          ]}
          onSelect={() => undefined}
        />
      </Section>

      <Section title="ProfileHeader">
        <ProfileHeader
          name="Khalid Al-Otaibi"
          username="khalid"
          completedSwaps={23}
          rating={4.8}
          ratingsCount={17}
          memberSince="Jan 2024"
          listingsCount={12}
          followersCount={340}
          followingCount={88}
          bio="Trading gadgets and camera gear across Riyadh."
          action={<Button label="Edit profile" variant="secondary" fullWidth onPress={() => undefined} />}
        />
      </Section>

      <Section title="ReportDialog · AvatarUpload">
        <View style={styles.rowCenter}>
          <AvatarUpload name="Khalid" onPick={() => undefined} />
          <ReportDialog onSubmit={() => undefined} />
        </View>
      </Section>

      <Section title="Actions · Bell">
        <FollowButton following={following} onToggle={() => setFollowing((f) => !f)} />
        <MessageButton onPress={() => undefined} />
        <View style={styles.rowCenter}>
          <NotificationBell count={3} onPress={() => undefined} />
          <NotificationBell count={12} onPress={() => undefined} />
          <NotificationBell count={0} onPress={() => undefined} />
        </View>
      </Section>

      <Section title="SellerCard">
        <SellerCard
          name="Khalid Al-Otaibi"
          username="khalid"
          completedSwaps={23}
          rating={4.8}
          ratingsCount={17}
          memberSince="Jan 2024"
          bio="Trading gadgets and camera gear across Riyadh. Fast, fair, friendly."
          following={following}
          onToggleFollow={() => setFollowing((f) => !f)}
          onViewProfile={() => undefined}
        />
      </Section>

      <Section title="ChatBubble">
        <ChatBubble body="Hi! Is the iPhone still available for swap?" time="2m" isOwn={false} />
        <ChatBubble body="Yes! What do you have to trade?" time="1m" isOwn />
      </Section>

      <Section title="ConversationCard">
        <ConversationCard
          name="Sara Al-Amiri"
          lastMessage="Deal! Let's meet tomorrow at 5pm."
          time="5m"
          unreadCount={2}
          proposalStatus="agreed"
          proposalLabel="Agreed"
          onPress={() => undefined}
        />
        <ConversationCard
          name="Omar Hassan"
          lastMessage="Can you do 2 for 1?"
          time="1h"
          proposalStatus="pending"
          proposalLabel="Pending"
          onPress={() => undefined}
        />
      </Section>

      <Section title="Skeleton · Icon">
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={14} />
        <Skeleton height={72} radius={12} />
        <Icon icon={Star} color={colors.warning} size={28} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "flex-start" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stats: { flex: 1, flexDirection: "row" },
  artRow: { flexDirection: "row", gap: spacing.sm },
  art: { width: 104, height: 104, borderRadius: 12 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  hrail: { gap: spacing.sm, paddingVertical: spacing.xs },
});
