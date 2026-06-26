import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO, addMonths } from "date-fns";
import { motion } from "framer-motion";
import { Pencil, CreditCard, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildScheduleWithPayments,
  computeLoanTotals,
  addScheduleMonth,
  fmt,
} from "@/lib/loan-utils";
import EditLoanSheet from "@/components/loans/EditLoanSheet";
import RecordSchedulePaymentSheet from "@/components/loans/RecordSchedulePaymentSheet";
import ShareLoanLink from "@/components/shared/ShareLoanLink";

function StatusCell({ row }) {
  if (row.status === "fully_paid") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
        FULLY PAID
      </span>
    );
  }
  if (row.status === "interest_paid") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
        INTEREST PAID
      </span>
    );
  }
  if (row.status === "partial") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
        PARTIAL
      </span>
    );
  }
  if (row.date && parseISO(row.date) <= new Date()) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
        OVERDUE
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-400 text-yellow-900 border border-yellow-500">
      DUE DATE
    </span>
  );
}

export default function BorrowerLoanCard({ loan, borrower }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [showEdit, setShowEdit] = useState(false);
  const [paymentRowIndex, setPaymentRowIndex] = useState(null);

  const { data: payments = [] } = useQuery({
    queryKey: ["loan-payments", loan.id],
    queryFn: () => base44.entities.Payment.filter({ loan_id: loan.id }),
  });

  const { schedule, interestPaid, principalPaid, principalBalance, nextDueDate } =
    computeLoanTotals(loan, payments);

  const addMonthMutation = useMutation({
    mutationFn: async () => {
      const newSchedule = addScheduleMonth(loan);
      const lastRow = newSchedule[newSchedule.length - 1];
      const newTerm =
        (loan.term_months || loan.term_value || 0) + 1;
      await base44.entities.Loan.update(loan.id, {
        schedule: newSchedule,
        term_months: newTerm,
        term_value: newTerm,
        maturity_date: lastRow.date,
      });
      await base44.entities.AuditLog.create({
        action: "ADD_SCHEDULE_MONTH",
        entity_type: "Loan",
        entity_id: loan.id,
        description: `Extended loan schedule by one month (new maturity ${lastRow.date}) for ${loan.borrower_name} by ${user?.full_name || user?.email || "admin"}`,
        performed_by: user?.full_name || user?.email || "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrower-loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments"] });
      toast.success("Schedule extended by one month");
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Borrower name banner + Edit button */}
      <div className="flex items-center justify-between bg-primary px-4 py-2.5">
        <div className="flex items-center">
          <div className="text-primary-foreground font-bold text-sm tracking-wide uppercase">
            {loan.borrower_name}
          </div>
          <div className="text-xs text-primary-foreground/60 ml-3">
            {loan.loan_id || ""}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ShareLoanLink loanId={loan.id} />
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addMonthMutation.mutate()}
                disabled={addMonthMutation.isPending}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8"
              >
                <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Add Month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEdit(true)}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8"
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Loan summary header table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">
                Date of Loan
              </th>
              <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">
                Loan Amount
              </th>
              <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">
                Month Terms
              </th>
              <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">
                Interest
              </th>
              <th className="px-4 py-2 text-center font-semibold uppercase tracking-wide">
                Maturity Date
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center border-b border-border">
              <td className="px-4 py-2 text-left text-muted-foreground">
                {loan.start_date
                  ? format(parseISO(loan.start_date), "MMM d, yyyy")
                  : "—"}
              </td>
              <td className="px-4 py-2 font-medium">{fmt(loan.principal_amount)}</td>
              <td className="px-4 py-2 font-medium">
                {loan.term_value || loan.term_months || "—"}
              </td>
              <td className="px-4 py-2 font-medium">{loan.interest_rate}%</td>
              <td className="px-4 py-2 font-medium">
                {loan.maturity_date
                  ? format(parseISO(loan.maturity_date), "MMM d, yyyy")
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment schedule table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted text-foreground border-b border-border">
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap">
                Date of Payment
              </th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">
                Principal
              </th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">
                Interest
              </th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide text-blue-600">
                To Pay
              </th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">
                Paid Amount
              </th>
              {isAdmin && (
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 text-center hover:bg-muted/30"
              >
                <td className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">
                  {row.date
                    ? format(parseISO(row.date), "MMM d, yyyy")
                    : `Period ${i + 1}`}
                </td>
                <td className="px-3 py-2">
                  <StatusCell row={row} />
                </td>
                <td className="px-3 py-2">{fmt(row.principal)}</td>
                <td className="px-3 py-2">{fmt(row.interest)}</td>
                <td className="px-3 py-2 text-blue-600 font-medium">
                  {fmt(row.to_pay)}
                </td>
                <td className="px-3 py-2 font-medium">
                  {row.paid_amount > 0 ? (
                    fmt(row.paid_amount)
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentRowIndex(i)}
                      className="h-7 text-xs gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      Record
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="p-4 border-t border-border mt-2 space-y-1.5">
        <div className="flex items-center gap-3 text-xs">
          <span className="w-36 font-semibold uppercase text-foreground tracking-wide">
            Interest Paid
          </span>
          <span className="text-muted-foreground font-medium w-4">₱</span>
          <span className="font-medium">
            {Number(interestPaid).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="w-36 font-semibold uppercase text-foreground tracking-wide">
            Principal Paid
          </span>
          <span className="text-muted-foreground font-medium w-4">₱</span>
          <span className="font-medium">
            {Number(principalPaid).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="w-36 font-semibold uppercase text-foreground tracking-wide">
            Principal Balance
          </span>
          <span className="text-destructive font-semibold w-4">₱</span>
          <span className="font-bold text-destructive">
            {Number(principalBalance).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        {nextDueDate && (
          <div className="flex items-center gap-3 text-xs">
            <span className="w-36 font-semibold uppercase text-foreground tracking-wide">
              Next Due Date
            </span>
            <span className="font-medium">
              {format(parseISO(nextDueDate), "MMM d, yyyy")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs">
          <span className="w-36 font-semibold uppercase text-foreground tracking-wide">
            Loan Status
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
              loan.status === "paid"
                ? "bg-blue-100 text-blue-700"
                : loan.status === "overdue"
                ? "bg-red-100 text-red-700"
                : loan.status === "defaulted"
                ? "bg-gray-100 text-gray-600"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {loan.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {isAdmin && (
        <>
          <EditLoanSheet
            open={showEdit}
            onOpenChange={setShowEdit}
            loan={loan}
            borrower={borrower}
          />
          <RecordSchedulePaymentSheet
            open={paymentRowIndex !== null}
            onOpenChange={(open) => !open && setPaymentRowIndex(null)}
            loan={loan}
            rowIndex={paymentRowIndex}
            payments={payments}
          />
        </>
      )}
    </motion.div>
  );
}