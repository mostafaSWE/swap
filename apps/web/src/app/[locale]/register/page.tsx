import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { RegisterForm } from "./RegisterForm";

export function generateMetadata(): Metadata {
  return { title: "Create Account" };
}

export default function RegisterPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <RegisterForm />;
}
