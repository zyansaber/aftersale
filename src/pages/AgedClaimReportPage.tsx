import { useMemo } from "react";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { useTicketStatusMapping } from "@/hooks/useTicketStatusMapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { parse } from "date-fns";
import { TicketData } from "@/types/ticket";
import { PageLoader } from "@/components/PageLoader";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

type ClaimType = "In Field Warranty Claims" | "Pre Delivery Warranty claims";

type RowBucket =
  | { id: string; label: string; type: "year"; year: number }
  | { id: string; label: string; type: "open"; maxMonths: number };

function parseTicketDate(raw: string) {
  if (!raw) return new Date("");
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  return parse(raw, "dd/MM/yyyy", new Date());
}

function monthsSince(date: Date) {
  if (Number.isNaN(date.getTime())) return Number.NaN;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function isOpenStatus(firstLevelStatus: string) {
  return !firstLevelStatus.toLowerCase().includes("close");
}

function getFirstLevelStatus(ticket: TicketEntry, mapping?: ReturnType<typeof useTicketStatusMapping>["data"]) {
  const code = ticket.ticket.TicketStatus;
  const text = ticket.ticket.TicketStatusText;
  const mapped =
    mapping?.[code]?.firstLevelStatus ??
    mapping?.[text]?.firstLevelStatus ??
    mapping?.[code]?.ticketStatusText;
  return (mapped || text || "Unmapped").trim() || "Unmapped";
}

function buildMatrix(normalized: NormalizedTicket[], claimType: ClaimType, rows: RowBucket[]) {
  const claimTickets = normalized.filter(
    (t) => (t.claimType || "").toLowerCase() === claimType.toLowerCase()
  );

  const statusList = Array.from(new Set(claimTickets.map((t) => t.firstLevelStatus))).sort((a, b) =>
    a.localeCompare(b)
  );

  const dataRows = rows.map((row) => {
    let scoped = claimTickets;

    if (row.type === "year") {
      scoped = claimTickets.filter((ticket) => ticket.created.getFullYear() === row.year);
    } else {
      scoped = claimTickets.filter((ticket) => {
        const age = monthsSince(ticket.created);
        if (Number.isNaN(age)) return false;
        return age <= row.maxMonths;
      });
    }

    const total = scoped.length;
    const byStatus = statusList.map((status) => {
      const count = scoped.filter((ticket) => ticket.firstLevelStatus === status).length;
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { status, count, percent };
    });

    const uniqueOpenNames = new Set(
      scoped
        .filter((ticket) => ticket.isOpen)
        .map((ticket) => ticket.base.ticket.TicketName || "")
    ).size;

    return { row, total, byStatus, uniqueOpenNames };
  });

  return { statusList, dataRows };
}

const ROWS: RowBucket[] = [
  { id: "y2023", label: "Created in 2023", type: "year", year: 2023 },
  { id: "y2024", label: "Created in 2024", type: "year", year: 2024 },
  { id: "y2025", label: "Created in 2025", type: "year", year: 2025 },
  { id: "open-1", label: "Created ≤ 1 month", type: "created-age", maxMonths: 1 },
  { id: "open-3", label: "Created ≤ 3 months", type: "created-age", maxMonths: 3 },
  { id: "open-6", label: "Created ≤ 6 months", type: "created-age", maxMonths: 6 },
  { id: "open-12", label: "Created ≤ 12 months", type: "created-age", maxMonths: 12 },
];

function MatrixTable({
  title,
  subtitle,
  tickets,
}: {
  title: string;
  subtitle: string;
  tickets: NormalizedTicket[];
}) {
  const { statusList, dataRows } = useMemo(
    () => buildMatrix(tickets, title as ClaimType, ROWS),
    [tickets, title]
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="rounded-lg border">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Created/Openness</TableHead>
              {statusList.map((status) => (
                <TableHead key={status}>{status || "Unmapped"}</TableHead>
              ))}
              <TableHead>Total</TableHead>
              <TableHead>opened customer claims</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows.map(({ row, total, byStatus, uniqueOpenNames }) => (
              <TableRow key={row.id} className="hover:bg-muted/40">
                <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
                {byStatus.map((item) => (
                  <TableCell key={`${row.id}-${item.status}`}>
                    <div className="flex items-center gap-2">
                      <span>{item.count}</span>
                      <Badge variant="secondary" className="text-xs">{item.percent}%</Badge>
                    </div>
                  </TableCell>
                ))}
                <TableCell className="font-semibold text-primary">
                  <Badge variant="outline" className="text-base font-semibold px-3 py-1">
                    {total}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {row.type === "created-age" ? uniqueOpenNames ?? 0 : <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AgedClaimReportPage() {
  const { data, isLoading, error, settings } = useVisibleTickets({
    applyEmployeeVisibility: false,
    applyRepairVisibility: false,
  });
  const mappingQuery = useTicketStatusMapping();
  const normalizedTickets = useMemo<NormalizedTicket[]>(() => {
    if (!data) return [];
    const mapping = mappingQuery.data;

    return Object.values(data.c4cTickets_test.tickets).map((ticket) => {
      const created = parseTicketDate(ticket.ticket.CreatedOn);
      const firstLevelStatus = getFirstLevelStatus(ticket, mapping);
      const claimType = ticket.ticket.TicketTypeText || "";
      return {
        base: ticket,
        created,
        firstLevelStatus,
        isOpen: isOpenStatus(firstLevelStatus),
        claimType,
      } satisfies NormalizedTicket;
    });
  }, [data, mappingQuery.data]);

  if (isLoading || mappingQuery.isLoading) {
    return (
      <PageLoader
        title="Loading aged claim report"
        description="Syncing ticket data, status mapping, and visibility preferences for a smooth page entry."
        tasks={[
          { label: "Ticket dataset", progress: data ? 100 : 0 },
          { label: "Visibility filters", progress: settings ? 100 : 0 },
          { label: "Status mapping", progress: mappingQuery.data ? 100 : 0 },
        ]}
      />
    );
  }

  if (error || mappingQuery.error) {
    const message =
      error instanceof Error
        ? error.message
        : mappingQuery.error instanceof Error
        ? mappingQuery.error.message
        : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load aged claim report: {message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Aged Claim Report</h2>
        <p className="text-muted-foreground mt-2">
          Matrix view by CreatedOn year and open-age buckets for In Field and Pre Delivery Warranty claims.
        </p>
      </div>

      <div className="grid gap-6">
        <MatrixTable
          title="In Field Warranty Claims"
          subtitle="Includes yearly and open-aged buckets with status distribution"
          tickets={normalizedTickets}
        />
        <MatrixTable
          title="Pre Delivery Warranty claims"
          subtitle="Includes yearly and open-aged buckets with status distribution"
          tickets={normalizedTickets}
        />
      </div>
    </div>
  );
}
