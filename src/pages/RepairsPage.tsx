import { useEffect, useMemo, useState } from "react";
import { RepairStats } from "@/types/ticket";
import { analyzeRepairs } from "@/utils/dataParser";
import StatCard from "@/components/StatCard";
import { Wrench, DollarSign, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { PaginationControls } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/PageLoader";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899"];
const PAGE_SIZE = 50;

export default function RepairsPage() {
  const { data, isLoading, error, settings } = useVisibleTickets();
  const [page, setPage] = useState(1);

  const repairs = useMemo<RepairStats[]>(() => {
    if (!data) return [];
    return analyzeRepairs(data);
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [repairs.length]);

  const costRangeData = useMemo(
    () => [
      {
        name: "Low (<$500)",
        value: repairs.reduce((sum, r) => sum + r.costRanges.low, 0),
      },
      {
        name: "Medium ($500-$2000)",
        value: repairs.reduce((sum, r) => sum + r.costRanges.medium, 0),
      },
      {
        name: "High (>$2000)",
        value: repairs.reduce((sum, r) => sum + r.costRanges.high, 0),
      },
    ],
    [repairs]
  );

  const topShopsData = useMemo(
    () =>
      repairs.slice(0, 5).map((r) => ({
        name: r.repairName,
        totalCost: r.totalCost,
        avgCost: r.avgCost,
      })),
    [repairs]
  );

  const paginatedRepairs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return repairs.slice(start, start + PAGE_SIZE);
  }, [page, repairs]);

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load repair data: {message}</div>;
  }

  if (isLoading) {
    return (
      <PageLoader
        title="Loading repair analytics"
        description="Syncing datasets and precomputing aggregations and charts."
        tasks={[
          { label: "Ticket dataset", progress: data ? 100 : 0 },
          { label: "Visibility filters", progress: settings ? 100 : 0 },
        ]}
      />
    );
  }

  const totalRepairShops = repairs.length;
  const totalCost = repairs.reduce((sum, r) => sum + r.totalCost, 0);
  const totalTickets = repairs.reduce((sum, r) => sum + r.ticketCount, 0);
  const avgCostPerTicket = totalTickets > 0 ? (totalCost / totalTickets).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Repair Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Cost analysis and repair shop performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Repair Shops"
          value={totalRepairShops}
          icon={Wrench}
          description="Active repair partners"
        />
        <StatCard
          title="Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          icon={DollarSign}
          description="All repair costs"
        />
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={PieChartIcon}
          description="Repair tickets processed"
        />
        <StatCard
          title="Avg Cost/Ticket"
          value={`$${avgCostPerTicket}`}
          icon={TrendingUp}
          description="Average repair cost"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Range Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costRangeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costRangeData.map((entry, index) => (
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
            <CardTitle>Top Repair Shops by Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topShopsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalCost" fill="#3B82F6" name="Total Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repair Shop Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repair Shop Name</TableHead>
                <TableHead>Shop ID</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="text-right">Low Cost</TableHead>
                <TableHead className="text-right">Medium Cost</TableHead>
                <TableHead className="text-right">High Cost</TableHead>
                <TableHead className="text-right">Insights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRepairs.map((repair) => (
                <TableRow
                  key={repair.repairId}
                  className="cursor-pointer transition hover:bg-muted/40"
                  onClick={() =>
                    window.open(
                      `/repair-insights/${encodeURIComponent(repair.repairId)}`,
                      "_blank",
                      "noopener,noreferrer,width=1400,height=900"
                    )
                  }
                >
                  <TableCell className="font-medium">{repair.repairName}</TableCell>
                  <TableCell className="text-muted-foreground">{repair.repairId}</TableCell>
                  <TableCell className="text-right">${repair.totalCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${repair.avgCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{repair.ticketCount}</TableCell>
                  <TableCell className="text-right">{repair.costRanges.low}</TableCell>
                  <TableCell className="text-right">{repair.costRanges.medium}</TableCell>
                  <TableCell className="text-right">{repair.costRanges.high}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/repair-insights/${encodeURIComponent(repair.repairId)}`,
                          "_blank",
                          "noopener,noreferrer,width=1400,height=900"
                        );
                      }}
                    >
                      Advanced view
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        totalItems={repairs.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
