import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
};

type AverageRow = {
  month: string;
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

const START_MONTH = startOfMonth(new Date(2025, 0, 1));
const END_MONTH = endOfMonth(new Date());

function parseTicketDate(raw: string) {
  if (!raw) return new Date("");
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  return parseDate(raw, "dd/MM/yyyy", new Date());
}

function getEmployeeDetails(ticketEntry: TicketEntry) {
  const employee = ticketEntry.roles["40"];
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

  const { comparisonData, averageTrend, totalCreated, totalCompleted, averageHoursAcrossRange } =
    useMemo(() => {
      if (!scopedData) {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Claim vs Closed</h2>
          <p className="text-muted-foreground mt-2">
            Visualizing creation versus completion volumes and time consumed, starting from Jan 2025.
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
          Compare monthly ticket creation with completion months inferred from CreatedOn + Z1Z8 Time Consumed,
          and track average hours consumed. Filter by employee to focus all charts and cards.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Avg Created per Day (Monthly)</CardTitle>
            <p className="text-sm text-muted-foreground">
              CreatedOn counts divided by days in each month. Latest: {latestCreatedDailyAvg} per day.
            </p>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAverageTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value} / day`, "Average Created"]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="createdDailyAvg"
                  name="Created per day"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0ea5e9" }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList dataKey="createdDailyAvg" position="top" formatter={(value: number) => value.toFixed(2)} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Avg Completed per Day (Monthly)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Completions inferred from Z1Z8 time per day. Latest: {latestCompletedDailyAvg} per day.
            </p>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAverageTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value} / day`, "Average Completed"]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completedDailyAvg"
                  name="Completed per day"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#22c55e" }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList dataKey="completedDailyAvg" position="top" formatter={(value: number) => value.toFixed(2)} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
