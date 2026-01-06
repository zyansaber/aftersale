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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parse } from "date-fns";
import { TicketData } from "@/types/ticket";
import { PageLoader } from "@/components/PageLoader";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

type ClaimType = "In Field Warranty Claims" | "Pre Delivery Warranty claims";

type RowBucket =
  | { id: string; label: string; type: "year"; year: number }
  | { id: string; label: string; type: "created-age"; maxMonths: number };
type NormalizedTicket = {
  base: TicketEntry;
  created: Date;
  firstLevelStatus: string;
  isOpen: boolean;
  claimType: string;
};
type StatusPalette = {
  badgeClass: string;
  barColor: string;
  dotClass: string;
  textClass: string;
};

const STATUS_PRIORITY = ["Closed", "Open", "Parts", "Reparing", "Suspended"] as const;

const STATUS_STYLES: Record<string, StatusPalette> = {
  Closed: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    barColor: "#8fcfb5",
    dotClass: "bg-emerald-200",
    textClass: "text-emerald-700",
  },
  Open: {
    badgeClass: "bg-sky-50 text-sky-700 border-sky-100",
    barColor: "#a2cbe7",
    dotClass: "bg-sky-200",
    textClass: "text-sky-700",
  },
  Parts: {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
    barColor: "#f5d79a",
    dotClass: "bg-amber-200",
    textClass: "text-amber-700",
  },
  Reparing: {
    badgeClass: "bg-purple-50 text-purple-700 border-purple-100",
    barColor: "#d6c5ee",
    dotClass: "bg-purple-200",
    textClass: "text-purple-700",
  },
  Suspended: {
    badgeClass: "bg-rose-50 text-rose-700 border-rose-100",
    barColor: "#f6c3c9",
    dotClass: "bg-rose-200",
    textClass: "text-rose-700",
  },
  default: {
    badgeClass: "bg-slate-50 text-slate-700 border-slate-100",
    barColor: "#c3cfdf",
    dotClass: "bg-slate-200",
    textClass: "text-slate-700",
  },
};

function getStatusPalette(status: string): StatusPalette {
  return STATUS_STYLES[status] ?? STATUS_STYLES.default;
}

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

  const discoveredStatuses = Array.from(new Set(claimTickets.map((t) => t.firstLevelStatus)));
  const statusList = [
    ...STATUS_PRIORITY.filter((priority) => discoveredStatuses.includes(priority)),
    ...discoveredStatuses
      .filter((status) => !STATUS_PRIORITY.includes(status as (typeof STATUS_PRIORITY)[number]))
      .sort((a, b) => a.localeCompare(b)),
  ];

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
  const statusBarTemplate = STATUS_PRIORITY.map((status) => ({
    status,
    palette: getStatusPalette(status),
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="rounded-lg border text-[15px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-base font-semibold">Created/Openness</TableHead>
              {statusList.map((status) => (
                <TableHead
                  key={status}
                  className={`text-base font-semibold ${getStatusPalette(status).textClass}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getStatusPalette(status).dotClass}`} />
                    <span>{status || "Unmapped"}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-base font-semibold">Total</TableHead>
              <TableHead className="text-base font-semibold w-28">Opened customer claims</TableHead>
              <TableHead className="text-base font-semibold w-[340px]">Status mix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows.map(({ row, total, byStatus, uniqueOpenNames }) => (
              <TableRow key={row.id} className="hover:bg-muted/40 text-base">
                <TableCell className="whitespace-nowrap font-semibold text-base">{row.label}</TableCell>
                {byStatus.map((item) => (
                  <TableCell key={`${row.id}-${item.status}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{item.count}</span>
                      <Badge
                        variant="secondary"
                        className={`text-sm px-2.5 py-1 font-semibold border ${getStatusPalette(item.status).badgeClass}`}
                      >
                        {item.percent}%
                      </Badge>
                    </div>
                  </TableCell>
                ))}
                <TableCell className="font-semibold text-primary text-lg">
                  <Badge variant="outline" className="text-lg font-semibold px-3 py-1.5">
                    {total}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-lg w-28">
                  {row.type === "created-age" ? uniqueOpenNames ?? 0 : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="align-top w-[340px]">
                  <StatusDistributionBar
                    segments={statusBarTemplate.map(({ status, palette }) => ({
                      status,
                      color: palette.barColor,
                      count: byStatus.find((item) => item.status === status)?.count ?? 0,
                    }))}
                  />
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

      <Tabs defaultValue="in-field" className="space-y-4">
        <TabsList className="w-fit border bg-muted/50">
          <TabsTrigger value="in-field" className="text-base font-semibold px-4 py-2">
            In Field Warranty Claims
          </TabsTrigger>
          <TabsTrigger value="pre-delivery" className="text-base font-semibold px-4 py-2">
            Pre Delivery Warranty claims
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-field">
          <MatrixTable
            title="In Field Warranty Claims"
            subtitle="Includes yearly and open-aged buckets with status distribution"
            tickets={normalizedTickets}
          />
        </TabsContent>
        <TabsContent value="pre-delivery">
          <MatrixTable
            title="Pre Delivery Warranty claims"
            subtitle="Includes yearly and open-aged buckets with status distribution"
            tickets={normalizedTickets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusDistributionBar({
  segments,
}: {
  segments: { status: string; color: string; count: number }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-14 min-w-[320px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        No status data
      </div>
    );
  }

  return (
    <div className="min-w-[320px]">
      <div className="flex h-16 overflow-hidden rounded-xl border bg-white shadow-inner">
        {segments.map((segment) => (
          <div
            key={segment.status}
            style={{ width: `${(segment.count / total) * 100}%`, backgroundColor: segment.color }}
            className="h-full transition-all"
          />
        ))}
      </div>
    </div>
  );
}
