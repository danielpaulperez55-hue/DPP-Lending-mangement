import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateSchedule,
  buildScheduleWithPayments,
  extendScheduleForInterestOnly,
  computeLoanTotals,
  fmt,
} from "@/lib/loan-utils";

const STATUS_OPTIONS = [
  { value: "fully_paid", label: "Fully Paid" },
  { value: "interest_paid", label: "Interest Paid Only" },
  { value: "partial", label: "Partial Payment" },
  { value: "unpaid", label: "Unpaid" },
];

export default function RecordSchedulePaymentSheet({
  open,
  onOpenChange,
  loan,
  rowIndex,
  payments = [],
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState("fully_paid");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const schedule =
    loan?.schedule && loan.schedule.length > 0
      ? loan.schedule
      : loan
      ? buildScheduleWithPayments(loan, payments)
      : [];

  const row = schedule[rowIndex];

  useEffect(() => {
    if (open && row) {
      if (row.status === "fully_paid") setStatus("fully_paid");
      else if (row.status === "interest_paid") setStatus("interest_paid");
      else if (row.status === "partial") setStatus("partial");
      else setStatus("fully_paid");

      setPartialAmount("");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setMethod("cash");
      setNotes("");
    }
  }, [open, rowIndex, row]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount =
        status === "fully_paid"
          ? row.to_pay
          : status === "interest_paid"
          ? row.interest
          : status === "partial"
          ? Number(partialAmount || 0)
          : 0;
      const hasSchedule = loan.schedule && loan.schedule.length > 0;
      let newSchedule;

      if (hasSchedule) {
        newSchedule = [...loan.schedule];
        const updatedRow = { ...newSchedule[rowIndex] };

        if (status === "fully_paid") {
          updatedRow.status = "fully_paid";
          updatedRow.paid_amount = row.to_pay;
          updatedRow.paid_date = paymentDate;
        } else if (status === "interest_paid") {
          updatedRow.status = "interest_paid";
          updatedRow.paid_amount = row.interest;
          updatedRow.paid_date = paymentDate;
        } else if (status === "partial") {
          updatedRow.status = "partial";
          updatedRow.paid_amount = amount;
          updatedRow.paid_date = paymentDate;
        } else {
          updatedRow.status = "unpaid";
          updatedRow.paid_amount = 0;
          updatedRow.paid_date = null;
        }

        newSchedule[rowIndex] = updatedRow;

        // If interest paid only, extend schedule
        if (status === "interest_paid") {
          newSchedule = extendScheduleForInterestOnly(
            { ...loan, schedule: newSchedule },
            rowIndex
          );
        }
      } else {
        // No stored schedule — generate, update row, and store
        newSchedule = buildScheduleWithPayments(loan, payments);
        const updatedRow = { ...newSchedule[rowIndex] };

        if (status === "fully_paid") {
          updatedRow.status = "fully_paid";
          updatedRow.paid_amount = row.to_pay;
          updatedRow.paid_date = paymentDate;
        } else if (status === "interest_paid") {
          updatedRow.status = "interest_paid";
          updatedRow.paid_amount = row.interest;
          updatedRow.paid_date = paymentDate;
        } else if (status === "partial") {
          updatedRow.status = "partial";
          updatedRow.paid_amount = amount;
          updatedRow.paid_date = paymentDate;
        }

        newSchedule[rowIndex] = updatedRow;

        if (status === "interest_paid") {
          newSchedule = extendScheduleForInterestOnly(
            { ...loan, schedule: newSchedule },
            rowIndex
          );
        }
      }

      // Create Payment record (unless just marking as unpaid)
      if (status !== "unpaid" && amount > 0) {
        const principalPortion =
          status === "interest_paid"
            ? 0
            : status === "fully_paid"
            ? row.principal
            : Math.max(0, amount - row.interest);

        const interestPortion =
          status === "interest_paid"
            ? row.interest
            : status === "fully_paid"
            ? row.interest
            : Math.min(amount, row.interest);

        await base44.entities.Payment.create({
          loan_id: loan.id,
          borrower_id: loan.borrower_id,
          borrower_name: loan.borrower_name,
          amount,
          payment_date: paymentDate,
          method,
          payment_type:
            status === "interest_paid"
              ? "interest_only"
              : status === "fully_paid"
              ? "principal_interest"
              : "principal_interest",
          principal_portion: principalPortion,
          interest_portion: interestPortion,
          notes,
        });
      }

      // Compute new loan totals
      const updatedLoan = { ...loan, schedule: newSchedule };
      const totals = computeLoanTotals(updatedLoan, payments);

      // Determine new term and maturity if extended
      const newTerm =
        status === "interest_paid"
          ? (loan.term_months || loan.term_value || 1) + 1
          : loan.term_months || loan.term_value;

      const lastScheduleRow = newSchedule[newSchedule.length - 1];
      const newMaturityDate =
        status === "interest_paid" && lastScheduleRow?.date
          ? lastScheduleRow.date
          : loan.maturity_date;

      // Determine loan status
      const allPaid = newSchedule.every((r) => r.status === "fully_paid");
      const newLoanStatus = allPaid ? "paid" : loan.status;

      await base44.entities.Loan.update(loan.id, {
        schedule: newSchedule,
        total_paid: totals.interestPaid + totals.principalPaid,
        principal_paid: totals.principalPaid,
        interest_paid: totals.interestPaid,
        remaining_balance: totals.principalBalance,
        next_payment_date: totals.nextDueDate,
        term_months: newTerm,
        term_value: newTerm,
        maturity_date: newMaturityDate,
        status: newLoanStatus,
      });

      await base44.entities.AuditLog.create({
        action: "RECORD_SCHEDULE_PAYMENT",
        entity_type: "Loan",
        entity_id: loan.id,
        description: `Recorded ${status.replace(/_/g, " ")} payment of ${fmt(amount)} for ${loan.borrower_name} on ${paymentDate} by ${user?.full_name || user?.email || "admin"}`,
        performed_by: user?.full_name || user?.email || "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrower-loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
      toast.success(
        status === "interest_paid"
          ? "Interest payment recorded. Loan extended by one month."
          : "Payment recorded successfully"
      );
      onOpenChange(false);
    },
  });

  if (!loan || !row) return null;

  const computedAmount = () => {
    if (status === "fully_paid") return row.to_pay;
    if (status === "interest_paid") return row.interest;
    if (status === "partial") return Number(partialAmount || 0);
    return 0;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto" side="bottom">
        <SheetHeader className="mb-4">
          <SheetTitle>Record Payment</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1 pb-20">
          {/* Row info */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">
                {row.date ? format(parseISO(row.date), "MMM d, yyyy") : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Principal</span>
              <span className="font-medium">{fmt(row.principal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest</span>
              <span className="font-medium">{fmt(row.interest)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-1.5">
              <span className="font-semibold">Amount To Pay</span>
              <span className="font-bold text-blue-600">{fmt(row.to_pay)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partial Amount (only for partial) */}
          {status === "partial" && (
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={row.to_pay}
                placeholder="0.00"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="rounded-xl text-lg h-12"
              />
            </div>
          )}

          {/* Computed amount display */}
          {status !== "unpaid" && status !== "partial" && (
            <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-emerald-700 font-medium">
                Payment Amount
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {fmt(computedAmount())}
              </span>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
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

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {/* Interest-only warning */}
          {status === "interest_paid" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Principal will remain unchanged. A new payment row will be
              automatically added for next month, and the loan maturity date
              will be extended by one month.
            </div>
          )}
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              (status === "partial" && !partialAmount)
            }
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Payment"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}