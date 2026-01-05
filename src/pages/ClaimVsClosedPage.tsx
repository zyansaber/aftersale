import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { useTicketStatusMapping } from "@/hooks/useTicketStatusMapping";
import { parseTimeConsumed } from "@/utils/timeParser";
import { endOfMonth, format, parse as parseDate, startOfMonth, addMonths } from "date-fns";
import StatCard from "@/components/StatCard";
import { TicketData } from "@/types/ticket";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

type MonthBucket = {
  createdCount: number;
  claimApprovedCount: number;
  totalMinutes: number;
};

type ChartRow = {
  month: string;
  created: number;
  claimApproved: number;
};

type AverageRow = {
  month: string;
  averageHours: number;
};

const START_MONTH = startOfMonth(new Date(2025, 0, 1));
const END_MONTH = endOfMonth(new Date());

function parseTicketDate(raw: string) {
  if (!raw) return new Date("");
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  return parseDate(raw, "dd/MM/yyyy", new Date());
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

function buildMonthSkeleton() {
  const months: { key: string; label: string }[] = [];
  let cursor = START_MONTH;

  while (cursor <= END_MONTH) {
    months.push({ key: format(cursor, "yyyy-MM"), label: format(cursor, "MMM yyyy") });
    cursor = addMonths(cursor, 1);
  }

  return months;
}

export default function ClaimVsClosedPage() {
  const { data, isLoading, error } = useVisibleTickets({
    applyEmployeeVisibility: false,
    applyRepairVisibility: false,
  });
  const mappingQuery = useTicketStatusMapping();

  const months = useMemo(() => buildMonthSkeleton(), []);

  const { comparisonData, averageTrend, totalCreated, totalApproved, averageHoursAcrossRange } =
    useMemo(() => {
      if (!data) {
        return {
          comparisonData: [] as ChartRow[],
          averageTrend: [] as AverageRow[],
          totalCreated: 0,
          totalApproved: 0,
          averageHoursAcrossRange: 0,
        };
      }

      const buckets = new Map<string, MonthBucket>(
        months.map((month) => [month.key, { createdCount: 0, claimApprovedCount: 0, totalMinutes: 0 }])
      );

      let totalCreated = 0;
      let totalApproved = 0;
      let totalClaimMinutes = 0;

      Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
        const created = parseTicketDate(ticketEntry.ticket.CreatedOn);
        if (Number.isNaN(created.getTime())) return;

        const createdMonth = startOfMonth(created);
        const createdKey = format(createdMonth, "yyyy-MM");
        if (createdMonth >= START_MONTH && createdMonth <= END_MONTH && buckets.has(createdKey)) {
          const bucket = buckets.get(createdKey)!;
          bucket.createdCount += 1;
          totalCreated += 1;
        }

        const firstLevelStatus = getFirstLevelStatus(ticketEntry, mappingQuery.data);
        const normalizedStatus = firstLevelStatus.toLowerCase();
        const statusCode = (ticketEntry.ticket.TicketStatus || "").toLowerCase();
        const isClaimApproved =
          normalizedStatus.includes("claim approved") || normalizedStatus === "z8" || statusCode === "z8";

        if (!isClaimApproved) return;

        const consumed = parseTimeConsumed(ticketEntry.ticket.Z1Z8TimeConsumed);
        const claimDate = new Date(created.getTime() + consumed.totalMinutes * 60 * 1000);
        const approvalMoment = Number.isNaN(claimDate.getTime()) ? created : claimDate;
        const approvalMonth = startOfMonth(approvalMoment);
        const approvalKey = format(approvalMonth, "yyyy-MM");

        if (approvalMonth < START_MONTH || approvalMonth > END_MONTH || !buckets.has(approvalKey)) return;

        const bucket = buckets.get(approvalKey)!;
        bucket.claimApprovedCount += 1;
        bucket.totalMinutes += consumed.totalMinutes;
        totalApproved += 1;
        totalClaimMinutes += consumed.totalMinutes;
      });

      const comparisonData: ChartRow[] = months.map((month) => {
        const bucket = buckets.get(month.key)!;
        return {
          month: month.label,
          created: bucket.createdCount,
          claimApproved: bucket.claimApprovedCount,
        };
      });

      const averageTrend: AverageRow[] = months.map((month) => {
        const bucket = buckets.get(month.key)!;
        const averageMinutes =
          bucket.claimApprovedCount > 0 ? bucket.totalMinutes / bucket.claimApprovedCount : 0;
        return {
          month: month.label,
          averageHours: Number((averageMinutes / 60).toFixed(1)),
        };
      });

      const averageHoursAcrossRange =
        totalApproved > 0 ? Number((totalClaimMinutes / totalApproved / 60).toFixed(1)) : 0;

      return {
        comparisonData,
        averageTrend,
        totalCreated,
        totalApproved,
        averageHoursAcrossRange,
      };
    }, [data, mappingQuery.data, months]);

  if (isLoading || mappingQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Claim vs Closed</h2>
          <p className="text-muted-foreground mt-2">
            Visualizing creation versus claim approval volumes and time consumed, starting from Jan 2025.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading claim insights…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-200 animate-pulse" />
            <div className="h-2 w-3/4 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-2 w-1/2 rounded-full bg-slate-200 animate-pulse" />
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
    return (
      <div className="p-6 text-destructive flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load claim vs closed view: {message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Claim vs Closed</h2>
        <p className="text-muted-foreground mt-2">
          Compare monthly ticket creation with derived claim approvals and track the average time consumed to
          reach approval.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Created (Jan 2025 → Now)"
          value={totalCreated}
          description="Tickets created within the focused window"
          icon={Clock}
        />
        <StatCard
          title="Claim Approved"
          value={totalApproved}
          description="Approvals inferred from Z8 status and time consumed"
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg Hours to Approve"
          value={`${averageHoursAcrossRange}h`}
          description="Average Z1Z8 time consumed across approvals"
          icon={TrendingUp}
        />
        <StatCard
          title="Date Window"
          value="Jan 2025 → Current Month"
          description="Limited range for faster, clearer insights"
          icon={AlertCircle}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Monthly Created vs Claim Approved</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dual bars highlight creation volumes against derived claim approvals.
            </p>
          </CardHeader>
          <CardContent className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="claimApproved" name="Claim Approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Average Time Consumed per Approval</CardTitle>
            <p className="text-sm text-muted-foreground">
              Trend line of Z1Z8 time consumed (in hours) for claim approvals each month.
            </p>
          </CardHeader>
          <CardContent className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}h`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value} hours`, "Average Time"]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="averageHours"
                  name="Average Hours"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
