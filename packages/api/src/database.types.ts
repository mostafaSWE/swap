/**
 * Supabase `Database` type used to type the client.
 *
 * For the MVP this is hand-written from @swap/types so the app, SQL, and types
 * stay in one place. Once the schema stabilises you can replace this file with
 * `supabase gen types typescript` output (see docs/setup-guide.md).
 */
import type {
  AdminAction,
  Category,
  City,
  Conversation,
  ConversationParticipant,
  Country,
  Follow,
  Listing,
  ListingImage,
  ListingView,
  Message,
  Profile,
  Report,
  SavedListing,
  VerificationRequest,
} from "@swap/types";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      countries: Table<Country>;
      cities: Table<City>;
      categories: Table<Category>;
      listings: Table<Listing>;
      listing_images: Table<ListingImage>;
      conversations: Table<Conversation>;
      conversation_participants: Table<ConversationParticipant>;
      messages: Table<Message>;
      follows: Table<Follow>;
      reports: Table<Report>;
      saved_listings: Table<SavedListing>;
      listing_views: Table<ListingView>;
      verification_requests: Table<VerificationRequest>;
      admin_actions: Table<AdminAction>;
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_conversation: {
        Args: { other_user_id: string; p_listing_id?: string | null };
        Returns: Conversation;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
