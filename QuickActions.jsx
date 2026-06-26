import React from "react";
import { UserPlus, PlusCircle, Wallet, ArrowDownCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function QuickActions({ onPayment }) {
  const actions = [
    { icon: UserPlus, label: "Borrow Link", color: "bg-primary text-primary-foreground", to: "/borrow" },
    { icon: PlusCircle, label: "New Loan", color: "bg-secondary text-secondary-foreground", to: "/loans" },
    { icon: Wallet, label: "Payment", color: "bg-emerald-500 text-white", onClick: onPayment },
  ];

  const handleAction = (action) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.scrollTo) {
      const el = document.getElementById(action.scrollTo);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <TooltipProvider>
      <div className="mb-6">
        <h2 className="text-sm font-heading font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => {
          const ActionContent = (
            <div className={`${a.color} rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer`}>
              <a.icon className="w-5 h-5" />
              <span className="text-xs font-medium text-center leading-tight">{a.label}</span>
            </div>
          );

          if (a.to) {
            return (
              <Link key={a.label} to={a.to}>
                {ActionContent}
              </Link>
            );
          }

          if (a.description) {
            return (
              <Tooltip key={a.label}>
                <TooltipTrigger asChild>
                  <div onClick={() => handleAction(a)}>
                    {ActionContent}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{a.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={a.label} onClick={() => handleAction(a)}>
              {ActionContent}
            </div>
          );
        })}
      </div>
    </div>
    </TooltipProvider>
  );
}