export const dynamic = "force-dynamic";

import { ReceiptHomePage } from "@/components/receipt-home-page";

export default async function ReceiptsPage({ searchParams }) {
  return <ReceiptHomePage searchParams={searchParams} />;
}
