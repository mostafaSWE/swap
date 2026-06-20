/**
 * Supabase `Database` type used to type the client.
 *
 * For the MVP this is hand-written from @swap/types so the app, SQL, and types
 * stay in one place. Once the schema stabilises you can replace this file with
 * `supabase gen types typescript` output (see docs/setup-guide.md).
 */
import type {
  AdminAction,
  Block,
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
  Notification,
  Profile,
  Rating,
  Report,
  SavedListing,
  SwapConfirmation,
  SwapProposal,
  SwapProposalItem,
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
      swap_proposals: Table<SwapProposal>;
      swap_proposal_items: Table<SwapProposalItem>;
      swap_confirmations: Table<SwapConfirmation>;
      ratings: Table<Rating>;
      notifications: Table<Notification>;
      follows: Table<Follow>;
      blocks: Table<Block>;
      reports: Table<Report>;
      saved_listings: Table<SavedListing>;
      listing_views: Table<ListingView>;
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
      /**
       * Atomically record a deal-closing confirmation for one party and, once
       * both parties have confirmed, complete the swap and increment each
       * party's completed_swaps_count. Returns the resulting proposal status.
       */
      record_swap_confirmation: {
        Args: { p_proposal_id: string; p_user_id: string; p_photo_path: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
