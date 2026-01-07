import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RepairStats, TicketEntry } from "@/types/ticket";
import { analyzeRepairs, getNormalizedSerialId, parseAmountIncludingTax } from "@/utils/dataParser";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import StatCard from "@/components/StatCard";
import { ArrowLeft, DollarSign, FileText, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/PageLoader";

export default function RepairInsightPage() {
  const { repairId } = useParams<{ repairId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, settings } = useVisibleTickets();

  const repairs = useMemo<RepairStats[]>(() => {
    if (!data) return [];
    return analyzeRepairs(data);
  }, [data]);

  const tickets = useMemo(
    () => (data ? Object.values(data.c4cTickets_test.tickets) : []),
    [data]
  );

  const [startMonth, setStartMonth] = useState("2025-01");

  const selectedRepair = repairs.find((r) => r.repairId === repairId);

  const repairTickets = useMemo(() => {
    if (!repairId) return [] as TicketEntry[];
    return tickets.filter((ticketEntry) => {
      const repair = ticketEntry.roles?.["43"];
      const id = repair?.InvolvedPartyBusinessPartnerID ?? "no-repair";
      return id === repairId;
    });
  }, [repairId, tickets]);

  const amountDistribution = useMemo(() => {
    const buckets = [
      { label: "0 - 500", min: 0, max: 500, count: 0 },
      { label: "500 - 2k", min: 500, max: 2000, count: 0 },
      { label: "2k - 5k", min: 2000, max: 5000, count: 0 },
      { label: "5k+", min: 5000, max: Infinity, count: 0 },
    ];

    repairTickets.forEach((ticketEntry) => {
      const amount = parseAmountIncludingTax(ticketEntry.ticket.AmountIncludingTax) ?? 0;
      const bucket = buckets.find((b) => amount >= b.min && amount < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [repairTickets]);

  const chassisDuplicateDistribution = useMemo(() => {
    const chassisStats: Record<
      string,
      {
        count: number;
        earliestDate?: Date;
      }
    > = {};

    repairTickets.forEach((ticketEntry) => {
      const chassis = getNormalizedSerialId(ticketEntry);
      if (!chassis) return;
      const current = chassisStats[chassis] ?? { count: 0 };
      current.count += 1;
      const createdOn = new Date(ticketEntry.ticket.CreatedOn);
      if (!Number.isNaN(createdOn.getTime())) {
        if (!current.earliestDate || createdOn < current.earliestDate) {
          current.earliestDate = createdOn;
        }
      }
      chassisStats[chassis] = current;
    });

    const repeatRanges = [
      { key: "unique", label: "Unique", min: 1, max: 2 },
      { key: "repeat_2_3", label: "2 - 3 repeats", min: 2, max: 4 },
      { key: "repeat_4_plus", label: "4+ repeats", min: 4, max: Infinity },
    ];

    const costRanges = [
      { key: "low", label: "0 - 500", min: 0, max: 500 },
      { key: "mid", label: "500 - 2k", min: 500, max: 2000 },
      { key: "high", label: "2k - 5k", min: 2000, max: 5000 },
      { key: "premium", label: "5k+", min: 5000, max: Infinity },
    ];

    const distribution = repeatRanges.map((range) => ({
      label: range.label,
      ...costRanges.reduce<Record<string, number>>((acc, costRange) => {
        acc[costRange.key] = 0;
        return acc;
      }, {}),
    }));

    repairTickets.forEach((ticketEntry) => {
      const chassis = getNormalizedSerialId(ticketEntry);
      if (!chassis) return;
      const chassisInfo = chassisStats[chassis];
      if (!chassisInfo) return;
      const repeatRange = repeatRanges.find(
        (range) => chassisInfo.count >= range.min && chassisInfo.count < range.max
      );
      const amount = parseAmountIncludingTax(ticketEntry.ticket.AmountIncludingTax) ?? 0;
      const costRange = costRanges.find(
        (range) => amount >= range.min && amount < range.max
      );
      if (!repeatRange || !costRange) return;
      const target = distribution.find((entry) => entry.label === repeatRange.label);
      if (target) {
        target[costRange.key] += 1;
      }
    });

    return { distribution, chassisStats, repeatRanges };
  }, [repairTickets]);

  const statusCounts = useMemo(() => {
    const summary: Record<string, number> = {};
    repairTickets.forEach((ticketEntry) => {
      const status = ticketEntry.ticket.TicketStatusText || "Unknown";
      summary[status] = (summary[status] || 0) + 1;
    });
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [repairTickets]);

  const ticketTrend = useMemo(() => {
    const timeline: Record<string, Record<string, number>> = {};

    Object.entries(chassisDuplicateDistribution.chassisStats).forEach(([_, chassisInfo]) => {
      if (!chassisInfo.earliestDate) return;
      const label = `${chassisInfo.earliestDate.getFullYear()}-${String(
        chassisInfo.earliestDate.getMonth() + 1
      ).padStart(2, "0")}`;
      const repeatRange = chassisDuplicateDistribution.repeatRanges.find(
        (range) => chassisInfo.count >= range.min && chassisInfo.count < range.max
      );
      if (!repeatRange) return;
      if (!timeline[label]) {
        timeline[label] = {};
      }
      timeline[label][repeatRange.key] = (timeline[label][repeatRange.key] || 0) + 1;
    });

    const sorted = Object.entries(timeline)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, values]) => {
        const entry: Record<string, number | string> = { month };
        chassisDuplicateDistribution.repeatRanges.forEach((range) => {
          entry[range.key] = values[range.key] || 0;
        });
        return entry;
      });

    return sorted.filter(({ month }) => String(month) >= startMonth);
  }, [chassisDuplicateDistribution, startMonth]);

  const costByType = useMemo(() => {
    if (!selectedRepair) return [];
    return Object.entries(selectedRepair.costByType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedRepair]);

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load repair data: {message}</div>;
  }

  if (isLoading) {
    return (
      <PageLoader
        title="Loading repair insights"
        description="Syncing data and filtering to the selected repair shop before rendering charts to avoid stutter."
        tasks={[
          { label: "Ticket dataset", progress: data ? 100 : 0 },
          { label: "Visibility filters", progress: settings ? 100 : 0 },
        ]}
      />
    );
  }

  if (!selectedRepair) {
    return (
      <div className="p-8 text-destructive">
        Repair shop not found. Please pick again from the repairs list.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <p className="text-sm uppercase text-muted-foreground">Repair Insight Window</p>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            {selectedRepair.repairName}{" "}
            <span className="text-muted-foreground font-normal">#{selectedRepair.repairId}</span>
          </h1>
          <p className="text-muted-foreground">
            Focused analytics for this repair shop: amount ranges, chassis frequency, status mix, and
            CreatedOn trend.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-right text-sm text-muted-foreground">
          <span>Shareable URL</span>
          <code className="rounded-md border bg-muted px-3 py-1 text-xs">/repair-insights/{selectedRepair.repairId}</code>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Tickets"
          value={selectedRepair.ticketCount}
          description="Total related tickets"
          icon={FileText}
        />
        <StatCard
          title="Total Cost"
          value={`$${selectedRepair.totalCost.toFixed(2)}`}
          description="Sum of AmountIncludingTax"
          icon={DollarSign}
        />
        <StatCard
          title="Avg Cost"
          value={`$${selectedRepair.avgCost.toFixed(2)}`}
          description="Average AmountIncludingTax"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Amount Including Tax Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {amountDistribution.some((b) => b.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amountDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" name="Tickets" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center mt-10">No amount data</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Chassis Number Repeat Range</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {chassisDuplicateDistribution.distribution.some((entry) =>
              Object.values(entry).some((value) => typeof value === "number" && value > 0)
            ) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chassisDuplicateDistribution.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="low" stackId="cost" fill="#38BDF8" name="0 - 500" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="mid" stackId="cost" fill="#34D399" name="500 - 2k" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="high" stackId="cost" fill="#F59E0B" name="2k - 5k" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="premium" stackId="cost" fill="#EF4444" name="5k+" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center mt-10">No chassis repeat data</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Status Volume</CardTitle>
              <p className="text-sm text-muted-foreground">Wider view for dense status sets</p>
            </div>
          </CardHeader>
          <CardContent className="h-[360px]">
            {statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#F59E0B" name="Tickets" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center mt-10">No status data</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Ticket CreatedOn Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Default start at 2025-01; adjust as needed</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground" htmlFor="trend-start">
                Start month
              </label>
              <Input
                id="trend-start"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent className="h-[360px]">
            {ticketTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="unique"
                    name="Unique"
                    stroke="#38BDF8"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="repeat_2_3"
                    name="2 - 3 repeats"
                    stroke="#34D399"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="repeat_4_plus"
                    name="4+ repeats"
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center mt-10">No trend data</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Cost by Ticket Type</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {costByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563EB" name="Total Cost ($)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center mt-10">No cost by type data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
