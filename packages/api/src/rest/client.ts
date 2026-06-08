/**
 * Typed REST client for the Swap backend API (NestJS, /api/v1).
 *
 * Used by BOTH the web app and the future mobile app so business logic lives in
 * one place (the backend), not in UI components. Auth is bearer-token based: the
 * caller supplies a `getToken()` that returns the current Supabase access token.
 *
 * Reads can still go directly to Supabase (RLS-protected) for speed/Realtime;
 * mutations and sensitive workflows should go through this client. See
 * docs/database-schema.md → "Backend API vs Supabase".
 */
import type {
  AdminAction,
  Category,
  City,
  Conversation,
  Country,
  Listing,
  ListingWithRelations,
  Message,
  Profile,
  PublicProfile,
  Report,
  VerificationRequest,
} from "@swap/types";
import type {
  AdminUpdateListingInput,
  AdminUpdateUserInput,
  CreateListingInput,
  CreateReportInput,
  CreateVerificationInput,
  ListingFiltersInput,
  SendMessageInput,
  StartConversationInput,
  UpdateListingInput,
  UpdateProfileInput,
  UpdateReportInput,
  UpdateVerificationInput,
  UpsertCategoryInput,
  UpsertCityInput,
  UpsertCountryInput,
} from "@swap/validation";

export interface AdminOverview {
  totalUsers: number;
  verifiedUsers: number;
  activeListings: number;
  hiddenListings: number;
  pendingReports: number;
  totalConversations: number;
  totalMessages: number;
  listingsByCountry: { country_id: string; count: number }[];
  usersByCountry: { country_id: string; count: number }[];
}

export interface SafetyDisclaimer {
  locale: string;
  title: string;
  points: string[];
}

export class SwapApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "SwapApiError";
  }
}

export interface SwapApiOptions {
  baseUrl: string;
  /** Returns the current bearer token (Supabase access token), or null. */
  getToken?: () => Promise<string | null> | string | null;
}

export class SwapApiClient {
  constructor(private readonly opts: SwapApiOptions) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(this.opts.baseUrl.replace(/\/$/, "") + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      }
    }

    const token = this.opts.getToken ? await this.opts.getToken() : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        parsed = await res.text().catch(() => "");
      }
      const message =
        (parsed as { message?: string })?.message ?? `Request failed (${res.status})`;
      throw new SwapApiError(res.status, Array.isArray(message) ? message.join(", ") : message, parsed);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /* ── Auth / profile ── */
  me = () => this.request<Profile>("GET", "/me");
  updateMe = (input: UpdateProfileInput) => this.request<Profile>("PATCH", "/me", input);
  getUser = (username: string) => this.request<PublicProfile>("GET", `/users/${username}`);
  follow = (userId: string) => this.request<void>("POST", `/users/${userId}/follow`);
  unfollow = (userId: string) => this.request<void>("DELETE", `/users/${userId}/follow`);

  /* ── Listings ── */
  listings = (filters?: ListingFiltersInput) =>
    this.request<ListingWithRelations[]>("GET", "/listings", undefined, filters as Record<string, unknown>);
  listing = (id: string) => this.request<ListingWithRelations>("GET", `/listings/${id}`);
  createListing = (input: CreateListingInput) => this.request<Listing>("POST", "/listings", input);
  updateListing = (id: string, input: UpdateListingInput) =>
    this.request<Listing>("PATCH", `/listings/${id}`, input);
  deleteListing = (id: string) => this.request<void>("DELETE", `/listings/${id}`);
  recordView = (id: string) => this.request<void>("POST", `/listings/${id}/view`);
  reportListing = (id: string, input: Omit<CreateReportInput, "target_type" | "target_id">) =>
    this.request<void>("POST", `/listings/${id}/report`, input);
  startConversation = (id: string, input: Pick<StartConversationInput, "other_user_id">) =>
    this.request<Conversation>("POST", `/listings/${id}/start-conversation`, input);

  /** Request a signed upload URL for a listing image (Storage). */
  signListingImageUpload = (listingId: string, fileName: string) =>
    this.request<{ path: string; token: string; signedUrl: string }>(
      "POST",
      `/listings/${listingId}/images/sign`,
      { fileName },
    );

  /** Register an uploaded image against a listing (enforces the free limit). */
  addListingImage = (listingId: string, imageUrl: string) =>
    this.request<void>("POST", `/listings/${listingId}/images`, { image_url: imageUrl });

  /* ── Categories / countries / cities ── */
  categories = () => this.request<Category[]>("GET", "/categories");
  countries = () => this.request<Country[]>("GET", "/countries");
  cities = (countryId: string) => this.request<City[]>("GET", `/countries/${countryId}/cities`);

  /* ── Conversations / messages ── */
  conversations = () => this.request<Conversation[]>("GET", "/conversations");
  messages = (conversationId: string) =>
    this.request<Message[]>("GET", `/conversations/${conversationId}/messages`);
  sendMessage = (conversationId: string, input: SendMessageInput) =>
    this.request<Message>("POST", `/conversations/${conversationId}/messages`, input);

  /* ── Saved listings ── */
  saveListing = (listingId: string) => this.request<void>("POST", `/listings/${listingId}/save`);
  unsaveListing = (listingId: string) => this.request<void>("DELETE", `/listings/${listingId}/save`);
  savedListings = () => this.request<ListingWithRelations[]>("GET", "/me/saved");

  /* ── Reports ── */
  createReport = (input: CreateReportInput) => this.request<void>("POST", "/reports", input);

  /* ── Verification ── */
  createVerification = (input: CreateVerificationInput) =>
    this.request<VerificationRequest>("POST", "/verification-requests", input);

  /* ── Safety ── */
  safety = (locale: string) =>
    this.request<SafetyDisclaimer>("GET", "/safety", undefined, { locale });

  /* ── Admin ── */
  admin = {
    overview: () => this.request<AdminOverview>("GET", "/admin/overview"),
    users: () => this.request<Profile[]>("GET", "/admin/users"),
    updateUser: (id: string, input: AdminUpdateUserInput) =>
      this.request<Profile>("PATCH", `/admin/users/${id}`, input),
    listings: () => this.request<Listing[]>("GET", "/admin/listings"),
    updateListing: (id: string, input: AdminUpdateListingInput) =>
      this.request<Listing>("PATCH", `/admin/listings/${id}`, input),
    reports: () => this.request<Report[]>("GET", "/admin/reports"),
    updateReport: (id: string, input: UpdateReportInput) =>
      this.request<Report>("PATCH", `/admin/reports/${id}`, input),
    verifications: () => this.request<VerificationRequest[]>("GET", "/admin/verification-requests"),
    updateVerification: (id: string, input: UpdateVerificationInput) =>
      this.request<VerificationRequest>("PATCH", `/admin/verification-requests/${id}`, input),
    actions: () => this.request<AdminAction[]>("GET", "/admin/actions"),
    createCategory: (input: UpsertCategoryInput) =>
      this.request<Category>("POST", "/admin/categories", input),
    updateCategory: (id: string, input: Partial<UpsertCategoryInput>) =>
      this.request<Category>("PATCH", `/admin/categories/${id}`, input),
    createCountry: (input: UpsertCountryInput) =>
      this.request<Country>("POST", "/admin/countries", input),
    createCity: (input: UpsertCityInput) => this.request<City>("POST", "/admin/cities", input),
    updateCity: (id: string, input: Partial<UpsertCityInput>) =>
      this.request<City>("PATCH", `/admin/cities/${id}`, input),
  };
}

export function createApiClient(opts: SwapApiOptions): SwapApiClient {
  return new SwapApiClient(opts);
}
