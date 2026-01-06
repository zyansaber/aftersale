import { Ticket } from "@/types/ticket";

export function normalizeTicketId(ticketId?: string | null): string {
  return (ticketId ?? "").replace(/-/g, "").trim();
}

export function getNormalizedTicketId(ticket?: Pick<Ticket, "TicketID"> | null): string {
  return normalizeTicketId(ticket?.TicketID);
}
