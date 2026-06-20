import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import FeedbackPageClient from "./FeedbackPageClient";

export default function FeedbackPage() {
  return (
    <Suspense fallback={<LoadingState className="p-8" />}>
      <FeedbackPageClient />
    </Suspense>
  );
}
