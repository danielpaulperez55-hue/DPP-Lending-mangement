import React from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";

function formatCurrency(n) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function UpcomingDueDates({ loans }) {
  const today = new Date();
  const upcoming = loans
    .filter(l => l.status === "active" && l.next_payment_date)
    .map(l => ({ ...l, daysUntil: differenceInDays(parseISO(l.next_payment_date), today) }))
    .filter(l => l.daysUntil >= 0 && l.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const overdue = loans.filter(l => l.status === "overdue").slice(0, 5);

  return (
    <div className="space-y-4 mb-6">
      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" /> Upcoming Due Dates
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No upcoming dues in the next 30 days</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(l => (
              <div key={l.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{l.borrower_name}</p>
                  <p className="text-xs text-muted-foreground">{l.next_payment_date ? format(parseISO(l.next_payment_date), "MMM d, yyyy") : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(l.monthly_payment)}</p>
                  <p className={`text-xs font-medium ${l.daysUntil <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                    {l.daysUntil === 0 ? "Due today" : `${l.daysUntil}d left`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" /> Overdue Accounts
          </h2>
          <div className="space-y-2">
            {overdue.map(l => (
              <div key={l.id} className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{l.borrower_name}</p>
                  <p className="text-xs text-muted-foreground">{l.loan_id || "Loan"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{formatCurrency(l.remaining_balance)}</p>
                  <StatusBadge status="overdue" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}