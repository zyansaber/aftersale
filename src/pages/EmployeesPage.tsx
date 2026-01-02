import { useEffect, useState } from "react";
import { EmployeeStats } from "@/types/ticket";
import { analyzeEmployees, loadTicketData } from "@/utils/dataParser";
import StatCard from "@/components/StatCard";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
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

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicketData().then((data) => {
      const employeeStats = analyzeEmployees(data);
      setEmployees(employeeStats);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8">Loading employee data...</div>;
  }

  const totalEmployees = employees.length;
  const totalActiveTickets = employees.reduce((sum, e) => sum + e.activeTickets, 0);
  const totalCompletedTickets = employees.reduce((sum, e) => sum + e.completedTickets, 0);
  const avgActivePerEmployee =
    totalEmployees > 0 ? (totalActiveTickets / totalEmployees).toFixed(1) : 0;

  // Prepare workload distribution data
  const workloadData = employees.slice(0, 10).map((emp) => ({
    name: emp.employeeName,
    active: emp.activeTickets,
    completed: emp.completedTickets,
  }));

  // Status distribution
  const statusData: Record<string, number> = {};
  employees.forEach((emp) => {
    Object.entries(emp.ticketsByStatus).forEach(([status, count]) => {
      statusData[status] = (statusData[status] || 0) + count;
    });
  });

  const statusChartData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Internal Employee Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Workload and performance metrics for internal staff
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          icon={Users}
          description="Active employees"
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" fill="#F59E0B" name="Active" />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Total Time</TableHead>
                <TableHead className="text-right">Avg Time/Ticket</TableHead>
                <TableHead>Top Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const topStatus = Object.entries(employee.ticketsByStatus).sort(
                  ([, a], [, b]) => b - a
                )[0];

                return (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">{employee.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.employeeId}</TableCell>
                    <TableCell className="text-right">{employee.activeTickets}</TableCell>
                    <TableCell className="text-right">{employee.completedTickets}</TableCell>
                    <TableCell className="text-right">
                      {formatTimeBreakdown(employee.totalTimeConsumed)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatTimeBreakdown(employee.avgTimePerTicket)}
                    </TableCell>
                    <TableCell>
                      {topStatus ? `${topStatus[0]} (${topStatus[1]})` : "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}