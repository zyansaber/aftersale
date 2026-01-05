import { useMemo, useState } from "react";
import { EmployeeStats } from "@/types/ticket";
import { analyzeEmployees, filterTicketsByFirstLevelStatus } from "@/utils/dataParser";
import StatCard from "@/components/StatCard";
import { Users, CheckCircle, Clock, AlertCircle, UserSearch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTicketStatusMapping } from "@/hooks/useTicketStatusMapping";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parse as parseDate, differenceInCalendarDays } from "date-fns";
import { TicketData } from "@/types/ticket";

type TicketWithMeta = {
  ticketId: string;
  createdOn: Date;
  ageDays: number;
  status: string;
  name: string;
};

const AGE_BUCKETS = [
  { label: "0-30", min: 0, max: 30 },
  { label: "30-60", min: 30, max: 60 },
  { label: "60-90", min: 60, max: 90 },
  { label: "90-180", min: 90, max: 180 },
  { label: "180+", min: 180, max: Infinity },
] as const;

function parseTicketDate(raw: string) {
  if (!raw) return new Date("");
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  return parseDate(raw, "dd/MM/yyyy", new Date());
}

export default function EmployeesPage() {
  const { data, isLoading, error } = useVisibleTickets({ applyEmployeeVisibility: false });
  const mappingQuery = useTicketStatusMapping();
  const [hideClosed, setHideClosed] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusDialog, setStatusDialog] = useState<{ status: string; tickets: TicketWithMeta[] } | null>(null);
  const [ageDialog, setAgeDialog] = useState<{ range: string; tickets: TicketWithMeta[] } | null>(null);

  const filteredTickets = useMemo(() => {
    if (!data) return undefined;
    return hideClosed
      ? filterTicketsByFirstLevelStatus(data, mappingQuery.data, {
          excludedFirstLevelStatuses: ["Closed"],
        })
      : data;
  }, [data, hideClosed, mappingQuery.data]);

  const employees = useMemo<EmployeeStats[]>(() => {
    if (!filteredTickets) return [];
    return analyzeEmployees(filteredTickets);
  }, [filteredTickets]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (employee) =>
        employee.employeeName.toLowerCase().includes(term) ||
        employee.employeeId.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    employees.forEach((emp) => {
      Object.keys(emp.ticketsByStatus).forEach((status) => statuses.add(status));
    });
    return Array.from(statuses).sort();
  }, [employees]);

  const workloadData = useMemo(() => {
    return employees.map((emp) => {
      const value =
        statusFilter === "all"
          ? emp.activeTickets
          : emp.ticketsByStatus[statusFilter] ?? 0;
      return {
        name: emp.employeeName,
        value,
      };
    });
  }, [employees, statusFilter]);

  const selectedEmployee = useMemo(
    () =>
      selectedEmployeeId === "all"
        ? undefined
        : employees.find((emp) => emp.employeeId === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const selectedEmployeeTickets = useMemo<TicketWithMeta[]>(() => {
    if (!filteredTickets || selectedEmployeeId === "all") return [];

    return Object.entries(filteredTickets.c4cTickets_test.tickets)
      .filter(([, entry]) => entry.roles["40"]?.InvolvedPartyBusinessPartnerID === selectedEmployeeId)
      .map(([ticketId, entry]) => {
        const createdOn = parseTicketDate(entry.ticket.CreatedOn);
        const ageDays = Number.isNaN(createdOn.getTime())
          ? 0
          : differenceInCalendarDays(new Date(), createdOn);
        return {
          ticketId,
          createdOn,
          ageDays,
          status: entry.ticket.TicketStatusText,
          name: entry.ticket.TicketName || ticketId,
        };
      });
  }, [filteredTickets, selectedEmployeeId]);

  const statusTicketMap = useMemo(() => {
    return selectedEmployeeTickets.reduce<Record<string, TicketWithMeta[]>>((acc, ticket) => {
      const key = ticket.status || "Unknown";
      acc[key] = acc[key] ?? [];
      acc[key].push(ticket);
      return acc;
    }, {});
  }, [selectedEmployeeTickets]);

  const ageRangeData = useMemo(() => {
    const ticketsByRange = AGE_BUCKETS.reduce<Record<string, TicketWithMeta[]>>(
      (acc, bucket) => ({ ...acc, [bucket.label]: [] }),
      {}
    );

    selectedEmployeeTickets.forEach((ticket) => {
      const bucket = AGE_BUCKETS.find((range) => ticket.ageDays >= range.min && ticket.ageDays < range.max);
      if (bucket) {
        ticketsByRange[bucket.label].push(ticket);
      }
    });

    const chartData = AGE_BUCKETS.map((bucket) => ({
      range: bucket.label,
      count: ticketsByRange[bucket.label].length,
    }));

    return { ticketsByRange, chartData };
  }, [selectedEmployeeTickets]);

  const selectedEmployeeStatusData = useMemo(() => {
    if (!selectedEmployee) return [];
    return Object.entries(selectedEmployee.ticketsByStatus)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedEmployee]);

  if (isLoading || mappingQuery.isLoading) {
    return <div className="p-8">Loading employee data...</div>;
  }

  if (error || mappingQuery.error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const mappingMessage =
      mappingQuery.error instanceof Error ? mappingQuery.error.message : "Mapping error";
    return (
      <div className="p-8 text-destructive">
        Failed to load employee data:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{message}</li>
          <li>{mappingMessage}</li>
        </ul>
      </div>
    );
  }

  const totalEmployees = employees.length;
  const totalActiveTickets = employees.reduce((sum, e) => sum + e.activeTickets, 0);
  const totalClosedTickets = employees.reduce((sum, e) => sum + e.closedTickets, 0);
  const avgActivePerEmployee =
    totalEmployees > 0 ? (totalActiveTickets / totalEmployees).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Internal Employee Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Focus on non-closed work by admin-visible employees, with quick filtering and status drill-downs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          icon={Users}
          description="Visible employees"
        />
        <StatCard
          title="Active Tickets"
          value={totalActiveTickets}
          icon={AlertCircle}
          description="Not in Closed status"
        />
        <StatCard
          title="Closed Tickets"
          value={totalClosedTickets}
          icon={CheckCircle}
          description="Marked as closed"
        />
        <StatCard
          title="Avg Active/Employee"
          value={avgActivePerEmployee}
          icon={Clock}
          description="Average workload"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="hide-closed-first-level"
              checked={hideClosed}
              onCheckedChange={setHideClosed}
              disabled={mappingQuery.isLoading}
            />
            <Label htmlFor="hide-closed-first-level" className="text-sm font-medium">
              Hide tickets with first-level status “Closed” (mapping)
            </Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee-search">Search employees</Label>
              <div className="relative">
                <UserSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="employee-search"
                  placeholder="Search by name or ID"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-select">Focus on an employee</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(value) => setSelectedEmployeeId(value)}
              >
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Choose an employee to view status mix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {filteredEmployees.map((employee) => (
                    <SelectItem key={employee.employeeId} value={employee.employeeId}>
                      {employee.employeeName} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-select">Filter by status (text)</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger id="status-select">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Employee Workload Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ticket counts by status for {employees.length} employees
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#2563EB" name={statusFilter === "all" ? "Active tickets" : statusFilter}>
                  <LabelList dataKey="value" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {selectedEmployee && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedEmployee.employeeName} — Ticket Status Mix</CardTitle>
              <p className="text-sm text-muted-foreground">
                Status counts for the selected employee
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={selectedEmployeeStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={90} />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#3B82F6"
                    name="Tickets"
                    className="cursor-pointer"
                    onClick={(data) => {
                      const statusName = (data?.name as string) ?? "";
                      setStatusDialog({
                        status: statusName,
                        tickets: statusTicketMap[statusName] ?? [],
                      });
                    }}
                  >
                    <LabelList dataKey="value" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ticket counts by status for {selectedEmployee.employeeName}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployeeStatusData.map((status) => (
                    <TableRow
                      key={status.name}
                      className="cursor-pointer"
                      onClick={() =>
                        setStatusDialog({
                          status: status.name,
                          tickets: statusTicketMap[status.name] ?? [],
                        })
                      }
                    >
                      <TableCell>{status.name}</TableCell>
                      <TableCell className="text-right">{status.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedEmployee.employeeName} — Ticket Age Ranges</CardTitle>
            <p className="text-sm text-muted-foreground">
              Days since CreatedOn for tickets in view (scoped filters applied).
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={ageRangeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Tickets"
                  fill="#10b981"
                  className="cursor-pointer"
                  onClick={(data) => {
                    const rangeLabel = (data?.range as string) ?? "";
                    setAgeDialog({
                      range: rangeLabel,
                      tickets: ageRangeData.ticketsByRange[rangeLabel] ?? [],
                    });
                  }}
                >
                  <LabelList dataKey="count" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Status: {statusDialog?.status ?? ""}</DialogTitle>
            <DialogDescription>
              Tickets for {selectedEmployee?.employeeName} matching this status.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {(statusDialog?.tickets ?? []).map((ticket) => (
              <div key={ticket.ticketId} className="rounded-md border p-3 shadow-sm">
                <p className="text-sm font-semibold">{ticket.name}</p>
                <p className="text-xs text-muted-foreground">ID: {ticket.ticketId}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {Number.isNaN(ticket.createdOn.getTime()) ? "Unknown" : ticket.createdOn.toDateString()}
                </p>
              </div>
            ))}
            {(statusDialog?.tickets.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No tickets in this status.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ageDialog} onOpenChange={() => setAgeDialog(null)}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Age range: {ageDialog?.range ?? ""}</DialogTitle>
            <DialogDescription>
              Tickets for {selectedEmployee?.employeeName} aged within this range (days since CreatedOn).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {(ageDialog?.tickets ?? []).map((ticket) => (
              <div key={ticket.ticketId} className="rounded-md border p-3 shadow-sm">
                <p className="text-sm font-semibold">{ticket.name}</p>
                <p className="text-xs text-muted-foreground">ID: {ticket.ticketId}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {Number.isNaN(ticket.createdOn.getTime()) ? "Unknown" : ticket.createdOn.toDateString()}
                </p>
                <p className="text-xs text-muted-foreground">Age: {ticket.ageDays} days</p>
              </div>
            ))}
            {(ageDialog?.tickets.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No tickets in this age range.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
