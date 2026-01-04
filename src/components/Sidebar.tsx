import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Users, Wrench, ChevronLeft, ChevronRight, Shield, Ticket } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: "admin", label: "Admin", icon: Shield },
    { id: "tickets", label: "Tickets", icon: Ticket },
    { id: "dealerships", label: "Dealerships", icon: Building2 },
    { id: "employees", label: "Internal Employees", icon: Users },
    { id: "repairs", label: "Repairs", icon: Wrench },
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
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-white hover:bg-slate-800",
                activeTab === tab.id && "bg-slate-800",
                collapsed && "justify-center"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className={cn("h-5 w-5", !collapsed && "mr-2")} />
              {!collapsed && <span>{tab.label}</span>}
            </Button>
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
