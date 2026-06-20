import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function generateMetadata(): Metadata {
  return { title: "Set a new password" };
}

export default function ResetPasswordPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <ResetPasswordForm />;
}
