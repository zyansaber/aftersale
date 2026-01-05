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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { PaginationControls } from "@/components/PaginationControls";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/PageLoader";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const PAGE_SIZE = 50;

export default function DealershipsPage() {
  const { data, isLoading, error, settings } = useVisibleTickets();
  const [hideBlankDealers, setHideBlankDealers] = useState(true);
  const [page, setPage] = useState(1);

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

  const tickets = useMemo(
    () => (data ? Object.values(data.c4cTickets_test.tickets) : []),
    [data]
  );

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
    type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];
    const map: Record<string, TicketEntry[]> = {};
    tickets.forEach((ticketEntry) => {
      const dealer = ticketEntry.roles["1001"];
      const dealerId = dealer?.InvolvedPartyBusinessPartnerID ?? "unknown";
      map[dealerId] = map[dealerId] ?? [];
      map[dealerId].push(ticketEntry);
    });
    return map;
  }, [tickets]);

  const totalTickets = filteredDealers.reduce((sum, d) => sum + d.totalTickets, 0);
  const totalDealers = filteredDealers.length;
  const avgTicketsPerDealer = totalDealers > 0 ? (totalTickets / totalDealers).toFixed(1) : 0;

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load dealership data: {message}</div>;
  }

  if (isLoading) {
    return (
      <PageLoader
        title="Loading dealership analytics"
        description="Syncing datasets and precomputing aggregations and charts."
        tasks={[
          { label: "Ticket dataset", progress: data ? 100 : 0 },
          { label: "Visibility filters", progress: settings ? 100 : 0 },
        ]}
      />
    );
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
                    onClick={() =>
                      window.open(
                        `/dealer-insights/${encodeURIComponent(dealer.dealerId)}`,
                        "_blank",
                        "noopener,noreferrer,width=1400,height=900"
                      )
                    }
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
                          window.open(
                            `/dealer-insights/${encodeURIComponent(dealer.dealerId)}`,
                            "_blank",
                            "noopener,noreferrer,width=1400,height=900"
                          );
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

    </div>
  );
}
