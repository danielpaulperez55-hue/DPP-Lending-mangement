import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Landmark, CreditCard, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/borrowers", icon: Users, label: "Borrowers" },
  { path: "/loans", icon: Landmark, label: "Loans" },
  { path: "/payments", icon: CreditCard, label: "Payments" },
  { path: "/settings", icon: SettingsIcon, label: "Settings" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2 min-w-[64px]"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 w-8 h-1 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}