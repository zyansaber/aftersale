import { useEffect, useMemo, useState } from "react";
import { parse } from "date-fns";
import { RepairStats } from "@/types/ticket";
import { analyzeRepairs, getNormalizedSerialId, parseAmountIncludingTax } from "@/utils/dataParser";
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
import {
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
  const [selectedTrendRepairId, setSelectedTrendRepairId] = useState<string>("");
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

  const tickets = useMemo(() => {
    if (!data) return [];
    return Object.values(data.c4cTickets_test.tickets);
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

  const costRangeSource = useMemo(() => {
    if (!selectedTrendRepairId) return filteredRepairs;
    const match = repairs.find((repair) => repair.repairId === selectedTrendRepairId);
    return match ? [match] : filteredRepairs;
  }, [filteredRepairs, repairs, selectedTrendRepairId]);

  const costRangeData = useMemo(
    () => [
      {
        name: "Low (<$500)",
        value: costRangeSource.reduce((sum, r) => sum + r.costRanges.low, 0),
      },
      {
        name: "Medium ($500-$2000)",
        value: costRangeSource.reduce((sum, r) => sum + r.costRanges.medium, 0),
      },
      {
        name: "High (>$2000)",
        value: costRangeSource.reduce((sum, r) => sum + r.costRanges.high, 0),
      },
    ],
    [costRangeSource]
  );

  const parseTicketDate = (raw: string) => {
    if (!raw) return new Date("");
    const isoCandidate = new Date(raw);
    if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
    return parse(raw, "dd/MM/yyyy", new Date());
  };

  const ticketsFrom2025 = useMemo(() => {
    const start = new Date(2025, 0, 1);
    return tickets.filter((ticketEntry) => {
      const created = parseTicketDate(ticketEntry.ticket.CreatedOn);
      return !Number.isNaN(created.getTime()) && created >= start;
    });
  }, [tickets]);

  const topRepairsByTickets2025 = useMemo(() => {
    const repairMap = new Map<string, { repairId: string; repairName: string; ticketCount: number }>();

    ticketsFrom2025.forEach((ticketEntry) => {
      const repair = ticketEntry.roles?.["43"];
      const repairId = repair?.InvolvedPartyBusinessPartnerID?.trim() || "no-repair";
      const repairName = repair?.RepairerBusinessNameID?.trim() || "No Repair Shop Assigned";
      const existing = repairMap.get(repairId) ?? {
        repairId,
        repairName,
        ticketCount: 0,
      };
      existing.ticketCount += 1;
      repairMap.set(repairId, existing);
    });

    return Array.from(repairMap.values())
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 10);
  }, [ticketsFrom2025]);

  useEffect(() => {
    if (!topRepairsByTickets2025.length) {
      setSelectedTrendRepairId("");
      return;
    }

    setSelectedTrendRepairId((current) => {
      if (current && topRepairsByTickets2025.some((repair) => repair.repairId === current)) {
        return current;
      }
      return topRepairsByTickets2025[0].repairId;
    });
  }, [topRepairsByTickets2025]);

  const selectedTrendRepair = useMemo(
    () => topRepairsByTickets2025.find((repair) => repair.repairId === selectedTrendRepairId),
    [selectedTrendRepairId, topRepairsByTickets2025]
  );

  const trendData = useMemo(() => {
    if (!selectedTrendRepairId) return [];
    const start = new Date(2025, 0, 1);
    const end = new Date();
    const months: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endCursor) {
      const monthLabel = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months.push(monthLabel);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthMap = new Map<
      string,
      { totalCost: number; ticketCount: number; uniqueChassis: Set<string> }
    >();

    ticketsFrom2025.forEach((ticketEntry) => {
      const repair = ticketEntry.roles?.["43"];
      const repairId = repair?.InvolvedPartyBusinessPartnerID?.trim() || "no-repair";
      if (repairId !== selectedTrendRepairId) return;

      const created = parseTicketDate(ticketEntry.ticket.CreatedOn);
      if (Number.isNaN(created.getTime()) || created < start || created > end) return;
      const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const cost = parseAmountIncludingTax(ticketEntry.ticket.AmountIncludingTax) ?? 0;
      const chassis = getNormalizedSerialId(ticketEntry);

      const existing = monthMap.get(monthKey) ?? {
        totalCost: 0,
        ticketCount: 0,
        uniqueChassis: new Set<string>(),
      };

      existing.totalCost += cost;
      existing.ticketCount += 1;
      if (chassis) {
        existing.uniqueChassis.add(chassis);
      }

      monthMap.set(monthKey, existing);
    });

    return months.map((month) => {
      const stats = monthMap.get(month);
      const ticketCount = stats?.ticketCount ?? 0;
      const avgCost = ticketCount > 0 ? stats!.totalCost / ticketCount : 0;
      const uniqueChassisPercent =
        ticketCount > 0 ? (stats!.uniqueChassis.size / ticketCount) * 100 : 0;
      return {
        month,
        avgCost,
        ticketCount,
        uniqueChassisPercent,
      };
    });
  }, [selectedTrendRepairId, ticketsFrom2025]);

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Cost Range Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedTrendRepair
                ? `${selectedTrendRepair.repairName} (${selectedTrendRepair.ticketCount} tickets)`
                : "Based on current filters."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mx-auto w-full max-w-[16rem]">
              <ResponsiveContainer width="100%" height={220}>
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
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Top Repair Shops by Ticket Trends (2025)</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedTrendRepair
                ? `Viewing ${selectedTrendRepair.repairName} (${selectedTrendRepair.ticketCount} tickets)`
                : "Select a repair shop to view 2025 trends."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 lg:flex-row">
            <div className="min-h-[320px] flex-1 lg:flex-[2]">
              {selectedTrendRepair ? (
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      yAxisId="cost"
                      tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                    />
                    <YAxis
                      yAxisId="tickets"
                      orientation="right"
                      tickFormatter={(value: number) => `${value}`}
                    />
                    <YAxis yAxisId="unique" domain={[0, 100]} hide />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Avg Cost") {
                          return [`$${value.toFixed(2)}`, name];
                        }
                        if (name === "Unique Chassis %") {
                          return [`${value.toFixed(1)}%`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgCost"
                      stroke="#3B82F6"
                      yAxisId="cost"
                      name="Avg Cost"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="ticketCount"
                      stroke="#10B981"
                      yAxisId="tickets"
                      name="Tickets"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueChassisPercent"
                      stroke="#F59E0B"
                      yAxisId="unique"
                      name="Unique Chassis %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No 2025 repair ticket trends available.
                </div>
              )}
            </div>
            <div className="w-full lg:w-64">
              <p className="text-sm font-medium">Top 10 repairs by ticket count</p>
              <p className="text-xs text-muted-foreground">
                Select a repair shop to update the 2025 trend lines.
              </p>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {topRepairsByTickets2025.map((repair, index) => (
                  <button
                    key={repair.repairId}
                    type="button"
                    onClick={() => setSelectedTrendRepairId(repair.repairId)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedTrendRepairId === repair.repairId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">
                        {index + 1}. {repair.repairName}
                      </span>
                      <span className="text-xs text-muted-foreground">{repair.ticketCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {repair.repairId}</p>
                  </button>
                ))}
              </div>
            </div>
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
