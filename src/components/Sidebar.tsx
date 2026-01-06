import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Wrench, ChevronLeft, ChevronRight, Shield, Ticket, MapPin, BarChart2, TrendingUp, FileText, FolderKanban } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  activeTab: string;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: "tickets", label: "Tickets", icon: Ticket, to: "/tickets" },
    { id: "employees", label: "Internal Employees", icon: Users, to: "/employees" },
    { id: "repairs", label: "Repairs", icon: Wrench, to: "/repairs" },
    { id: "data-explorer", label: "Data Explorer", icon: FileText, to: "/data-explorer" },
    { id: "claim-vs-closed", label: "Claim vs Closed", icon: TrendingUp, to: "/claim-vs-closed" },
    { id: "aged-claim-report", label: "Aged Claim Report", icon: BarChart2, to: "/aged-claim-report" },
    { id: "aftercare-guides", label: "Aftercare Guides", icon: FolderKanban, to: "/aftercare-guides" },
    { id: "mapping", label: "Mapping", icon: MapPin, to: "/mapping" },
    { id: "admin", label: "Admin", icon: Shield, to: "/admin" },
  ];

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 border-r border-slate-800",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && <h1 className="text-xl font-bold">After-Sales</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink key={tab.id} to={tab.to} className="block">
              <Button
                variant={activeTab === tab.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-white hover:bg-slate-800",
                  activeTab === tab.id && "bg-slate-800",
                  collapsed && "justify-center"
                )}
              >
                <Icon className={cn("h-5 w-5", !collapsed && "mr-2")} />
                {!collapsed && <span>{tab.label}</span>}
              </Button>
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400">© 2024 After-Sales Dashboard</p>
        </div>
      )}
    </div>
  );
}
