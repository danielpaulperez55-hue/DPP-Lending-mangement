import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, X, User, CreditCard, Calendar, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function formatCurrency(n) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DashboardSearch() {
  const [query, setQuery] = useState("");

  const { data: borrowers = [] } = useQuery({ queryKey: ["borrowers"], queryFn: () => base44.entities.Borrower.list("-created_date", 200) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list("-created_date", 200) });
  const { data: payments = [] } = useQuery({ queryKey: ["all-payments"], queryFn: () => base44.entities.Payment.list("-payment_date", 500) });

  const q = query.toLowerCase().trim();
  const matchedBorrowers = q.length >= 2 ? borrowers.filter(b =>
    b.full_name?.toLowerCase().includes(q) ||
    b.borrower_id?.toLowerCase().includes(q)
  ) : [];
  const matchedLoans = q.length >= 2 ? loans.filter(l =>
    l.loan_id?.toLowerCase().includes(q) ||
    l.borrower_name?.toLowerCase().includes(q) ||
    l.borrower_ref_id?.toLowerCase().includes(q)
  ) : [];

  const hasResults = matchedBorrowers.length > 0 || matchedLoans.length > 0;

  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by Borrower ID, Loan ID, or Name..."
          className="pl-9 pr-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {q.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-lg"
          >
            {!hasResults && (
              <div className="p-4 text-sm text-muted-foreground text-center">No results found for "{query}"</div>
            )}

            {matchedBorrowers.map((b) => {
              const bLoans = loans.filter(l => l.borrower_id === b.id);
              const bPayments = payments.filter(p => p.borrower_id === b.id);
              const totalPaid = bPayments.reduce((s, p) => s + (p.amount || 0), 0);
              const remaining = bLoans.reduce((s, l) => s + (l.remaining_balance || 0), 0);
              return (
                <div key={b.id} className="p-4 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {b.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.full_name}</p>
                      <p className="text-xs text-muted-foreground">{b.borrower_id || "No ID"} · {b.phone}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Loans</p>
                      <p className="font-bold">{bLoans.length}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-bold text-primary">{formatCurrency(remaining)}</p>
                    </div>
                  </div>
                  {bLoans.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {bLoans.map(l => (
                        <div key={l.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-2.5 py-1.5">
                          <span className="font-medium">{l.loan_id || "Loan"}</span>
                          <span>{formatCurrency(l.principal_amount)}</span>
                          <StatusBadge status={l.status} />
                          <span className="text-muted-foreground">{l.remaining_balance != null ? formatCurrency(l.remaining_balance) + " left" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {matchedLoans.filter(l => !matchedBorrowers.find(b => b.id === l.borrower_id)).map((l) => {
              const lPayments = payments.filter(p => p.loan_id === l.id);
              return (
                <div key={l.id} className="p-4 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{l.loan_id || "Loan"} · {l.borrower_name}</p>
                      <p className="text-xs text-muted-foreground">{l.payment_frequency} · {l.term_months}mo</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Principal</p>
                      <p className="font-bold">{formatCurrency(l.principal_amount)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(l.total_paid)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-bold text-primary">{formatCurrency(l.remaining_balance)}</p>
                    </div>
                  </div>
                  {lPayments.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Payment History ({lPayments.length})</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {lPayments.map(p => (
                          <div key={p.id} className="flex justify-between text-xs bg-muted/50 rounded px-2 py-1">
                            <span>{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : ""}</span>
                            <span className="font-medium text-emerald-600">+{formatCurrency(p.amount)}</span>
                            <span className="text-muted-foreground capitalize">{p.method}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}