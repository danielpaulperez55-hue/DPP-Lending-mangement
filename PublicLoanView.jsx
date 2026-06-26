import React from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildScheduleRows(loan, payments) {
  const principal = loan.principal_amount || 0;
  const interest = loan.interest_amount || 0;
  const periods = loan.term_value || loan.term_months || 1;
  const principalPerPeriod = principal / periods;
  const interestPerPeriod = interest / periods;
  const toPay = principalPerPeriod + interestPerPeriod;

  const sorted = [...payments].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
  const totalPrincipalPaid = sorted.reduce((sum, p) => sum + Number(p.principal_portion || 0), 0);
  const unpaidPrincipalBalance = principal - totalPrincipalPaid;

  const rows = [];
  for (let i = 0; i < periods; i++) {
    let dueDate = null;
    if (loan.first_due_date) {
      const base = parseISO(loan.first_due_date);
      const freq = loan.payment_frequency || "monthly";
      if (freq === "daily") dueDate = addDays(base, i);
      else if (freq === "weekly") dueDate = addDays(base, i * 7);
      else {
        dueDate = new Date(base);
        dueDate.setMonth(dueDate.getMonth() + i);
      }
    }
    const payment = sorted[i];
    const paidAmount = payment ? payment.amount : 0;
    const paidPrincipal = payment ? Number(payment.principal_portion || 0) : 0;
    const paidInterest = payment ? Number(payment.interest_portion || 0) : 0;
    const fullyPaid = paidAmount >= toPay - 0.01;
    
    rows.push({
      dueDate,
      principal: principalPerPeriod,
      interest: interestPerPeriod,
      toPay,
      paidAmount,
      paidPrincipal,
      paidInterest,
      unpaidPrincipalBalance,
      fullyPaid,
    });
  }
  return rows;
}

function getStatusBadge(fullyPaid, paidAmount, toPay) {
  if (fullyPaid) return { text: "FULLY PAID", color: "bg-green-100 text-green-800" };
  if (paidAmount > 0 && paidAmount < toPay) return { text: "PARTIAL", color: "bg-blue-100 text-blue-800" };
  return { text: "DUE DATE", color: "bg-slate-100 text-slate-800" };
}

export default function PublicLoanView() {
  const { loanId } = useParams();
  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ["public-loan", loanId],
    queryFn: () => base44.entities.Loan.filter({ id: loanId }, undefined, 1).then(res => res[0]),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["public-loan-payments", loanId],
    queryFn: () => loan ? base44.entities.Payment.filter({ loan_id: loanId }, "-payment_date", 100) : [],
    enabled: !!loan,
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const result = await base44.entities.Settings.list("-created_date", 1);
      return result[0] || {};
    },
  });

  if (loanLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!loan) return <div className="flex justify-center items-center h-screen">Loan not found</div>;

  const rows = buildScheduleRows(loan, payments);
  const totalPrincipalPaid = payments.reduce((s, p) => s + (p.principal_portion || 0), 0);
  const totalInterestPaid = payments.reduce((s, p) => s + (p.interest_portion || 0), 0);
  const nextDueDate = rows.find(r => !r.fullyPaid)?.dueDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Company Logo */}
        {settings.logo_url && (
          <div className="flex justify-center mb-6 md:mb-8">
            <img 
              src={settings.logo_url} 
              alt="Company Logo" 
              className="h-24 md:h-32 w-auto"
            />
          </div>
        )}
        {/* Header Card */}
        <div className="bg-slate-900 rounded-lg p-3 md:p-6 mb-4 md:mb-6 border border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">BORROWER</p>
              <h1 className="text-xl md:text-3xl font-bold text-white">{loan.borrower_name}</h1>
              <p className="text-slate-300 text-xs md:text-sm mt-1">{loan.loan_id}</p>
            </div>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mt-3 md:mt-6 pt-3 md:pt-6 border-t border-slate-700">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Date of Loan</p>
              <p className="text-white font-semibold text-sm">{format(parseISO(loan.start_date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Loan Amount</p>
              <p className="text-white font-semibold text-sm">{formatCurrency(loan.principal_amount)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Month Terms</p>
              <p className="text-white font-semibold text-sm">{loan.term_months}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Interest</p>
              <p className="text-white font-semibold text-sm">{loan.interest_rate}%</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Maturity Date</p>
              <p className="text-white font-semibold text-sm">{format(parseISO(loan.maturity_date), "MMM dd, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Payment Schedule Table */}
        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
          <p className="text-xs text-white px-4 pt-3 bg-blue-900">Swipe left to see more</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left font-semibold">Date of Payment</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Principal</th>
                  <th className="px-4 py-3 text-right font-semibold">Interest</th>
                  <th className="px-4 py-3 text-right font-semibold">To Pay</th>
                  <th className="px-4 py-3 text-right font-semibold">Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const status = getStatusBadge(row.fullyPaid, row.paidAmount, row.toPay);
                  return (
                    <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                      <td className="px-4 py-3 text-slate-900">
                        {row.dueDate ? format(row.dueDate, "MMM dd, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(row.interest)}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-semibold">{formatCurrency(row.toPay)}</td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {row.paidAmount > 0 ? formatCurrency(row.paidAmount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="bg-white rounded-lg p-2 md:p-4 border-l-4 border-blue-500">
            <p className="text-slate-600 text-xs uppercase tracking-wider">Interest Paid</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">₱ {totalInterestPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-2 md:p-4 border-l-4 border-emerald-500">
            <p className="text-slate-600 text-xs uppercase tracking-wider">Principal Paid</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">₱ {totalPrincipalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-2 md:p-4 border-l-4 border-orange-500">
            <p className="text-slate-600 text-xs uppercase tracking-wider">Principal Balance</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">₱ {(loan.principal_amount - totalPrincipalPaid).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-2 md:p-4 border-l-4 border-purple-500">
            <p className="text-slate-600 text-xs uppercase tracking-wider">Next Due Date</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{nextDueDate ? format(nextDueDate, "MMM dd") : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}