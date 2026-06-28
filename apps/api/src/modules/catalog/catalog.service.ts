import { Injectable, NotFoundException } from "@nestjs/common";
import type { Category, City, Country } from "@swap/types";
import type {
  UpsertCategoryInput,
  UpsertCityInput,
  UpsertCountryInput,
} from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async categories(): Promise<Category[]> {
    const { data, error } = await this.supabase.admin
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  }

  async countries(): Promise<Country[]> {
    // Ordered by creation order (created_at, then id as a stable tiebreaker
    // since the seeded rows share one timestamp) rather than a manual
    // sort_order, so newly added countries appear at the bottom of the list.
    const { data, error } = await this.supabase.admin
      .from("countries")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async cities(countryId: string): Promise<City[]> {
    const { data, error } = await this.supabase.admin
      .from("cities")
      .select("*")
      .eq("country_id", countryId)
      .eq("is_active", true)
      .order("name_en");
    if (error) throw error;
    return data ?? [];
  }

  /* ── Admin management ── */
  async createCategory(input: UpsertCategoryInput): Promise<Category> {
    const { data, error } = await this.supabase.admin
      .from("categories")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, input: Partial<UpsertCategoryInput>): Promise<Category> {
    const { data, error } = await this.supabase.admin
      .from("categories")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Category not found");
    return data;
  }

  async createCountry(input: UpsertCountryInput): Promise<Country> {
    const { data, error } = await this.supabase.admin
      .from("countries")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async createCity(input: UpsertCityInput): Promise<City> {
    const { data, error } = await this.supabase.admin
      .from("cities")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async updateCity(id: string, input: Partial<UpsertCityInput>): Promise<City> {
    const { data, error } = await this.supabase.admin
      .from("cities")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("City not found");
    return data;
  }
}
