import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck } from "lucide-react";
import { summarizeEmployees } from "@/utils/dataParser";
import { useTicketData } from "@/hooks/useTicketData";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { EntityVisibilityCategory } from "@/types/ticket";

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default function AdminPage() {
  const { data, isLoading, error } = useTicketData();
  const { data: settings, isLoading: settingsLoading, error: settingsError, toggleVisibility } =
    useDisplaySettings();

  const employees = useMemo(() => (data ? summarizeEmployees(data) : []), [data]);

  const handleToggle = (category: EntityVisibilityCategory, entityId: string, current?: boolean) => {
    toggleVisibility(category, entityId, !(current ?? true));
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading admin data...
      </div>
    );
  }

  if (error || settingsError) {
    const message =
      (error instanceof Error && error.message) ||
      (settingsError instanceof Error && settingsError.message) ||
      "Unknown error";
    return <div className="p-8 text-destructive">Failed to load admin data: {message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">Admin Visibility Control</h2>
        <p className="text-muted-foreground">
          Toggle which internal employees (role 40) appear on the Internal Employee Analysis page.
          The selections are saved in Firebase.
        </p>
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Visibility caching
          </AlertTitle>
          <AlertDescription>
            Changes are cached via React Query and persisted via a single Firebase write per toggle.
          </AlertDescription>
        </Alert>
      </div>

      <Section
        title="Internal Employees"
        description="Control which employees appear in the Employees analysis."
      >
        <div className="space-y-3">
          {employees.map((employee) => {
            const isVisible = settings?.employees[employee.employeeId] ?? true;
            return (
              <div
                key={employee.employeeId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {employee.employeeName}{" "}
                    <span className="text-xs text-muted-foreground">({employee.employeeId})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tickets linked: {employee.count}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`employee-${employee.employeeId}`} className="text-sm">
                    {isVisible ? "Visible" : "Hidden"}
                  </Label>
                  <Switch
                    id={`employee-${employee.employeeId}`}
                    checked={isVisible}
                    onCheckedChange={() => handleToggle("employees", employee.employeeId, isVisible)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
