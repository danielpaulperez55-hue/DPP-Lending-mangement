import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format, addMonths } from "date-fns";

export default function CreateLoanSheet({ open, onOpenChange, borrowers, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    borrower_id: "",
    principal_amount: "",
    interest_rate: "",
    term_months: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const selectedBorrower = borrowers?.find((b) => b.id === form.borrower_id);

  const calculateLoan = () => {
    const p = parseFloat(form.principal_amount) || 0;
    const monthlyRate = (parseFloat(form.interest_rate) || 0) / 100;
    const n = parseInt(form.term_months) || 1;

    const monthlyInterest = p * monthlyRate;
    const monthlyPayment = p / n + monthlyInterest;
    const totalDue = monthlyPayment * n;

    return {
      monthly_payment: Math.round(monthlyPayment * 100) / 100,
      total_due: Math.round(totalDue * 100) / 100,
      interest_amount: Math.round((monthlyInterest * n) * 100) / 100,
    };
  };

  const { monthly_payment, total_due, interest_amount } = calculateLoan();

  const handleSubmit = (e) => {
    e.preventDefault();
    const startDate = new Date(form.start_date);
    const nextPaymentDate = addMonths(startDate, 1);

    onSubmit({
      borrower_id: form.borrower_id,
      borrower_name: selectedBorrower?.full_name || "",
      principal_amount: parseFloat(form.principal_amount),
      interest_rate: parseFloat(form.interest_rate),
      interest_amount,
      term_months: parseInt(form.term_months),
      term_value: parseInt(form.term_months),
      monthly_payment,
      total_due,
      total_paid: 0,
      remaining_balance: total_due,
      start_date: form.start_date,
      next_payment_date: format(nextPaymentDate, "yyyy-MM-dd"),
      status: "active",
      notes: form.notes,
    });

    setForm({
      borrower_id: "",
      principal_amount: "",
      interest_rate: "",
      term_months: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const formatCurrency = (amount) =>
    "₱" + Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading">Create Loan</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label>Borrower *</Label>
            <Select value={form.borrower_id} onValueChange={(v) => setForm({ ...form, borrower_id: v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select borrower" />
              </SelectTrigger>
              <SelectContent>
                {borrowers?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="10,000"
                value={form.principal_amount}
                onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate % *</Label>
              <Input
                required
                type="number"
                step="0.1"
                min="0"
                placeholder="12"
                value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Term (months) *</Label>
              <Input
                required
                type="number"
                min="1"
                placeholder="12"
                value={form.term_months}
                onChange={(e) => setForm({ ...form, term_months: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          {form.principal_amount && form.interest_rate && form.term_months && (
            <div className="bg-primary/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Payment</span>
                <span className="font-semibold">{formatCurrency(monthly_payment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Due</span>
                <span className="font-semibold">{formatCurrency(total_due)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Interest</span>
                <span className="font-semibold text-accent">
                  {formatCurrency(interest_amount / (parseInt(form.term_months) || 1))}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl"
              rows={2}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !form.borrower_id || !form.principal_amount || !form.interest_rate || !form.term_months}
            className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 h-12"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Loan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}