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

export default function EmployeesPage() {
  const { data, isLoading, error } = useVisibleTickets({ applyEmployeeVisibility: true });
  const mappingQuery = useTicketStatusMapping();
  const [hideClosed, setHideClosed] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

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

  const workloadData = useMemo(
    () =>
      employees.slice(0, 12).map((emp) => ({
        name: emp.employeeName,
        active: emp.activeTickets,
        completed: emp.completedTickets,
      })),
    [employees]
  );

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.employeeId === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

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
  const totalCompletedTickets = employees.reduce((sum, e) => sum + e.completedTickets, 0);
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
          description="Currently in progress"
        />
        <StatCard
          title="Completed Tickets"
          value={totalCompletedTickets}
          icon={CheckCircle}
          description="Successfully closed"
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
                  <SelectItem value="">All employees</SelectItem>
                  {filteredEmployees.map((employee) => (
                    <SelectItem key={employee.employeeId} value={employee.employeeId}>
                      {employee.employeeName} ({employee.employeeId})
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
              Active and completed ticket counts for {employees.length} visible employees
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
                <Bar dataKey="active" fill="#F59E0B" name="Active">
                  <LabelList dataKey="active" position="top" />
                </Bar>
                <Bar dataKey="completed" fill="#10B981" name="Completed">
                  <LabelList dataKey="completed" position="top" />
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
                  <Bar dataKey="value" fill="#3B82F6" name="Tickets">
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
                    <TableRow key={status.name}>
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
    </div>
  );
}
