import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, UserPlus, Loader2 } from "lucide-react";
import { addMonths, addWeeks, addDays, format } from "date-fns";
import { toast } from "sonner";

function generateBorrowerID(count) {
  return `BRW-${String(count + 1).padStart(5, "0")}`;
}
function generateLoanID(count) {
  return `LN-${String(count + 1).padStart(5, "0")}`;
}

function calcLoanDetails(principal, rate, frequency, termValue) {
  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) || 0;
  const t = parseInt(termValue) || 1;
  const interest = p * (r / 100) * t;
  const totalDue = p + interest;
  const periodicPayment = totalDue / t;
  return { interest: parseFloat(interest.toFixed(2)), totalDue: parseFloat(totalDue.toFixed(2)), periodicPayment: parseFloat(periodicPayment.toFixed(2)) };
}

function calcMaturityDate(startDate, frequency, termValue) {
  if (!startDate || !termValue) return null;
  const d = new Date(startDate);
  const t = parseInt(termValue) || 1;
  if (frequency === "daily") return format(addDays(d, t), "yyyy-MM-dd");
  if (frequency === "weekly") return format(addWeeks(d, t), "yyyy-MM-dd");
  return format(addMonths(d, t), "yyyy-MM-dd");
}

const emptyBorrower = { full_name: "", phone: "", address: "", occupation: "", notes: "" };
const emptyLoan = { start_date: "", principal_amount: "", interest_rate: "", payment_frequency: "monthly", term_value: "", first_due_date: "", collector: "" };

