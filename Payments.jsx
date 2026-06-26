import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import DeletePaymentDialog from "@/components/payments/DeletePaymentDialog";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  });
}

const methodLabels = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Check",
  mobile_money: "Mobile Money",
  other: "Other",
};

export default function Payments() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 200),
  });

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const filtered = payments
    .filter((p) => methodFilter === "all" || p.method === methodFilter)
    .filter((p) =>
      p.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  // Group by date
  const grouped = filtered.reduce((acc, payment) => {
    const date = payment.payment_date || "unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(payment);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="px-5">
      <PageHeader
        title="Payments"
        subtitle={`${formatCurrency(totalCollected)} collected`}
      />

      <Tabs value={methodFilter} onValueChange={setMethodFilter} className="mb-4">
        <TabsList className="w-full bg-muted rounded-xl h-9 overflow-x-auto">
          <TabsTrigger value="all" className="rounded-lg text-xs flex-1">All</TabsTrigger>
          <TabsTrigger value="cash" className="rounded-lg text-xs flex-1">Cash</TabsTrigger>
          <TabsTrigger value="bank_transfer" className="rounded-lg text-xs flex-1">Bank</TabsTrigger>
          <TabsTrigger value="mobile_money" className="rounded-lg text-xs flex-1">Mobile</TabsTrigger>
        </TabsList>
      </Tabs>

      {payments.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by borrower..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card border-border"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Record payments from the loan detail page"
        />
      ) : (
        <div className="space-y-5 mb-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {date !== "unknown" ? format(new Date(date), "EEEE, MMMM d, yyyy") : "No date"}
              </p>
              <div className="space-y-2">
                {grouped[date].map((payment, i) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{payment.borrower_name || "Payment"}</p>
                        <p className="text-xs text-muted-foreground">
                          {methodLabels[payment.method] || payment.method}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-sm text-emerald-600">
                        +{formatCurrency(payment.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(payment)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && payments.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No payments match your search</p>
          )}
        </div>
      )}
      <DeletePaymentDialog payment={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}