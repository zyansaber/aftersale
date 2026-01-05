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
import { parseTimeConsumed } from "@/utils/timeParser";
import { endOfMonth, format, parse as parseDate, startOfMonth, addMonths } from "date-fns";
import StatCard from "@/components/StatCard";
import { TicketData } from "@/types/ticket";
import { PageLoader } from "@/components/PageLoader";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

type MonthBucket = {
  createdCount: number;
  completedCount: number;
  totalMinutes: number;
};

type ChartRow = {
  month: string;
  created: number;
  completed: number;
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
  const { data, isLoading, error, settings } = useVisibleTickets({
    applyEmployeeVisibility: false,
    applyRepairVisibility: false,
  });

  const months = useMemo(() => buildMonthSkeleton(), []);

  const { comparisonData, averageTrend, totalCreated, totalCompleted, averageHoursAcrossRange } =
    useMemo(() => {
      if (!data) {
        return {
          comparisonData: [] as ChartRow[],
          averageTrend: [] as AverageRow[],
          totalCreated: 0,
          totalCompleted: 0,
          averageHoursAcrossRange: 0,
        };
      }

      const buckets = new Map<string, MonthBucket>(
        months.map((month) => [month.key, { createdCount: 0, completedCount: 0, totalMinutes: 0 }])
      );

      let totalCreated = 0;
      let totalCompleted = 0;
      let totalCompletionMinutes = 0;

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

        const consumed = parseTimeConsumed(ticketEntry.ticket.Z1Z8TimeConsumed);
        if (consumed.totalMinutes <= 0) return;

        const completionDate = new Date(created.getTime() + consumed.totalMinutes * 60 * 1000);
        if (Number.isNaN(completionDate.getTime())) return;

        const completionMonth = startOfMonth(completionDate);
        const completionKey = format(completionMonth, "yyyy-MM");

        if (completionMonth < START_MONTH || completionMonth > END_MONTH || !buckets.has(completionKey)) return;

        const bucket = buckets.get(completionKey)!;
        bucket.completedCount += 1;
        bucket.totalMinutes += consumed.totalMinutes;
        totalCompleted += 1;
        totalCompletionMinutes += consumed.totalMinutes;
      });

      const comparisonData: ChartRow[] = months.map((month) => {
        const bucket = buckets.get(month.key)!;
        return {
          month: month.label,
          created: bucket.createdCount,
          completed: bucket.completedCount,
        };
      });

      const averageTrend: AverageRow[] = months.map((month) => {
        const bucket = buckets.get(month.key)!;
        const averageMinutes =
          bucket.completedCount > 0 ? bucket.totalMinutes / bucket.completedCount : 0;
        return {
          month: month.label,
          averageHours: Number((averageMinutes / 60).toFixed(1)),
        };
      });

      const averageHoursAcrossRange =
        totalCompleted > 0 ? Number((totalCompletionMinutes / totalCompleted / 60).toFixed(1)) : 0;

      return {
        comparisonData,
        averageTrend,
        totalCreated,
        totalCompleted,
        averageHoursAcrossRange,
      };
    }, [data, months]);

  if (isLoading || mappingQuery.isLoading) {
    return (
      <PageLoader
        title="Loading Claim vs Closed dashboard"
        description="Syncing ticket data, visibility filters, and status mapping before building trends to keep entry smooth."
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
          Compare monthly ticket creation with completion months inferred from CreatedOn + Z1Z8 Time Consumed,
          and track average hours consumed.
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
          title="Completed via Z1Z8"
          value={totalCompleted}
          description="Tickets with time consumed placed on completion month"
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg Hours Consumed"
          value={`${averageHoursAcrossRange}h`}
          description="Average Z1Z8 time consumed across completions"
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
            <CardTitle>Monthly Created vs Completed</CardTitle>
            <p className="text-sm text-muted-foreground">
              CreatedOn month compared to completion month (CreatedOn + Z1Z8 time consumed).
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
                <Bar dataKey="completed" name="Completed (Z1Z8)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Average Time Consumed per Completion</CardTitle>
            <p className="text-sm text-muted-foreground">
              Trend line of Z1Z8 time consumed (in hours) for completions each month.
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
