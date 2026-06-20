import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function generateMetadata(): Metadata {
  return { title: "Forgot password?" };
}

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <ForgotPasswordForm />;
}
