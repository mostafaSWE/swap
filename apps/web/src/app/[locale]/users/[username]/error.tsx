"use client";

import { RouteError } from "@/components/RouteError";

export default function UserProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
