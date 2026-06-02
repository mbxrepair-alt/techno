import { Suspense } from "react";
import TicketContent from "./TicketContent";

export const dynamic = 'force-dynamic';

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <TicketContent />
    </Suspense>
  );
}