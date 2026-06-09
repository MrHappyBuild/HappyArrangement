export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ReceiptHomePage } from "@/components/receipt-home-page";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function HomePage({ searchParams }) {
  if (isSupabaseConfigured()) {
    redirect("/workspace");
  }

  return <ReceiptHomePage searchParams={searchParams} />;
}
