import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { LoginForm } from "./LoginForm";

export default function LoginPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <LoginForm />;
}
