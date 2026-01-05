import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import DealershipsPage from "@/pages/DealershipsPage";
import DealerInsightPage from "@/pages/DealerInsightPage";
import EmployeesPage from "@/pages/EmployeesPage";
import RepairsPage from "@/pages/RepairsPage";
import AdminPage from "@/pages/AdminPage";
import TicketsPage from "@/pages/TicketsPage";
import MappingPage from "@/pages/MappingPage";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const activeTab = location.pathname.split("/")[1] || "admin";
  const hideSidebar = location.pathname.startsWith("/dealer-insights");

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!hideSidebar && <Sidebar activeTab={activeTab} />}
      <main className={cn("flex-1 p-8 transition-all duration-300", hideSidebar ? "" : "ml-72")}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/mapping" element={<MappingPage />} />
          <Route path="/dealerships" element={<DealershipsPage />} />
          <Route path="/dealer-insights/:dealerId" element={<DealerInsightPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/repairs" element={<RepairsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
