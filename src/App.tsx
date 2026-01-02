import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DealershipsPage from "@/pages/DealershipsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import RepairsPage from "@/pages/RepairsPage";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("dealerships");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 ml-72 p-8 transition-all duration-300">
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