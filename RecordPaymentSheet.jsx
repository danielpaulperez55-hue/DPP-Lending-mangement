import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function RecordPaymentSheet({ open, onOpenChange, loan, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    method: "cash",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      loan_id: loan.id,
      borrower_id: loan.borrower_id,
      borrower_name: loan.borrower_name,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      method: form.method,
      notes: form.notes,
    });
    setForm({
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      method: "cash",
      notes: "",
    });
  };

  const formatCurrency = (amount) =>
    "₱" + Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading">Record Payment</SheetTitle>
        </SheetHeader>

        {loan && (
          <div className="bg-muted/50 rounded-xl p-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Borrower</span>
              <span className="font-medium">{loan.borrower_name}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium">{formatCurrency(loan.remaining_balance)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Monthly Due</span>
              <span className="font-medium">{formatCurrency(loan.monthly_payment)}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder={loan?.monthly_payment?.toString() || "0.00"}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="rounded-xl text-lg h-12"
            />
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
            type="submit"
            disabled={isLoading || !form.amount}
            className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 h-12"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}