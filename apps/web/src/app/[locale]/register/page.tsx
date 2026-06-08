import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  return <RegisterForm />;
}
