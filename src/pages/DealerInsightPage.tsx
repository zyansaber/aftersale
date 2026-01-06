import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DealerStats, TicketData, TicketEntry } from "@/types/ticket";
import { analyzeDealers, getNormalizedSerialId, parseAmountIncludingTax } from "@/utils/dataParser";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import StatCard from "@/components/StatCard";
import { ArrowLeft, Clock, FileText, TrendingUp } from "lucide-react";
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
import { formatTimeBreakdown } from "@/utils/timeParser";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/PageLoader";

export default function DealerInsightPage() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, settings } = useVisibleTickets();

  const dealers = useMemo<DealerStats[]>(() => {
    if (!data) return [];
    return analyzeDealers(data);
  }, [data]);

  const tickets = useMemo(
    () => (data ? Object.values(data.c4cTickets_test.tickets) : []),
    [data]
  );

  const [startMonth, setStartMonth] = useState("2025-01");

  const selectedDealer = dealers.find((d) => d.dealerId === dealerId);

  const dealerTickets = useMemo(() => {
    if (!dealerId) return [] as TicketEntry[];
    return tickets.filter((ticketEntry) => {
      const dealer = ticketEntry.roles?.["1001"];
      const id = dealer?.InvolvedPartyBusinessPartnerID ?? "unknown";
      return id === dealerId;
    });
  }, [dealerId, tickets]);

  const amountDistribution = useMemo(() => {
    const buckets = [
      { label: "0 - 500", min: 0, max: 500, count: 0 },
      { label: "500 - 2k", min: 500, max: 2000, count: 0 },
      { label: "2k - 5k", min: 2000, max: 5000, count: 0 },
      { label: "5k+", min: 5000, max: Infinity, count: 0 },
    ];

    dealerTickets.forEach((ticketEntry) => {
      const amount = parseAmountIncludingTax(ticketEntry.ticket.AmountIncludingTax) ?? 0;
      const bucket = buckets.find((b) => amount >= b.min && amount < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [dealerTickets]);

  const chassisDuplicateDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    dealerTickets.forEach((ticketEntry) => {
      const chassis = getNormalizedSerialId(ticketEntry);
      if (!chassis) return;
      counts[chassis] = (counts[chassis] || 0) + 1;
    });

    const distribution = [
      { label: "Unique", min: 1, max: 2, count: 0 },
      { label: "2 - 3 repeats", min: 2, max: 4, count: 0 },
      { label: "4+ repeats", min: 4, max: Infinity, count: 0 },
    ];

    Object.values(counts).forEach((repeatCount) => {
      const bucket = distribution.find((b) => repeatCount >= b.min && repeatCount < b.max);
      if (bucket) bucket.count += 1;
    });

    return distribution;
  }, [dealerTickets]);

  const statusCounts = useMemo(() => {
    const summary: Record<string, number> = {};
    dealerTickets.forEach((ticketEntry) => {
      const status = ticketEntry.ticket.TicketStatusText || "Unknown";
      summary[status] = (summary[status] || 0) + 1;
    });
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dealerTickets]);

  const ticketTrend = useMemo(() => {
    const timeline: Record<string, number> = {};
    dealerTickets.forEach((ticketEntry) => {
      const createdOn = ticketEntry.ticket.CreatedOn;
      const date = new Date(createdOn);
      if (Number.isNaN(date.getTime())) return;
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      timeline[label] = (timeline[label] || 0) + 1;
    });

    const sorted = Object.entries(timeline)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, value]) => ({ month, value }));

    return sorted.filter(({ month }) => month >= startMonth);
  }, [dealerTickets, startMonth]);

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load dealership data: {message}</div>;
  }

  if (isLoading) {
    return (
      <PageLoader
        title="Loading dealer insights"
        description="Syncing data and filtering to the selected dealer before rendering charts to avoid stutter."
        tasks={[
          { label: "Ticket dataset", progress: data ? 100 : 0 },
          { label: "Visibility filters", progress: settings ? 100 : 0 },
        ]}
      />
    );
  }

  if (!selectedDealer) {
    return (
      <div className="p-8 text-destructive">
        Dealer not found. Please pick again from the dealership list.
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
            <p className="text-sm uppercase text-muted-foreground">Dealer Insight Window</p>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            {selectedDealer.dealerName} <span className="text-muted-foreground font-normal">#{selectedDealer.dealerId}</span>
          </h1>
          <p className="text-muted-foreground">
            Addressable window view with focused analytics: amount ranges, chassis frequency, status mix, and CreatedOn trend.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-right text-sm text-muted-foreground">
          <span>Shareable URL</span>
          <code className="rounded-md border bg-muted px-3 py-1 text-xs">/dealer-insights/{selectedDealer.dealerId}</code>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Tickets"
          value={selectedDealer.totalTickets}
          description="Total related tickets"
          icon={FileText}
        />
        <StatCard
          title="Unique Chassis"
          value={selectedDealer.chassisNumbers.length}
          description="Distinct chassis numbers"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Time"
          value={formatTimeBreakdown(selectedDealer.avgTimeConsumed)}
          description="Average handling time"
          icon={Clock}
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
            {chassisDuplicateDistribution.some((b) => b.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chassisDuplicateDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" name="Chassis IDs" radius={[6, 6, 0, 0]} />
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
              <label className="text-sm text-muted-foreground" htmlFor="trend-start">Start month</label>
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
                    dataKey="value"
                    name="Ticket Count"
                    stroke="#8B5CF6"
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
      </div>
    </div>
  );
}
