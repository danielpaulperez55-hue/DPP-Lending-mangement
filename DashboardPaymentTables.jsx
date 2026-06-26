import React from "react";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { motion } from "framer-motion";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionBanner({ label, sublabel, color }) {
  const colors = {
    yellow: "bg-yellow-400 text-yellow-900",
    green: "bg-green-600 text-white",
    blue: "bg-primary text-primary-foreground",
  };
  return (
    <div className="flex items-center mb-0">
      <div
        className={`${colors[color]} rounded-xl px-5 py-2.5 font-bold text-xs tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-transform cursor-default`}
      >
        {label}
        {sublabel && (
          <span className="text-[10px] font-medium opacity-80 normal-case tracking-normal">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

const COL_WIDTHS = ["28%", "14%", "8%", "14%", "8%", "14%", "14%"];

function TableHeader({ cols }) {
  return (
    <thead>
      <tr className="bg-primary text-primary-foreground text-[10px] md:text-xs">
        {cols.map((col, i) => (
          <th key={i} style={{ width: COL_WIDTHS[i] }} className={`px-2 md:px-3 py-1 md:py-2 font-semibold uppercase tracking-wide ${i === 0 ? "text-left" : "text-center"}`}>
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Build per-period schedule rows for a loan
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
    const interestOnlyPaid =
      paidInterest > 0 && paidPrincipal === 0 && !fullyPaid;
    rows.push({
      borrowerName: loan.borrower_name,
      dueDate,
      principal: principalPerPeriod,
      interest: interestPerPeriod,
      toPay,
      paidAmount,
      paidPrincipal,
      paidInterest,
      unpaidPrincipalBalance,
      fullyPaid,
      interestOnlyPaid,
    });
  }
  return rows;
}

export default function DashboardPaymentTables({ loans, payments }) {
  const today = new Date();
  const soon = addDays(today, 60);

  // Build all schedule rows across all active loans
  const allRows = [];
  loans.forEach((loan) => {
    if (loan.status === "paid") return;
    const loanPayments = payments.filter((p) => p.loan_id === loan.id);
    const rows = buildScheduleRows(loan, loanPayments);
    rows.forEach((row) => allRows.push({ ...row, loan }));
  });

  const monthLabel = format(today, "MMMM");

  // TO COLLECT: interest amounts due or upcoming this month (unpaid rows)
  const toCollectRows = allRows.filter(
    (r) => !r.fullyPaid && !r.interestOnlyPaid && r.dueDate &&
      r.dueDate.getMonth() === today.getMonth() &&
      r.dueDate.getFullYear() === today.getFullYear()
  ).sort((a, b) => a.dueDate - b.dueDate);

  // COLLECTED: interest already paid this month (fully paid OR interest-only paid)
  const collectedRows = allRows.filter(
    (r) => (r.fullyPaid || r.interestOnlyPaid) && r.dueDate &&
      r.dueDate.getMonth() === today.getMonth() &&
      r.dueDate.getFullYear() === today.getFullYear()
  ).sort((a, b) => b.dueDate - a.dueDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 md:space-y-8 mb-8"
    >
      {/* TO COLLECT */}
      <div id="to-collect">
        <SectionBanner label="Payment Due" sublabel={monthLabel} color="yellow" />
        <div className="overflow-x-auto border border-border rounded-b-xl rounded-tr-xl">
          <table className="w-full text-xs min-w-[600px] table-fixed">
            <TableHeader cols={["Borrower", "Principal", "", "Interest", "", "Date", "Amount Paid"]} />
            <tbody>
              {toCollectRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted-foreground">No upcoming dues</td>
                </tr>
              ) : (
                toCollectRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 text-[10px] md:text-xs ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                    <td className="px-2 md:px-3 py-1 md:py-2 font-semibold text-foreground uppercase">{row.borrowerName}</td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center">
                      <span className="text-muted-foreground mr-1">₱</span>{fmt(row.principal)}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-[9px] md:text-xs font-bold text-orange-600">DUE</td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center">
                      <span className="text-muted-foreground mr-1">₱</span>{fmt(row.interest)}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-[9px] md:text-xs font-bold text-orange-600">DUE</td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-muted-foreground">
                      {row.dueDate ? format(row.dueDate, "MMM d") : "—"}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center">
                      {row.paidAmount > 0 ? (
                        <><span className="text-muted-foreground mr-1">₱</span>{fmt(row.paidAmount)}</>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECTED */}
      <div id="collected">
        <SectionBanner label="Fully Paid" sublabel={monthLabel} color="green" />
        <div className="overflow-x-auto border border-border rounded-b-xl rounded-tr-xl">
          <table className="w-full text-xs min-w-[600px] table-fixed">
            <TableHeader cols={["Borrower", "Principal", "", "Interest", "", "Date", "Amount Paid"]} />
            <tbody>
              {collectedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted-foreground">No fully paid loans this month</td>
                </tr>
              ) : (
                collectedRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 text-[10px] md:text-xs ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                    <td className="px-2 md:px-3 py-1 md:py-2 font-semibold text-foreground uppercase">{row.borrowerName}</td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center">
                      <span className="text-muted-foreground mr-1">₱</span>{fmt(row.interestOnlyPaid ? row.unpaidPrincipalBalance : row.paidPrincipal)}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-[9px] md:text-xs font-bold text-green-600">
                      {row.interestOnlyPaid ? "RENEW" : "PAID"}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center">
                      <span className="text-muted-foreground mr-1">₱</span>{fmt(row.paidInterest)}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-[9px] md:text-xs font-bold text-green-600">PAID</td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center text-muted-foreground">
                      {row.dueDate ? format(row.dueDate, "MMM d") : "—"}
                    </td>
                    <td className="px-2 md:px-3 py-1 md:py-2 text-center font-semibold text-green-700">
                      <span className="text-muted-foreground mr-1">₱</span>{fmt(row.paidAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </motion.div>
  );
}