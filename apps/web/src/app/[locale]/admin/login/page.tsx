import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <AdminLoginForm />;
}
