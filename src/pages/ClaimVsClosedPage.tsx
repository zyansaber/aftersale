import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Line,
  LabelList,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { parseTimeConsumed } from "@/utils/timeParser";
import {
  endOfMonth,
  format,
  parse as parseDate,
  startOfMonth,
  addMonths,
  differenceInCalendarDays,
} from "date-fns";
import StatCard from "@/components/StatCard";
import { TicketData } from "@/types/ticket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  averageHours: number;
};

type DailyAverageRow = {
  month: string;
  createdDailyAvg: number;
  completedDailyAvg: number;
};

type EmployeeOption = {
  employeeId: string;
  employeeName: string;
  createdCount: number;
  completedCount: number;
};

type EmployeeCompletionCard = {
  employeeId: string;
  employeeName: string;
  completedCount: number;
  averageHours: number;
};

const END_MONTH = endOfMonth(new Date());
const START_MONTH = startOfMonth(new Date(2025, 0, 1));
const RECENT_WINDOW_MONTHS = 3;
const RECENT_START_MONTH = startOfMonth(addMonths(END_MONTH, -(RECENT_WINDOW_MONTHS - 1)));
const CHART_COLORS = {
  createdStroke: "#6fa8dc",
  createdArea: "rgba(111, 168, 220, 0.22)",
  completedStroke: "#6fb189",
  averageStroke: "#9a8dc7",
  averageDot: "#b7acd8",
  createdBar: "#9cc5f1",
  completedBar: "#8fd5b5",
};

function parseTicketDate(raw: string) {
  if (!raw) return new Date("");
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  return parseDate(raw, "dd/MM/yyyy", new Date());
}

function getEmployeeDetails(ticketEntry: TicketEntry) {
  const employee = ticketEntry.roles?.["40"];
  return {
    employeeId: employee?.InvolvedPartyBusinessPartnerID ?? "unassigned",
    employeeName: employee?.InvolvedPartyName ?? "Unassigned",
  };
}

function buildMonthSkeleton() {
  const months: { key: string; label: string; startDate: Date; daysInMonth: number }[] = [];
  let cursor = START_MONTH;

  while (cursor <= END_MONTH) {
    const startDate = startOfMonth(cursor);
    const endDate = endOfMonth(cursor);
    const daysInMonth = differenceInCalendarDays(endDate, startDate) + 1;

    months.push({
      key: format(startDate, "yyyy-MM"),
      label: format(startDate, "MMM yyyy"),
      startDate,
      daysInMonth,
    });
    cursor = addMonths(cursor, 1);
  }

  return months;
}

