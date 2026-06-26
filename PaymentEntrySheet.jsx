import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import DeletePaymentDialog from "@/components/payments/DeletePaymentDialog";

function fmt(n) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const paymentTypeLabels = {
  principal_interest: "Principal + Interest",
  interest_only: "Interest Only",
  principal_only: "Principal Only",
};

export default function PaymentEntrySheet({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [borrowerId, setBorrowerId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    payment_type: "principal_interest",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    method: "cash",
    notes: "",
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ["borrowers"],
    queryFn: () => base44.entities.Borrower.list("-created_date", 200),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list("-created_date", 200),
  });

  const borrowerLoans = loans.filter((l) => l.borrower_id === borrowerId && l.status !== "paid");
  const selectedLoan = borrowerLoans.find((l) => l.id === loanId) || borrowerLoans[0];

  const { data: loanPayments = [] } = useQuery({
    queryKey: ["loan-payments-sheet", selectedLoan?.id],
    queryFn: () => selectedLoan ? base44.entities.Payment.filter({ loan_id: selectedLoan.id }) : [],
    enabled: !!selectedLoan,
  });

  // Loan detail calculations
  const principal = selectedLoan?.principal_amount || 0;
  const monthlyRate = (selectedLoan?.interest_rate || 0) / 100;
  const monthlyInterest = principal * monthlyRate;
  const totalInterest = selectedLoan?.interest_amount || (monthlyInterest * (selectedLoan?.term_value || selectedLoan?.term_months || 1));
  const outstandingBalance = selectedLoan ? Math.max(0, (selectedLoan.total_due || 0) - (selectedLoan.total_paid || 0)) : 0;
  const interestPaidSoFar = selectedLoan?.interest_paid || 0;
  const remainingInterest = Math.max(0, totalInterest - interestPaidSoFar);
  const principalPaidSoFar = selectedLoan?.principal_paid || 0;
  const remainingPrincipal = Math.max(0, principal - principalPaidSoFar);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);

      let principalPortion = 0;
      let interestPortion = 0;

      if (form.payment_type === "interest_only") {
        interestPortion = amount;
      } else if (form.payment_type === "principal_only") {
        principalPortion = amount;
      } else {
        interestPortion = Math.min(monthlyInterest, amount);
        principalPortion = amount - interestPortion;
      }

      await base44.entities.Payment.create({
        loan_id: selectedLoan.id,
        borrower_id: selectedLoan.borrower_id,
        borrower_name: selectedLoan.borrower_name,
        amount,
        payment_date: form.payment_date,
        method: form.method,
        payment_type: form.payment_type,
        principal_portion: principalPortion,
        interest_portion: interestPortion,
        notes: form.notes,
      });

      const newTotalPaid = (selectedLoan.total_paid || 0) + amount;
      const newPrincipalPaid = (selectedLoan.principal_paid || 0) + principalPortion;
      const newInterestPaid = (selectedLoan.interest_paid || 0) + interestPortion;
      const newBalance = Math.max(0, (selectedLoan.total_due || 0) - newTotalPaid);
      const newStatus = newBalance <= 0 ? "paid" : selectedLoan.status;

      await base44.entities.Loan.update(selectedLoan.id, {
        total_paid: newTotalPaid,
        principal_paid: newPrincipalPaid,
        interest_paid: newInterestPaid,
        remaining_balance: newBalance,
        status: newStatus,
      });

      await base44.entities.AuditLog.create({
        action: "RECORD_PAYMENT",
        entity_type: "Loan",
        entity_id: selectedLoan.id,
        description: `Recorded ${paymentTypeLabels[form.payment_type]} payment of ${fmt(amount)} for ${selectedLoan.borrower_name} (${selectedLoan.loan_id || "Loan"})`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["borrower-loans"] });
      toast.success("Payment recorded successfully");
      setForm({
        amount: "",
        payment_type: "principal_interest",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        method: "cash",
        notes: "",
      });
    },
  });

  const handleBorrowerChange = (id) => {
    setBorrowerId(id);
    setLoanId("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Record Payment
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Borrower Selection */}
          <div className="space-y-2">
            <Label>Select Borrower *</Label>
            <Select value={borrowerId} onValueChange={handleBorrowerChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a borrower" />
              </SelectTrigger>
              <SelectContent>
                {borrowers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.full_name} {b.borrower_id ? `(${b.borrower_id})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loan Selection (if multiple active loans) */}
          {borrowerLoans.length > 1 && (
            <div className="space-y-2">
              <Label>Select Loan *</Label>
              <Select value={selectedLoan?.id} onValueChange={setLoanId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a loan" />
                </SelectTrigger>
                <SelectContent>
                  {borrowerLoans.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.loan_id || "Loan"} · {fmt(l.remaining_balance)} remaining
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Loan Details */}
          {selectedLoan ? (
            <div className="bg-primary/5 rounded-xl p-4 space-y-3 border border-border">
              <p className="font-semibold text-sm">Loan Details</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Borrower Name</p>
                  <p className="font-medium">{selectedLoan.borrower_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loan Amount</p>
                  <p className="font-medium">{fmt(selectedLoan.principal_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interest Rate</p>
                  <p className="font-medium">{selectedLoan.interest_rate}% monthly</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loan Term</p>
                  <p className="font-medium">{selectedLoan.term_value || selectedLoan.term_months} months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding Balance</p>
                  <p className="font-medium text-destructive">{fmt(outstandingBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Interest Due</p>
                  <p className="font-medium text-accent">{fmt(remainingInterest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Interest</p>
                  <p className="font-medium">{fmt(monthlyInterest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Principal Paid</p>
                  <p className="font-medium text-emerald-600">{fmt(principalPaidSoFar)}</p>
                </div>
              </div>
            </div>
          ) : borrowerId ? (
            <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl">
              No active loans for this borrower
            </div>
          ) : null}

          {/* Payment Entry Form */}
          {selectedLoan && (
            <>
              <div className="space-y-2">
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="rounded-xl text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Type *</Label>
                <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal_interest">Principal + Interest</SelectItem>
                    <SelectItem value="interest_only">Interest Only</SelectItem>
                    <SelectItem value="principal_only">Principal Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Payment notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-xl"
                  rows={2}
                />
              </div>

              <Button
                onClick={() => mutate()}
                disabled={isPending || !form.amount}
                className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 h-12"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Payment"}
              </Button>

              {/* Payment History */}
              {loanPayments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Payment History</p>
                  <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs min-w-[400px]">
                      <thead>
                        <tr className="bg-muted text-foreground">
                          <th className="px-3 py-2 text-left font-semibold">Date</th>
                          <th className="px-3 py-2 text-left font-semibold">Type</th>
                          <th className="px-3 py-2 text-right font-semibold">Amount</th>
                          <th className="px-3 py-2 text-right font-semibold">Balance</th>
                          <th className="px-3 py-2 text-center font-semibold">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loanPayments
                          .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
                          .map((p) => {
                            const paymentsUpTo = loanPayments
                              .filter((pp) => new Date(pp.payment_date) <= new Date(p.payment_date))
                              .reduce((s, pp) => s + (pp.amount || 0), 0);
                            const balanceAfter = Math.max(0, (selectedLoan.total_due || 0) - paymentsUpTo);
                            return (
                              <tr key={p.id} className="border-t border-border">
                                <td className="px-3 py-2">{format(new Date(p.payment_date), "MMM d, yyyy")}</td>
                                <td className="px-3 py-2">{paymentTypeLabels[p.payment_type] || "—"}</td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-600">{fmt(p.amount)}</td>
                                <td className="px-3 py-2 text-right">{fmt(balanceAfter)}</td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => setDeleteTarget(p)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DeletePaymentDialog payment={deleteTarget} onClose={() => setDeleteTarget(null)} />
      </SheetContent>
    </Sheet>
  );
}