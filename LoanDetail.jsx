import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Percent, Clock, CreditCard, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import RecordPaymentSheet from "@/components/payments/RecordPaymentSheet";
import DeletePaymentDialog from "@/components/payments/DeletePaymentDialog";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  });
}

export default function LoanDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const list = await base44.entities.Loan.filter({ id });
      return list[0];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["loan-payments", id],
    queryFn: () => base44.entities.Payment.filter({ loan_id: id }),
  });

  const paymentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Payment.create(data);
      const newTotalPaid = (loan.total_paid || 0) + data.amount;
      const newBalance = (loan.total_due || 0) - newTotalPaid;
      const newStatus = newBalance <= 0 ? "paid" : loan.status;
      await base44.entities.Loan.update(loan.id, {
        total_paid: newTotalPaid,
        remaining_balance: Math.max(0, newBalance),
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments", id] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setShowPayment(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-muted-foreground">Loan not found</p>
        <Link to="/loans" className="text-accent text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const progress = loan.total_due > 0 ? ((loan.total_paid || 0) / loan.total_due) * 100 : 0;

  return (
    <div className="px-5">
      <div className="pt-12 pb-4">
        <Link to="/loans" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Loans
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-primary-foreground rounded-2xl p-5 mb-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-80">{loan.borrower_name}</p>
            <StatusBadge status={loan.status} />
          </div>
          <p className="text-3xl font-heading font-bold">{formatCurrency(loan.principal_amount)}</p>
          <p className="text-xs opacity-60 mt-1">Principal Amount</p>

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="opacity-70">Repayment Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-accent rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="w-3 h-3" />
            <span className="text-xs">Interest Rate</span>
          </div>
          <p className="font-semibold text-sm">{loan.interest_rate}% monthly</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Term</span>
          </div>
          <p className="font-semibold text-sm">{loan.term_months} months</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CreditCard className="w-3 h-3" />
            <span className="text-xs">Monthly Payment</span>
          </div>
          <p className="font-semibold text-sm">{formatCurrency(loan.monthly_payment)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Start Date</span>
          </div>
          <p className="font-semibold text-sm">
            {loan.start_date ? format(new Date(loan.start_date), "MMM d, yyyy") : "N/A"}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Total Due</span>
          <span className="font-semibold text-sm">{formatCurrency(loan.total_due)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Total Paid</span>
          <span className="font-semibold text-sm text-emerald-600">{formatCurrency(loan.total_paid)}</span>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Remaining</span>
            <span className="font-bold">{formatCurrency(loan.remaining_balance)}</span>
          </div>
        </div>
      </div>

      {loan.status !== "paid" && (
        <Button
          className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 h-12 mb-6"
          onClick={() => setShowPayment(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      )}

      <h3 className="text-base font-heading font-semibold mb-3">Payment History ({payments.length})</h3>
      <div className="space-y-2 mb-8">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
        ) : (
          payments
            .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
            .map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between bg-card rounded-xl p-4 border border-border"
              >
                <div>
                  <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {payment.payment_date ? format(new Date(payment.payment_date), "MMM d, yyyy") : "No date"} · {payment.method?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground max-w-[120px] truncate">{payment.notes}</p>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(payment)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
        )}
      </div>

      <RecordPaymentSheet
        open={showPayment}
        onOpenChange={setShowPayment}
        loan={loan}
        onSubmit={(data) => paymentMutation.mutate(data)}
        isLoading={paymentMutation.isPending}
      />

      <DeletePaymentDialog payment={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}