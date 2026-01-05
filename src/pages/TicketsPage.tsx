import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/StatCard";
import { AlertCircle, Clock, FileWarning, Ticket as TicketIcon } from "lucide-react";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTicketStatusMapping } from "@/hooks/useTicketStatusMapping";
import { filterTicketsByFirstLevelStatus } from "@/utils/dataParser";

type ChartDatum = { name: string; value: number };

const formatMonthKey = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
const DEFAULT_START_MONTH = "2025-01";
const DEFAULT_END_MONTH = formatMonthKey(new Date());

const parseMonthInput = (value?: string | null) => {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;

  const baseDate = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(baseDate),
    end: endOfMonth(baseDate),
  };
};

export default function TicketsPage() {
  const { data, isLoading, error } = useVisibleTickets();
  const mappingQuery = useTicketStatusMapping();
  const [startMonth, setStartMonth] = useState(DEFAULT_START_MONTH);
  const [endMonth, setEndMonth] = useState(DEFAULT_END_MONTH);
  const [statusPage, setStatusPage] = useState(1);
  const [typePage, setTypePage] = useState(1);
  const [hideClosed, setHideClosed] = useState(true);
  const PAGE_SIZE = 50;

  const filteredByFirstLevel = useMemo(() => {
    if (!data) return undefined;
    return hideClosed
      ? filterTicketsByFirstLevelStatus(data, mappingQuery.data, {
          excludedFirstLevelStatuses: ["Closed"],
        })
      : data;
  }, [data, hideClosed, mappingQuery.data]);

  const tickets = useMemo(() => {
    if (!filteredByFirstLevel) return [];
    return Object.values(filteredByFirstLevel.c4cTickets_test.tickets);
  }, [filteredByFirstLevel]);

  const ticketsWithDates = useMemo(
    () =>
      tickets.map((entry) => {
        const createdDate = parse(entry.ticket.CreatedOn, "dd/MM/yyyy", new Date());
        return {
          entry,
          createdDate: Number.isNaN(createdDate.getTime()) ? null : createdDate,
        };
      }),
    [tickets]
  );

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    ticketsWithDates.forEach((ticket) => {
      if (ticket.createdDate) {
        months.add(formatMonthKey(ticket.createdDate));
      }
    });
    return Array.from(months).sort();
  }, [ticketsWithDates]);

  const { filteredTicketEntries, filteredTicketDates, activeRange } = useMemo(() => {
    const parsedStart = parseMonthInput(startMonth) ?? parseMonthInput(DEFAULT_START_MONTH);
    const parsedEnd = parseMonthInput(endMonth) ?? parseMonthInput(DEFAULT_END_MONTH);

    let startDate = parsedStart?.start ?? startOfMonth(new Date(2025, 0, 1));
    let endDate = parsedEnd?.end ?? endOfMonth(new Date());

    // Ensure the range is valid
    if (startDate > endDate) {
      startDate = parsedEnd?.start ?? startDate;
      endDate = parsedEnd?.end ?? endDate;
    }

    const filtered = ticketsWithDates.filter(
      (ticket) =>
        ticket.createdDate !== null &&
        ticket.createdDate >= startDate &&
        ticket.createdDate <= endDate
    );

    return {
      filteredTicketEntries: filtered.map((item) => item.entry),
      filteredTicketDates: filtered,
      activeRange: { start: startDate, end: endDate },
    };
  }, [endMonth, startMonth, ticketsWithDates]);

  useEffect(() => {
    setStatusPage(1);
    setTypePage(1);
  }, [filteredTicketEntries.length]);

  const {
    totalTickets,
    unapprovedCount,
    unrespondedCount,
    statusData,
    typeData,
    creationTrend,
    dateRangeLabel,
  } = useMemo(() => {
    const total = filteredTicketEntries.length;
    let unapproved = 0;
    let unresponded = 0;

    const statusCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const creationCount: Record<string, number> = {};
    const creationDates: Date[] = [];
    const hiddenStatuses = ["repairer invoiced processed", "calins closed"];

    filteredTicketEntries.forEach((entry) => {
      const ticket = entry.ticket;
      if (!ticket.ApprovalNumber) unapproved += 1;
      if (!ticket.Responded) unresponded += 1;

      statusCount[ticket.TicketStatusText] = (statusCount[ticket.TicketStatusText] || 0) + 1;
      typeCount[ticket.TicketTypeText] = (typeCount[ticket.TicketTypeText] || 0) + 1;
    });

    filteredTicketDates.forEach((ticket) => {
      if (ticket.createdDate) {
        creationDates.push(ticket.createdDate);
        const monthKey = formatMonthKey(ticket.createdDate);
        creationCount[monthKey] = (creationCount[monthKey] || 0) + 1;
      }
    });

    const statusList: ChartDatum[] = Object.entries(statusCount)
      .filter(([name]) => !hiddenStatuses.some((hidden) => name.toLowerCase().includes(hidden)))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const typeList: ChartDatum[] = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const trendList: ChartDatum[] = Object.entries(creationCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const earliest = creationDates.length
      ? new Date(Math.min(...creationDates.map((d) => d.getTime())))
      : null;
    const latest = creationDates.length
      ? new Date(Math.max(...creationDates.map((d) => d.getTime())))
      : null;

    const rangeLabel =
      earliest && latest
        ? `${earliest.toISOString().slice(0, 10)} → ${latest.toISOString().slice(0, 10)}`
        : `${activeRange.start.toISOString().slice(0, 10)} → ${activeRange.end
            .toISOString()
            .slice(0, 10)}`;

    return {
      totalTickets: total,
      unapprovedCount: unapproved,
      unrespondedCount: unresponded,
      statusData: statusList,
      typeData: typeList,
      creationTrend: trendList,
      dateRangeLabel: rangeLabel,
    };
  }, [activeRange.end, activeRange.start, filteredTicketDates, filteredTicketEntries]);

  const paginatedStatus = useMemo(() => {
    const start = (statusPage - 1) * PAGE_SIZE;
    return statusData.slice(start, start + PAGE_SIZE);
  }, [statusData, statusPage]);

  const paginatedTypes = useMemo(() => {
    const start = (typePage - 1) * PAGE_SIZE;
    return typeData.slice(start, start + PAGE_SIZE);
  }, [typeData, typePage]);

  if (isLoading || mappingQuery.isLoading) {
    return <div className="p-8">Loading ticket analytics...</div>;
  }

  if (error || mappingQuery.error) {
    const ticketMessage = error instanceof Error ? error.message : "Unknown error";
    const mappingMessage =
      mappingQuery.error instanceof Error ? mappingQuery.error.message : "Mapping error";
    return (
      <div className="p-8 text-destructive">
        Failed to load ticket analytics:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{ticketMessage}</li>
          <li>{mappingMessage}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Ticket Overview</h2>
        <p className="text-muted-foreground mt-2">
          High-level analysis of ticket approvals, responses, status distribution, and creation
          trends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Created Date Range</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a month range to filter all ticket analytics. Defaults to January 2025 through
            the current month.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Switch
              id="hide-closed"
              checked={hideClosed}
              onCheckedChange={setHideClosed}
              disabled={mappingQuery.isLoading}
            />
            <Label htmlFor="hide-closed" className="text-sm font-medium">
              Hide tickets with first-level status “Closed” (mapping)
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-month">Start month</Label>
              <Input
                id="start-month"
                type="month"
                value={startMonth}
                onChange={(event) => setStartMonth(event.target.value)}
                list="month-options"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-month">End month</Label>
              <Input
                id="end-month"
                type="month"
                value={endMonth}
                onChange={(event) => setEndMonth(event.target.value)}
                list="month-options"
              />
            </div>
          </div>
          <datalist id="month-options">
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-month">End month</Label>
              <Input
                id="end-month"
                type="month"
                value={endMonth}
                onChange={(event) => setEndMonth(event.target.value)}
                list="month-options"
              />
            </div>
          </div>
          <datalist id="month-options">
            {monthOptions.map((month) => (
              <option key={month} value={month} />
            ))}
          </datalist>
          <p className="text-sm text-muted-foreground mt-3">
            Showing tickets from {activeRange.start.toISOString().slice(0, 10)} to{" "}
            {activeRange.end.toISOString().slice(0, 10)}.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={TicketIcon}
          description="Tickets currently visible"
        />
        <StatCard
          title="Pending Approval"
          value={unapprovedCount}
          icon={FileWarning}
          description="Missing ApprovalNumber"
        />
        <StatCard
          title="Awaiting Response"
          value={unrespondedCount}
          icon={AlertCircle}
          description="Responded is false"
        />
        <StatCard
          title="Created Date Range"
          value={dateRangeLabel}
          icon={Clock}
          description="Earliest → Latest"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creation Trend (by month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={creationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paginatedStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>
                Page {statusPage} / {Math.max(1, Math.ceil(statusData.length / PAGE_SIZE))}
              </span>
              <div className="space-x-2">
                <button
                  className="underline disabled:text-slate-300"
                  disabled={statusPage === 1}
                  onClick={() => setStatusPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <button
                  className="underline disabled:text-slate-300"
                  disabled={statusPage === Math.max(1, Math.ceil(statusData.length / PAGE_SIZE))}
                  onClick={() =>
                    setStatusPage((prev) =>
                      Math.min(Math.max(1, Math.ceil(statusData.length / PAGE_SIZE)), prev + 1)
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={paginatedTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#F59E0B" name="Count" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>
              Page {typePage} / {Math.max(1, Math.ceil(typeData.length / PAGE_SIZE))}
            </span>
            <div className="space-x-2">
              <button
                className="underline disabled:text-slate-300"
                disabled={typePage === 1}
                onClick={() => setTypePage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <button
                className="underline disabled:text-slate-300"
                disabled={typePage === Math.max(1, Math.ceil(typeData.length / PAGE_SIZE))}
                onClick={() =>
                  setTypePage((prev) =>
                    Math.min(Math.max(1, Math.ceil(typeData.length / PAGE_SIZE)), prev + 1)
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