export default function ClaimVsClosedPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const { data, isLoading, error } = useVisibleTickets({
    applyEmployeeVisibility: true,
    applyRepairVisibility: false,
  });

  const months = useMemo(() => buildMonthSkeleton(), []);

  const employeeOptions = useMemo<EmployeeOption[]>(() => {
    if (!data) return [];

    const employees = new Map<string, EmployeeOption>();

    Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
      const { employeeId, employeeName } = getEmployeeDetails(ticketEntry);
      const consumed = parseTimeConsumed(ticketEntry.ticket.Z1Z8TimeConsumed);

      if (!employees.has(employeeId)) {
        employees.set(employeeId, {
          employeeId,
          employeeName,
          createdCount: 0,
          completedCount: 0,
        });
      }

      const stats = employees.get(employeeId)!;
      stats.createdCount += 1;
      if (consumed.totalMinutes > 0) {
        stats.completedCount += 1;
      }
    });

    return Array.from(employees.values()).sort((a, b) => {
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      if (b.createdCount !== a.createdCount) return b.createdCount - a.createdCount;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [data]);

  const scopedData = useMemo<TicketData | undefined>(() => {
    if (!data) return undefined;
    if (selectedEmployeeId === "all") return data;

    const filteredTickets = Object.entries(data.c4cTickets_test.tickets).reduce(
      (acc, [ticketId, ticketEntry]) => {
        const { employeeId } = getEmployeeDetails(ticketEntry);
        if (employeeId === selectedEmployeeId) {
          acc[ticketId] = ticketEntry;
        }
        return acc;
      },
      {} as TicketData["c4cTickets_test"]["tickets"]
    );

    return {
      c4cTickets_test: {
        tickets: filteredTickets,
      },
    } satisfies TicketData;
  }, [data, selectedEmployeeId]);

  const { comparisonData, totalCreated, totalCompleted, averageHoursAcrossRange, recentCreated, recentCompleted } =
    useMemo(() => {
      if (!scopedData) {
        return {
          comparisonData: [] as ChartRow[],
          totalCreated: 0,
          totalCompleted: 0,
          averageHoursAcrossRange: 0,
          recentCreated: 0,
          recentCompleted: 0,
        };
      }

    const buckets = new Map<string, MonthBucket>(
      months.map((month) => [month.key, { createdCount: 0, completedCount: 0, totalMinutes: 0 }])
    );

    let totalCreated = 0;
    let totalCompleted = 0;
    let totalCompletionMinutes = 0;

    Object.values(scopedData.c4cTickets_test.tickets).forEach((ticketEntry) => {
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
      const averageMinutes = bucket.completedCount > 0 ? bucket.totalMinutes / bucket.completedCount : 0;
      return {
        month: month.label,
        created: bucket.createdCount,
        completed: bucket.completedCount,
        averageHours: Number((averageMinutes / 60).toFixed(1)),
      };
    });

    const { recentCreated, recentCompleted } = months.reduce(
      (acc, month) => {
        if (month.startDate >= RECENT_START_MONTH) {
          const bucket = buckets.get(month.key)!;
          acc.recentCreated += bucket.createdCount;
          acc.recentCompleted += bucket.completedCount;
        }
        return acc;
      },
      { recentCreated: 0, recentCompleted: 0 }
    );

    const averageHoursAcrossRange =
      totalCompleted > 0 ? Number((totalCompletionMinutes / totalCompleted / 60).toFixed(1)) : 0;

    return {
      comparisonData,
      totalCreated,
      totalCompleted,
      averageHoursAcrossRange,
      recentCreated,
      recentCompleted,
    };
  }, [months, scopedData]);

  const dailyAverageTrend = useMemo<DailyAverageRow[]>(() => {
    return months.map((month) => {
      const matchingComparison = comparisonData.find((row) => row.month === month.label);
      const createdDailyAvg = matchingComparison
        ? Number((matchingComparison.created / month.daysInMonth).toFixed(2))
        : 0;
      const completedDailyAvg = matchingComparison
        ? Number((matchingComparison.completed / month.daysInMonth).toFixed(2))
        : 0;

      return {
        month: month.label,
        createdDailyAvg,
        completedDailyAvg,
      };
    });
  }, [comparisonData, months]);

  const employeeCompletionCards = useMemo<EmployeeCompletionCard[]>(() => {
    if (!scopedData) return [];

    const employees = new Map<string, { completedCount: number; employeeName: string; totalMinutes: number }>();

    Object.values(scopedData.c4cTickets_test.tickets).forEach((ticketEntry) => {
      const consumed = parseTimeConsumed(ticketEntry.ticket.Z1Z8TimeConsumed);
      if (consumed.totalMinutes <= 0) return;

      const { employeeId, employeeName } = getEmployeeDetails(ticketEntry);
      if (!employees.has(employeeId)) {
        employees.set(employeeId, {
          completedCount: 0,
          employeeName,
          totalMinutes: 0,
        });
      }

      const stats = employees.get(employeeId)!;
      stats.completedCount += 1;
      stats.totalMinutes += consumed.totalMinutes;
    });

    return Array.from(employees.entries())
      .map(([employeeId, stats]) => ({
        employeeId,
        employeeName: stats.employeeName,
        completedCount: stats.completedCount,
        averageHours:
          stats.completedCount > 0
            ? Number((stats.totalMinutes / stats.completedCount / 60).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.completedCount - a.completedCount || a.employeeName.localeCompare(b.employeeName));
  }, [scopedData]);

  const latestCreatedDailyAvg = useMemo(() => {
    const nonZero = dailyAverageTrend.filter((row) => row.createdDailyAvg > 0);
    return nonZero.length > 0 ? nonZero[nonZero.length - 1].createdDailyAvg : 0;
  }, [dailyAverageTrend]);

  const latestCompletedDailyAvg = useMemo(() => {
    const nonZero = dailyAverageTrend.filter((row) => row.completedDailyAvg > 0);
    return nonZero.length > 0 ? nonZero[nonZero.length - 1].completedDailyAvg : 0;
  }, [dailyAverageTrend]);

  const showCreatedLine = selectedEmployeeId === "all";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Claim vs Closed</h2>
          <p className="text-muted-foreground mt-2">
            Visualizing creation versus completion volumes and time consumed across the last three months.
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

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
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
          Compare ticket creation with completion months inferred from CreatedOn + Z1Z8 Time Consumed from Jan 2025
          through today, and track time consumed. Filter by employee to focus all charts and cards.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scope the dataset to a single role 40 employee or keep all visible employees.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="employee-focus">Employee focus</Label>
            <Select value={selectedEmployeeId} onValueChange={(value) => setSelectedEmployeeId(value)}>
              <SelectTrigger id="employee-focus">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.employeeId} value={employee.employeeId}>
                    {employee.employeeName} ({employee.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Filtering updates every chart and completion card below.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Created (Since Jan 2025)"
          value={totalCreated}
          description="Tickets created from 2025-01 to the current month"
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
          title="Recent 3-Month Balance"
          value={`${recentCompleted}/${recentCreated}`}
          description="Completed vs created in the latest three months"
          icon={AlertCircle}
        />
      </div>

      <Card className="shadow-sm border border-border/60 bg-gradient-to-r from-slate-50 via-white to-emerald-50">
        <CardHeader>
          <CardTitle>Average Pace per Month</CardTitle>
          <p className="text-sm text-muted-foreground">
            Combined view of created and completed tickets per day. Created disappears when focusing on a specific
            employee. Latest completed pace: {latestCompletedDailyAvg} / day
            {showCreatedLine ? `; created: ${latestCreatedDailyAvg} / day.` : "."}
          </p>
        </CardHeader>
        <CardContent className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyAverageTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `${value}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number, name) => [`${value} / day`, name === "createdDailyAvg" ? "Created per day" : "Completed per day"]} />
              {showCreatedLine && (
                <Area
                  type="monotone"
                  dataKey="createdDailyAvg"
                  name="Created per day"
                  fill={CHART_COLORS.createdArea}
                  stroke={CHART_COLORS.createdStroke}
                  strokeWidth={3}
                  dot={{ r: 4, fill: CHART_COLORS.createdStroke }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList dataKey="createdDailyAvg" position="top" formatter={(value: number) => value.toFixed(2)} />
                </Area>
              )}
              <Line
                type="monotone"
                dataKey="completedDailyAvg"
                name="Completed per day"
                stroke={CHART_COLORS.completedStroke}
                strokeWidth={4}
                dot={{ r: 4, fill: CHART_COLORS.completedStroke }}
                activeDot={{ r: 6 }}
              >
                <LabelList dataKey="completedDailyAvg" position="top" formatter={(value: number) => value.toFixed(2)} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-border/60">
        <CardHeader>
          <CardTitle>Monthly Created, Completed &amp; Time</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full-width view of created vs completed counts with average hours consumed layered on top from Jan 2025
            through the current month.
          </p>
        </CardHeader>
        <CardContent className="h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comparisonData} barGap={16}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}h`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name) => {
                  if (name === "averageHours") return [`${value} hours`, "Avg Time"];
                  return [value, name === "created" ? "Created" : "Completed (Z1Z8)"];
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="created"
                name="Created"
                fill={CHART_COLORS.createdBar}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="completed"
                name="Completed (Z1Z8)"
                fill={CHART_COLORS.completedBar}
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageHours"
                name="Avg Hours"
                stroke={CHART_COLORS.averageStroke}
                strokeWidth={4}
                dot={{ r: 4, fill: CHART_COLORS.averageDot }}
                activeDot={{ r: 6, fill: CHART_COLORS.averageStroke }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Employees with Z8 Completions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each card represents a role 40 InvolvedPartyName with at least one completion using Z1Z8 time consumed.
          </p>
        </CardHeader>
        <CardContent>
          {employeeCompletionCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Z8 completions found for the current filter.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {employeeCompletionCards.map((employee) => (
                <Card key={employee.employeeId} className="border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-tight">{employee.employeeName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold">{employee.completedCount}</p>
                    <p className="text-sm text-muted-foreground">Completions with Z8 time</p>
                    <p className="text-xs text-muted-foreground">Avg time: {employee.averageHours}h</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
