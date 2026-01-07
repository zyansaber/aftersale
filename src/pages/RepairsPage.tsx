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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899"];
const PAGE_SIZE = 50;

export default function RepairsPage() {
  const { data, isLoading, error, settings } = useVisibleTickets({
    applyRepairVisibility: false,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRepairId, setSelectedRepairId] = useState<string>("all");
  const [sortKey, setSortKey] = useState<
    | "repairName"
    | "repairId"
    | "totalCost"
    | "avgCost"
    | "ticketCount"
    | "chassisTicketCount"
    | "uniqueChassisCount"
    | "uniqueChassisRatio"
    | "lowCost"
    | "mediumCost"
    | "highCost"
  >("ticketCount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const repairs = useMemo<RepairStats[]>(() => {
    if (!data) return [];
    return analyzeRepairs(data);
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [repairs.length]);

  const filteredRepairs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return repairs.filter((repair) => {
      const matchesId = selectedRepairId === "all" || repair.repairId === selectedRepairId;
      const matchesSearch =
        !normalizedSearch ||
        repair.repairName.toLowerCase().includes(normalizedSearch) ||
        repair.repairId.toLowerCase().includes(normalizedSearch);
      return matchesId && matchesSearch;
    });
  }, [repairs, search, selectedRepairId]);

  const sortedRepairs = useMemo(() => {
    const sorted = [...filteredRepairs];
    sorted.sort((a, b) => {
      const getValue = (repair: RepairStats) => {
        switch (sortKey) {
          case "repairName":
            return repair.repairName;
          case "repairId":
            return repair.repairId;
          case "totalCost":
            return repair.totalCost;
          case "avgCost":
            return repair.avgCost;
          case "ticketCount":
            return repair.ticketCount;
          case "chassisTicketCount":
            return repair.chassisTicketCount;
          case "uniqueChassisCount":
            return repair.uniqueChassisCount;
          case "uniqueChassisRatio":
            return repair.uniqueChassisRatio;
          case "lowCost":
            return repair.costRanges.low;
          case "mediumCost":
            return repair.costRanges.medium;
          case "highCost":
            return repair.costRanges.high;
          default:
            return repair.ticketCount;
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === "string" && typeof valueB === "string") {
        const result = valueA.localeCompare(valueB);
        return sortDirection === "asc" ? result : -result;
      }

      const diff = Number(valueA) - Number(valueB);
      return sortDirection === "asc" ? diff : -diff;
    });
    return sorted;
  }, [filteredRepairs, sortDirection, sortKey]);

  const costRangeData = useMemo(
    () => [
      {
        name: "Low (<$500)",
        value: filteredRepairs.reduce((sum, r) => sum + r.costRanges.low, 0),
      },
      {
        name: "Medium ($500-$2000)",
        value: filteredRepairs.reduce((sum, r) => sum + r.costRanges.medium, 0),
      },
      {
        name: "High (>$2000)",
        value: filteredRepairs.reduce((sum, r) => sum + r.costRanges.high, 0),
      },
    ],
    [filteredRepairs]
  );

  const topShopsData = useMemo(
    () =>
      filteredRepairs.slice(0, 5).map((r) => ({
        name: r.repairName,
        totalCost: r.totalCost,
        avgCost: r.avgCost,
      })),
    [filteredRepairs]
  );

  const paginatedRepairs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRepairs.slice(start, start + PAGE_SIZE);
  }, [page, sortedRepairs]);

  const repairOptions = useMemo(
    () => repairs.map((repair) => ({ id: repair.repairId, name: repair.repairName })),
    [repairs]
  );

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

  const totalRepairShops = filteredRepairs.length;
  const totalCost = filteredRepairs.reduce((sum, r) => sum + r.totalCost, 0);
  const totalTickets = filteredRepairs.reduce((sum, r) => sum + r.ticketCount, 0);
  const avgCostPerTicket = totalTickets > 0 ? (totalCost / totalTickets).toFixed(2) : 0;
  const averageChassisTicketRatio =
    filteredRepairs.length > 0
      ? (filteredRepairs.reduce((sum, r) => sum + r.chassisTicketRatio, 0) / filteredRepairs.length) *
        100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Repair Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Cost analysis and repair shop performance metrics
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full dataset filter by repair shop, with fuzzy search across repair name and ID.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="repair-select">Filter by repair</Label>
            <Select
              value={selectedRepairId}
              onValueChange={(value) => {
                setSelectedRepairId(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="repair-select">
                <SelectValue placeholder="All repairs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repairs ({repairs.length})</SelectItem>
                {repairOptions.map((repair) => (
                  <SelectItem key={repair.id} value={repair.id}>
                    {repair.name} ({repair.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="repair-search">Fuzzy search</Label>
            <Input
              id="repair-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search repair name or ID"
            />
            <p className="text-xs text-muted-foreground">Matches partial text in name or ID.</p>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <p className="text-sm text-muted-foreground">Visible repairs: {filteredRepairs.length}</p>
            <p className="text-sm text-muted-foreground">
              Avg chassis ticket ratio: {averageChassisTicketRatio.toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

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
          <p className="text-sm text-muted-foreground mb-4">
            Click a header to sort across all repair shops. Default ordering is by ticket volume.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortKey === "repairName") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("repairName");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    Repair Shop Name
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "repairName" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortKey === "repairId") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("repairId");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    Shop ID
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "repairId" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "totalCost") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("totalCost");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Total Cost
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "totalCost" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "avgCost") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("avgCost");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Avg Cost
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "avgCost" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "ticketCount") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("ticketCount");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Tickets
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "ticketCount" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "chassisTicketCount") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("chassisTicketCount");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Chassis Tickets
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "chassisTicketCount"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "uniqueChassisCount") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("uniqueChassisCount");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Unique Chassis
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "uniqueChassisCount"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "uniqueChassisRatio") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("uniqueChassisRatio");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Unique Chassis %
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "uniqueChassisRatio"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "lowCost") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("lowCost");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Low Cost
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "lowCost" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "mediumCost") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("mediumCost");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    Medium Cost
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "mediumCost" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="flex w-full items-center justify-end gap-2"
                    onClick={() => {
                      if (sortKey === "highCost") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("highCost");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    High Cost
                    <span className="text-xs text-muted-foreground">
                      {sortKey === "highCost" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </TableHead>
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
                  <TableCell className="text-right">{repair.chassisTicketCount}</TableCell>
                  <TableCell className="text-right">{repair.uniqueChassisCount}</TableCell>
                  <TableCell className="text-right">
                    {(repair.uniqueChassisRatio * 100).toFixed(1)}%
                  </TableCell>
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
        totalItems={filteredRepairs.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
