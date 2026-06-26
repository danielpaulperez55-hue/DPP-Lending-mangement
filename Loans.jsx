import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import CreateLoanSheet from "@/components/loans/CreateLoanSheet";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

export default function Loans() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list("-created_date", 100),
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ["borrowers"],
    queryFn: () => base44.entities.Borrower.filter({ status: "active" }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Loan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setShowCreate(false);
    },
  });

  const filtered = loans
    .filter((l) => statusFilter === "all" || l.status === statusFilter)
    .filter((l) =>
      l.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="px-5">
      <PageHeader
        title="Loans"
        subtitle={`${loans.length} total`}
        action={
          <Button
            size="sm"
            className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        }
      />

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="w-full bg-muted rounded-xl h-9">
          <TabsTrigger value="all" className="rounded-lg text-xs flex-1">All</TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg text-xs flex-1">Active</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg text-xs flex-1">Overdue</TabsTrigger>
          <TabsTrigger value="paid" className="rounded-lg text-xs flex-1">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      {loans.length > 0 && (
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
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && loans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loans yet"
          description="Create your first loan to start tracking"
          action={
            <Button
              className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Create Loan
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/loans/${loan.id}`}
                  className="block bg-card rounded-xl p-4 border border-border hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{loan.borrower_name || "Unknown"}</p>
                    <StatusBadge status={loan.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(loan.principal_amount)} · {loan.interest_rate}% · {loan.term_months}mo
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatCurrency(loan.remaining_balance)}</p>
                      <p className="text-[10px] text-muted-foreground">remaining</p>
                    </div>
                  </div>
                  {loan.remaining_balance != null && loan.total_due > 0 && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((loan.total_paid || 0) / loan.total_due) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && loans.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No loans match your filters</p>
          )}
        </div>
      )}

      <CreateLoanSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        borrowers={borrowers}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}