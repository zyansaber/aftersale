import { useEffect, useMemo, useState } from "react";
import { DealerStats, TicketData } from "@/types/ticket";
import { analyzeDealers } from "@/utils/dataParser";
import StatCard from "@/components/StatCard";
import { ArrowUpRight, Building2, Clock, FileText, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeBreakdown } from "@/utils/timeParser";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { PaginationControls } from "@/components/PaginationControls";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const PAGE_SIZE = 50;

export default function DealershipsPage() {
  const { data, isLoading, error } = useVisibleTickets();
  const [hideBlankDealers, setHideBlankDealers] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedDealer, setSelectedDealer] = useState<DealerStats | null>(null);

  const dealers = useMemo<DealerStats[]>(() => {
    if (!data) return [];
    return analyzeDealers(data);
  }, [data]);

  const filteredDealers = useMemo(() => {
    if (!hideBlankDealers) return dealers;
    return dealers.filter(
      (dealer) =>
        dealer.dealerName.trim() !== "" &&
        dealer.dealerName.toLowerCase() !== "unknown dealer"
    );
  }, [dealers, hideBlankDealers]);

  useEffect(() => {
    setPage(1);
  }, [filteredDealers.length]);

  const chartData = useMemo(() => {
    const ticketTypeData: Record<string, number> = {};
    filteredDealers.forEach((dealer) => {
      Object.entries(dealer.ticketsByType).forEach(([type, count]) => {
        ticketTypeData[type] = (ticketTypeData[type] || 0) + count;
      });
    });

    return Object.entries(ticketTypeData).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredDealers]);

  const paginatedDealers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDealers.slice(start, start + PAGE_SIZE);
  }, [filteredDealers, page]);

  const dealerTicketMap = useMemo(() => {
    if (!data) return {};
    type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];
    const map: Record<string, TicketEntry[]> = {};
    Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
      const dealer = ticketEntry.roles["1001"];
      const dealerId = dealer?.InvolvedPartyBusinessPartnerID ?? "unknown";
      map[dealerId] = map[dealerId] ?? [];
      map[dealerId].push(ticketEntry);
    });
    return map;
  }, [data]);

  const totalTickets = filteredDealers.reduce((sum, d) => sum + d.totalTickets, 0);
  const totalDealers = filteredDealers.length;
  const avgTicketsPerDealer = totalDealers > 0 ? (totalTickets / totalDealers).toFixed(1) : 0;

  const selectedTickets = useMemo(() => {
    if (!selectedDealer) return [];
    return dealerTicketMap[selectedDealer.dealerId] ?? [];
  }, [dealerTicketMap, selectedDealer]);

  const amountDistribution = useMemo(() => {
    const buckets = [
      { label: "0 - 500", min: 0, max: 500, count: 0 },
      { label: "500 - 2k", min: 500, max: 2000, count: 0 },
      { label: "2k - 5k", min: 2000, max: 5000, count: 0 },
      { label: "5k+", min: 5000, max: Infinity, count: 0 },
    ];

    selectedTickets.forEach((ticketEntry) => {
      const amount = parseFloat(ticketEntry.ticket.AmountIncludingTax) || 0;
      const bucket = buckets.find((b) => amount >= b.min && amount < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [selectedTickets]);

  const chassisDuplicateDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedTickets.forEach((ticketEntry) => {
      const chassis = (ticketEntry.ticket.ChassisNumber || "").trim();
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
  }, [selectedTickets]);

  const statusCounts = useMemo(() => {
    const summary: Record<string, number> = {};
    selectedTickets.forEach((ticketEntry) => {
      const status = ticketEntry.ticket.TicketStatusText || "Unknown";
      summary[status] = (summary[status] || 0) + 1;
    });
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedTickets]);

  const ticketTrend = useMemo(() => {
    const timeline: Record<string, number> = {};
    selectedTickets.forEach((ticketEntry) => {
      const createdOn = ticketEntry.ticket.CreatedOn;
      const date = new Date(createdOn);
      if (Number.isNaN(date.getTime())) return;
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      timeline[label] = (timeline[label] || 0) + 1;
    });

    return Object.entries(timeline)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, value]) => ({ month, value }));
  }, [selectedTickets]);

  if (isLoading) {
    return <div className="p-8">Loading dealership data...</div>;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load dealership data: {message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dealership Analysis</h2>
          <p className="text-muted-foreground mt-2">
            Overview of all dealerships and their ticket management
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div className="text-sm">
            <div className="font-medium">Hide blank dealer names</div>
            <p className="text-muted-foreground">
              Hide empty or unknown dealer names by default; toggle to include them
            </p>
          </div>
          <Switch
            checked={hideBlankDealers}
            onCheckedChange={setHideBlankDealers}
            aria-label="Toggle blank dealers"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Dealerships"
          value={totalDealers}
          icon={Building2}
          description="Active dealerships"
        />
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={FileText}
          description="All dealership tickets"
        />
        <StatCard
          title="Avg Tickets/Dealer"
          value={avgTicketsPerDealer}
          icon={TrendingUp}
          description="Average workload"
        />
        <StatCard
          title="Avg Processing Time"
          value={
            filteredDealers.length > 0
              ? formatTimeBreakdown(
                  filteredDealers.reduce(
                    (acc, d) => ({
                      days: acc.days + d.avgTimeConsumed.days,
                      hours: acc.hours + d.avgTimeConsumed.hours,
                      minutes: acc.minutes + d.avgTimeConsumed.minutes,
                      totalMinutes: acc.totalMinutes + d.avgTimeConsumed.totalMinutes,
                    }),
                    { days: 0, hours: 0, minutes: 0, totalMinutes: 0 }
                  )
                )
              : "0m"
          }
          icon={Clock}
          description="Average time per ticket"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Dealerships by Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredDealers.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dealerName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalTickets" fill="#3B82F6" name="Total Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dealership Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer Name</TableHead>
                <TableHead>Dealer ID</TableHead>
                <TableHead className="text-right">Total Tickets</TableHead>
                <TableHead className="text-right">Chassis Numbers</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead>Top Status</TableHead>
                <TableHead>Top Type</TableHead>
                <TableHead className="text-right">Insights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDealers.map((dealer) => {
                const topStatus = Object.entries(dealer.ticketsByStatus).sort(
                  ([, a], [, b]) => b - a
                )[0];
                const topType = Object.entries(dealer.ticketsByType).sort(
                  ([, a], [, b]) => b - a
                )[0];

                return (
                  <TableRow
                    key={dealer.dealerId}
                    className="cursor-pointer transition hover:bg-muted/40"
                    onClick={() => setSelectedDealer(dealer)}
                  >
                    <TableCell className="font-medium">{dealer.dealerName}</TableCell>
                    <TableCell className="text-muted-foreground">{dealer.dealerId}</TableCell>
                    <TableCell className="text-right">{dealer.totalTickets}</TableCell>
                    <TableCell className="text-right">{dealer.chassisNumbers.length}</TableCell>
                    <TableCell className="text-right">
                      {formatTimeBreakdown(dealer.avgTimeConsumed)}
                    </TableCell>
                    <TableCell>
                      {topStatus ? `${topStatus[0]} (${topStatus[1]})` : "N/A"}
                    </TableCell>
                    <TableCell>{topType ? `${topType[0]} (${topType[1]})` : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDealer(dealer);
                        }}
                      >
                        Advanced view
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        totalItems={filteredDealers.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      />

      <Drawer
        open={!!selectedDealer}
        onOpenChange={(open) => {
          if (!open) setSelectedDealer(null);
        }}
        shouldScaleBackground
      >
        <DrawerContent className="mx-auto max-w-6xl rounded-t-xl border bg-white shadow-2xl">
          <DrawerHeader className="flex flex-col gap-2 border-b pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase text-muted-foreground">Dealer Insight Workspace</p>
                <DrawerTitle className="text-2xl">
                  {selectedDealer?.dealerName || "Dealer"}{" "}
                  <span className="text-muted-foreground font-normal">
                    #{selectedDealer?.dealerId}
                  </span>
                </DrawerTitle>
                <p className="text-muted-foreground">
                  Pro view: amount ranges, chassis repeat frequency, status mix, and CreatedOn trend
                </p>
              </div>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </div>
            {selectedDealer && (
              <div className="grid gap-3 md:grid-cols-3">
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
            )}
          </DrawerHeader>

          <div className="grid gap-6 p-6 md:grid-cols-2">
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

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Status Volume</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {statusCounts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusCounts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={80} />
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
              <CardHeader>
                <CardTitle>Ticket CreatedOn Trend</CardTitle>
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
        </DrawerContent>
      </Drawer>
    </div>
  );
}
