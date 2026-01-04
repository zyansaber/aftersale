import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DealershipsPage from "@/pages/DealershipsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import RepairsPage from "@/pages/RepairsPage";
import AdminPage from "@/pages/AdminPage";
import TicketsPage from "@/pages/TicketsPage";
import MappingPage from "@/pages/MappingPage";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("admin");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 ml-72 p-8 transition-all duration-300">
            {activeTab === "admin" && <AdminPage />}
            {activeTab === "tickets" && <TicketsPage />}
            {activeTab === "mapping" && <MappingPage />}
            {activeTab === "dealerships" && <DealershipsPage />}
            {activeTab === "employees" && <EmployeesPage />}
            {activeTab === "repairs" && <RepairsPage />}
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
