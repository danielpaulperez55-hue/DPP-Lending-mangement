import React, { useState, useEffect, useMemo } from "react";
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
import { generateSchedule, computeMaturityDate, fmt } from "@/lib/loan-utils";

export default function EditLoanSheet({ open, onOpenChange, loan, borrower }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({});
  const [interestOverrides, setInterestOverrides] = useState({});

  useEffect(() => {
    if (loan && open) {
      setForm({
        borrower_name: borrower?.full_name || loan.borrower_name || "",
        principal_amount: loan.principal_amount || "",
        interest_rate: loan.interest_rate || "",
        start_date: loan.start_date || "",
        first_due_date: loan.first_due_date || "",
        maturity_date: loan.maturity_date || "",
        term_months: loan.term_months || loan.term_value || "",
        status: loan.status || "active",
        notes: loan.notes || "",
      });
      setInterestOverrides({});
    }
  }, [loan, borrower, open]);

  // Auto-calculate maturity date when first_due_date or term changes
  useEffect(() => {
    if (form.first_due_date && form.term_months) {
      const computed = computeMaturityDate(
        form.first_due_date,
        Number(form.term_months)
      );
      if (computed) {
        setForm((prev) => ({ ...prev, maturity_date: computed }));
      }
    }
  }, [form.first_due_date, form.term_months]);

  const schedulePreview = useMemo(() => {
    if (!form.principal_amount) return [];
    const generated = generateSchedule({
      principal_amount: Number(form.principal_amount || 0),
      interest_rate: Number(form.interest_rate || 0),
      term_months: Number(form.term_months || 1),
      first_due_date: form.first_due_date,
      start_date: form.start_date,
      payment_frequency: "monthly",
      interest_amount:
        Number(form.principal_amount || 0) *
        (Number(form.interest_rate || 0) / 100) *
        Number(form.term_months || 1),
    });
    // Apply any per-row interest overrides
    return generated.map((row, i) => {
      if (interestOverrides[i] !== undefined) {
        const interest = Number(interestOverrides[i]) || 0;
        return { ...row, interest, to_pay: row.principal + interest };
      }
      return row;
    });
  }, [form.principal_amount, form.interest_rate, form.term_months, form.first_due_date, form.start_date, interestOverrides]);

  const totalInterest = schedulePreview.reduce((s, r) => s + r.interest, 0);
  const totalDue = schedulePreview.reduce((s, r) => s + r.to_pay, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update borrower name if changed
      if (borrower && form.borrower_name !== borrower.full_name) {
        await base44.entities.Borrower.update(borrower.id, {
          full_name: form.borrower_name,
        });
      }

      const principal = Number(form.principal_amount || 0);
      const rate = Number(form.interest_rate || 0);
      const term = Number(form.term_months || 1);

      const scheduleParamsChanged =
        principal !== Number(loan.principal_amount) ||
        rate !== Number(loan.interest_rate) ||
        term !== Number(loan.term_months || loan.term_value) ||
        form.first_due_date !== (loan.first_due_date || loan.start_date);

      const hasOverrides = Object.keys(interestOverrides).length > 0;

      const newSchedule =
        scheduleParamsChanged || hasOverrides
          ? schedulePreview
          : loan.schedule || schedulePreview;

      const interestAmount = schedulePreview.reduce((s, r) => s + r.interest, 0);
      const monthlyPayment = schedulePreview[0]?.to_pay || 0;

      await base44.entities.Loan.update(loan.id, {
        borrower_name: form.borrower_name,
        principal_amount: principal,
        interest_rate: rate,
        interest_amount: interestAmount,
        term_months: term,
        term_value: term,
        monthly_payment: monthlyPayment,
        total_due: totalDue,
        start_date: form.start_date,
        first_due_date: form.first_due_date,
        maturity_date: form.maturity_date,
        next_payment_date: form.first_due_date,
        remaining_balance: totalDue,
        status: form.status,
        notes: form.notes,
        schedule: newSchedule,
      });

      await base44.entities.AuditLog.create({
        action: "EDIT_LOAN",
        entity_type: "Loan",
        entity_id: loan.id,
        description: `Edited loan for ${form.borrower_name}: Amount ${fmt(principal)}, Rate ${rate}%, Term ${term} months by ${user?.full_name || user?.email || "admin"}`,
        performed_by: user?.full_name || user?.email || "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrower-loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["borrower"] });
      queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments"] });
      toast.success("Loan record updated successfully");
      onOpenChange(false);
    },
  });

  if (!loan) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto" side="bottom">
        <SheetHeader className="mb-4">
          <SheetTitle>Edit Loan Record</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1 pb-20">
          {/* Borrower Name */}
          <div className="space-y-2">
            <Label>Borrower Name</Label>
            <Input
              value={form.borrower_name || ""}
              onChange={(e) =>
                setForm({ ...form, borrower_name: e.target.value })
              }
              className="rounded-xl"
            />
          </div>

          {/* Loan Amount & Interest Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Loan Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={form.principal_amount || ""}
                onChange={(e) =>
                  setForm({ ...form, principal_amount: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.interest_rate || ""}
                onChange={(e) =>
                  setForm({ ...form, interest_rate: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Loan Date</Label>
              <Input
                type="date"
                value={form.start_date || ""}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date (First Due)</Label>
              <Input
                type="date"
                value={form.first_due_date || ""}
                onChange={(e) =>
                  setForm({ ...form, first_due_date: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Terms (Months)</Label>
              <Input
                type="number"
                value={form.term_months || ""}
                onChange={(e) =>
                  setForm({ ...form, term_months: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Maturity Date</Label>
              <Input
                type="date"
                value={form.maturity_date || ""}
                onChange={(e) =>
                  setForm({ ...form, maturity_date: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status || "active"}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl"
              rows={2}
            />
          </div>

          {/* Schedule Preview */}
          {schedulePreview.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold">Payment Schedule Preview</p>
                <p className="text-xs text-muted-foreground">
                  Total Due: <span className="font-medium text-blue-600">{fmt(totalDue)}</span>
                </p>
              </div>
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="bg-muted text-foreground">
                      <th className="px-3 py-2 text-left font-semibold">Date</th>
                      <th className="px-3 py-2 text-right font-semibold">Principal</th>
                      <th className="px-3 py-2 text-right font-semibold">Interest</th>
                      <th className="px-3 py-2 text-right font-semibold text-blue-600">To Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedulePreview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-left">
                          {row.date ? format(parseISO(row.date), "MMM d, yyyy") : `Period ${i + 1}`}
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(row.principal)}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={interestOverrides[i] !== undefined ? interestOverrides[i] : row.interest}
                            onChange={(e) =>
                              setInterestOverrides({ ...interestOverrides, [i]: e.target.value })
                            }
                            className="h-7 w-24 text-right rounded-md ml-auto"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600 font-medium">{fmt(row.to_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            disabled={saveMutation.isPending || !form.borrower_name || !form.principal_amount}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}