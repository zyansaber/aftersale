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
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNowStrict, parse, parseISO } from "date-fns";
import { TicketData } from "@/types/ticket";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

type ClaimType = "In Field Warranty Claims" | "Pre Delivery Warranty claims";

type RowBucket =
  | { id: string; label: string; type: "year"; year: number }
  | { id: string; label: string; type: "open"; minMonths: number };

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

function getFirstLevelStatus(
  ticket: TicketEntry,
  mapping?: ReturnType<typeof useTicketStatusMapping>["data"]
) {
  const code = ticket.ticket.TicketStatus;
  const text = ticket.ticket.TicketStatusText;
  const mapped =
    mapping?.[code]?.firstLevelStatus ??
    mapping?.[text]?.firstLevelStatus ??
    mapping?.[code]?.ticketStatusText;
  return (mapped || text || "Unmapped").trim() || "Unmapped";
}

function buildMatrix(
  tickets: TicketEntry[],
  mapping: ReturnType<typeof useTicketStatusMapping>["data"],
  claimType: ClaimType,
  rows: RowBucket[]
) {
  const claimTickets = tickets.filter(
    (t) => (t.ticket.TicketTypeText || "").toLowerCase() === claimType.toLowerCase()
  );

  const statusSet = new Set<string>();
  claimTickets.forEach((ticket) => {
    statusSet.add(getFirstLevelStatus(ticket, mapping));
  });
  const statusList = Array.from(statusSet).sort((a, b) => a.localeCompare(b));

  const dataRows = rows.map((row) => {
    let scoped = claimTickets;

    if (row.type === "year") {
      scoped = claimTickets.filter((ticket) => {
        const created = parseTicketDate(ticket.ticket.CreatedOn);
        return created.getFullYear() === row.year;
      });
    } else {
      scoped = claimTickets.filter((ticket) => {
        const firstStatus = getFirstLevelStatus(ticket, mapping);
        if (!isOpenStatus(firstStatus)) return false;
        const created = parseTicketDate(ticket.ticket.CreatedOn);
        const age = monthsSince(created);
        if (Number.isNaN(age)) return false;
        return age >= row.minMonths;
      });
    }

    const total = scoped.length;
    const byStatus = statusList.map((status) => {
      const count = scoped.filter((ticket) => getFirstLevelStatus(ticket, mapping) === status).length;
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { status, count, percent };
    });

    const uniqueOpenNames =
      row.type === "open"
        ? new Set(scoped.map((ticket) => ticket.ticket.TicketName || "")).size
        : undefined;

    return { row, total, byStatus, uniqueOpenNames };
  });

  return { statusList, dataRows };
}

const ROWS: RowBucket[] = [
  { id: "y2023", label: "Created in 2023", type: "year", year: 2023 },
  { id: "y2024", label: "Created in 2024", type: "year", year: 2024 },
  { id: "y2025", label: "Created in 2025", type: "year", year: 2025 },
  { id: "open-1", label: "Open ≥ 1 month", type: "open", minMonths: 1 },
  { id: "open-3", label: "Open ≥ 3 months", type: "open", minMonths: 3 },
  { id: "open-7", label: "Open ≥ 7 months", type: "open", minMonths: 7 },
  { id: "open-12", label: "Open ≥ 12 months", type: "open", minMonths: 12 },
];

function MatrixTable({
  title,
  subtitle,
  tickets,
  mapping,
}: {
  title: string;
  subtitle: string;
  tickets: TicketEntry[];
  mapping: ReturnType<typeof useTicketStatusMapping>["data"];
}) {
  const { statusList, dataRows } = useMemo(
    () => buildMatrix(tickets, mapping, title as ClaimType, ROWS),
    [mapping, tickets, title]
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created/Openness</TableHead>
              {statusList.map((status) => (
                <TableHead key={status}>{status || "Unmapped"}</TableHead>
              ))}
              <TableHead>Total</TableHead>
              <TableHead>numberofcustomerswithopenclaims</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows.map(({ row, total, byStatus, uniqueOpenNames }) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
                {byStatus.map((item) => (
                  <TableCell key={`${row.id}-${item.status}`}>
                    <div className="flex items-center gap-2">
                      <span>{item.count}</span>
                      <Badge variant="outline">{item.percent}%</Badge>
                    </div>
                  </TableCell>
                ))}
                <TableCell className="font-semibold">
                  {total}
                  {row.type === "open" && total > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(), { addSuffix: true }).replace("in ", "")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.type === "open" ? uniqueOpenNames ?? 0 : <span className="text-muted-foreground">-</span>}
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
  const { data, isLoading, error } = useVisibleTickets({
    applyEmployeeVisibility: false,
    applyRepairVisibility: false,
  });
  const mappingQuery = useTicketStatusMapping();

  const tickets = useMemo(
    () => (data ? Object.values(data.c4cTickets_test.tickets) : []),
    [data]
  );

  if (isLoading || mappingQuery.isLoading) {
    return (
      <div className="p-8 space-y-4">
        <h2 className="text-3xl font-bold">Aged Claim Report</h2>
        <Card className="max-w-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Loading matrices…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={60} />
            <p className="text-sm text-muted-foreground">Crunching claim data and status mapping.</p>
          </CardContent>
        </Card>
      </div>
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
          tickets={tickets}
          mapping={mappingQuery.data}
        />
        <MatrixTable
          title="Pre Delivery Warranty claims"
          subtitle="Includes yearly and open-aged buckets with status distribution"
          tickets={tickets}
          mapping={mappingQuery.data}
        />
      </div>
    </div>
  );
}
