import React from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Target,
  Scale,
  CheckSquare,
  Dumbbell,
  Activity,
  HelpCircle,
  Home,
} from "lucide-react";

interface SidebarProps {
  activeItem: string;
  onItemClick: (key: string) => void;
}

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "lifts", label: "Lifts", icon: Target },
  { key: "training", label: "Training", icon: Activity },
  { key: "weight", label: "Weight", icon: Scale },
  { key: "equipment", label: "Equipment", icon: CheckSquare },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "help", label: "Help", icon: HelpCircle },
];

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  return (
    <aside className="bg-gray-800 border-r border-gray-700 h-full w-16 sm:w-64 flex flex-col">
      <nav className="flex-1 px-2 py-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.key;
          
          return (
            <Button
              key={item.key}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start text-left ${
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
              onClick={() => onItemClick(item.key)}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3 hidden sm:block">{item.label}</span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
