import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { LoginForm } from "./LoginForm";

export function generateMetadata(): Metadata {
  return { title: "Login" };
}

export default function LoginPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { error?: string };
}) {
  setRequestLocale(locale);
  return <LoginForm linkError={searchParams.error === "link"} />;
}
