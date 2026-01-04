import { useEffect, useMemo, useState } from "react";
import { DealerStats } from "@/types/ticket";
import { analyzeDealers } from "@/utils/dataParser";
import StatCard from "@/components/StatCard";
import { Building2, FileText, Clock, TrendingUp } from "lucide-react";
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
import { useTicketData } from "@/hooks/useTicketData";
import { PaginationControls } from "@/components/PaginationControls";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const PAGE_SIZE = 50;

export default function DealershipsPage() {
  const { data, isLoading, error } = useTicketData();
  const [page, setPage] = useState(1);

  const dealers = useMemo<DealerStats[]>(() => {
    if (!data) return [];
    return analyzeDealers(data);
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [dealers.length]);

  const chartData = useMemo(() => {
    const ticketTypeData: Record<string, number> = {};
    dealers.forEach((dealer) => {
      Object.entries(dealer.ticketsByType).forEach(([type, count]) => {
        ticketTypeData[type] = (ticketTypeData[type] || 0) + count;
      });
    });

    return Object.entries(ticketTypeData).map(([name, value]) => ({
      name,
      value,
    }));
  }, [dealers]);

  const paginatedDealers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return dealers.slice(start, start + PAGE_SIZE);
  }, [dealers, page]);

  if (isLoading) {
    return <div className="p-8">Loading dealership data...</div>;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load dealership data: {message}</div>;
  }

  const totalTickets = dealers.reduce((sum, d) => sum + d.totalTickets, 0);
  const totalDealers = dealers.length;
  const avgTicketsPerDealer = totalDealers > 0 ? (totalTickets / totalDealers).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dealership Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Overview of all dealerships and their ticket management
        </p>
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
            dealers.length > 0
              ? formatTimeBreakdown(
                  dealers.reduce(
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
              <BarChart data={dealers.slice(0, 5)}>
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
                  <TableRow key={dealer.dealerId}>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        totalItems={dealers.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