export default function BorrowerRegistrationForm() {
  const queryClient = useQueryClient();
  const [borrowerForm, setBorrowerForm] = useState(emptyBorrower);
  const [loanForm, setLoanForm] = useState(emptyLoan);
  const [showLoan, setShowLoan] = useState(true);

  const { data: allBorrowers = [] } = useQuery({ queryKey: ["borrowers"], queryFn: () => base44.entities.Borrower.list("-created_date", 200) });
  const { data: allLoans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list("-created_date", 200) });

  const { mutate: register, isPending } = useMutation({
    mutationFn: async () => {
      const borrower_ref = generateBorrowerID(allBorrowers.length);
      const loan_ref = generateLoanID(allLoans.length);

      const newBorrower = await base44.entities.Borrower.create({
        ...borrowerForm,
        borrower_id: borrower_ref,
        status: "active",
      });

      let newLoan = null;
      if (loanForm.principal_amount) {
        const { interest, totalDue, periodicPayment } = calcLoanDetails(loanForm.principal_amount, loanForm.interest_rate, loanForm.payment_frequency, loanForm.term_value);
        const maturityDate = calcMaturityDate(loanForm.start_date, loanForm.payment_frequency, loanForm.term_value);
        const termMonths = loanForm.payment_frequency === "monthly" ? parseInt(loanForm.term_value) : loanForm.payment_frequency === "weekly" ? Math.ceil(parseInt(loanForm.term_value) / 4.33) : Math.ceil(parseInt(loanForm.term_value) / 30);

        newLoan = await base44.entities.Loan.create({
          loan_id: loan_ref,
          borrower_id: newBorrower.id,
          borrower_name: borrowerForm.full_name,
          borrower_ref_id: borrower_ref,
          principal_amount: parseFloat(loanForm.principal_amount),
          interest_rate: parseFloat(loanForm.interest_rate) || 0,
          interest_amount: interest,
          payment_frequency: loanForm.payment_frequency,
          term_months: termMonths,
          term_value: parseInt(loanForm.term_value) || 1,
          monthly_payment: periodicPayment,
          total_due: totalDue,
          total_paid: 0,
          remaining_balance: totalDue,
          start_date: loanForm.start_date || format(new Date(), "yyyy-MM-dd"),
          first_due_date: loanForm.first_due_date,
          next_payment_date: loanForm.first_due_date || loanForm.start_date,
          maturity_date: maturityDate,
          collector: loanForm.collector,
          status: "active",
        });
      }

      await base44.entities.AuditLog.create({
        action: "REGISTER_BORROWER",
        entity_type: "Borrower",
        entity_id: newBorrower.id,
        description: `Registered borrower ${borrowerForm.full_name} (${borrower_ref})${newLoan ? ` with loan ${loan_ref}` : ""}`,
      });

      return { newBorrower, newLoan };
    },
    onSuccess: ({ newBorrower, newLoan }) => {
      queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
      toast.success(`Borrower registered successfully!`, {
        description: `ID: ${newBorrower.borrower_id}${newLoan ? ` · Loan: ${newLoan.loan_id}` : ""}`,
      });
      setBorrowerForm(emptyBorrower);
      setLoanForm(emptyLoan);
    },
  });

  const bp = (field) => ({ value: borrowerForm[field], onChange: (e) => setBorrowerForm(p => ({ ...p, [field]: e.target.value })) });
  const lp = (field) => ({ value: loanForm[field], onChange: (e) => setLoanForm(p => ({ ...p, [field]: e.target.value })) });

  const loanDetails = loanForm.principal_amount
    ? calcLoanDetails(loanForm.principal_amount, loanForm.interest_rate, loanForm.payment_frequency, loanForm.term_value)
    : null;
  const maturityDate = loanForm.start_date && loanForm.term_value
    ? calcMaturityDate(loanForm.start_date, loanForm.payment_frequency, loanForm.term_value)
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
      <div className="bg-primary px-5 py-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary-foreground" />
          <h2 className="text-base font-heading font-bold text-primary-foreground">Borrower Registration</h2>
        </div>
        <p className="text-xs text-primary-foreground/70 mt-0.5">Fill in details and loan info to register</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Borrower Info */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            Borrower Information
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">Full Name *</Label>
              <Input placeholder="e.g. Maria Santos" {...bp("full_name")} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Contact Number</Label>
              <Input placeholder="+63 9XX XXX XXXX" {...bp("phone")} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Address</Label>
              <Input placeholder="123 Main St, City" {...bp("address")} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Occupation</Label>
              <Input placeholder="e.g. Teacher" {...bp("occupation")} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Notes</Label>
              <Textarea placeholder="Any additional notes..." className="resize-none h-20" {...bp("notes")} />
            </div>
          </div>
        </div>

        {/* Loan Info Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowLoan(!showLoan)}
            className="w-full flex items-center justify-between text-sm font-semibold text-foreground mb-3"
          >
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">2</span>
              Loan Information <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </span>
            {showLoan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLoan && (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Loan Release Date</Label>
                  <Input type="date" {...lp("start_date")} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">First Due Date</Label>
                  <Input type="date" {...lp("first_due_date")} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Principal Amount</Label>
                <Input type="number" placeholder="0.00" {...lp("principal_amount")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Interest Rate (%)</Label>
                  <Select value={loanForm.interest_rate} onValueChange={(v) => setLoanForm(p => ({ ...p, interest_rate: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      {[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(r => (
                        <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Payment Frequency</Label>
                  <Select value={loanForm.payment_frequency} onValueChange={(v) => setLoanForm(p => ({ ...p, payment_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Loan Term <span className="text-muted-foreground">(# of {loanForm.payment_frequency === "daily" ? "days" : loanForm.payment_frequency === "weekly" ? "weeks" : "months"})</span></Label>
                  <Input type="number" placeholder="e.g. 12" {...lp("term_value")} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Collector Assigned</Label>
                  <Input placeholder="Collector name" {...lp("collector")} />
                </div>
              </div>

              {/* Auto-calculated preview */}
              {loanDetails && (
                <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1.5 border border-border">
                  <p className="font-semibold text-foreground text-sm mb-2">Calculated Summary</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Interest Amount</span><span className="font-medium">₱{loanDetails.interest.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Receivable</span><span className="font-semibold text-foreground">₱{loanDetails.totalDue.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Periodic Payment</span><span className="font-medium">₱{loanDetails.periodicPayment.toLocaleString()}</span></div>
                  {maturityDate && <div className="flex justify-between"><span className="text-muted-foreground">Maturity Date</span><span className="font-medium">{maturityDate}</span></div>}
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          disabled={!borrowerForm.full_name || isPending}
          onClick={() => register()}
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register Borrower</>}
        </Button>
      </div>
    </div>
  );
}