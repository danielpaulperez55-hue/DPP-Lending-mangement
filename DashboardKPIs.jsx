import React from "react";
import { Landmark, TrendingUp, Users, AlertTriangle, DollarSign, BarChart2, ArrowDownCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, addDays } from "date-fns";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function KPICard({ icon: Icon, label, value, sub, color = "bg-primary text-primary-foreground" }) {
  // Icon is destructured above correctly
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg md:rounded-xl p-2 md:p-4 flex items-start gap-2 md:gap-3"
    >
      <div className={`w-7 md:w-9 h-7 md:h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-3 md:w-4 h-3 md:h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-base md:text-lg font-bold text-foreground leading-tight truncate">{value}</p>
        {sub && <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardKPIs({ loans, borrowers, payments }) {
  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueLoans = loans.filter((l) => l.status === "overdue");
  const totalPrincipal = activeLoans.reduce((s, l) => s + (l.principal_amount || 0), 0);
  const totalInterest = loans.reduce((s, l) => s + (l.interest_amount || 0), 0);

  const now = new Date();
  const thisMonth = payments.filter((p) => {
    const d = new Date(p.payment_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyCollections = thisMonth.reduce((s, p) => s + (p.amount || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const netProfit = totalCollected - loans.reduce((s, l) => s + (l.principal_amount || 0), 0);

  // Calculate To Collect and Collected for this month
  const toCollectInterest = (() => {
    let total = 0;
    activeLoans.forEach((loan) => {
      const loanPayments = payments.filter((p) => p.loan_id === loan.id);
      const principal = loan.principal_amount || 0;
      const interest = loan.interest_amount || 0;
      const periods = loan.term_value || loan.term_months || 1;
      const interestPerPeriod = interest / periods;
      const sorted = [...loanPayments].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
      
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
        
        if (dueDate && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()) {
          const payment = sorted[i];
          const paidInterest = payment ? Number(payment.interest_portion || 0) : 0;
          if (paidInterest === 0 || paidInterest < interestPerPeriod) {
            total += interestPerPeriod - paidInterest;
          }
        }
      }
    });
    return total;
  })();

  const collectedInterest = (() => {
    let total = 0;
    thisMonth.forEach((p) => {
      total += p.interest_portion || 0;
    });
    return total;
  })();

  const toCollectPrincipal = (() => {
    let total = 0;
    activeLoans.forEach((loan) => {
      const loanPayments = payments.filter((p) => p.loan_id === loan.id);
      const principal = loan.principal_amount || 0;
      const interest = loan.interest_amount || 0;
      const periods = loan.term_value || loan.term_months || 1;
      const principalPerPeriod = principal / periods;
      const sorted = [...loanPayments].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
      
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
        
        if (dueDate && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()) {
          const payment = sorted[i];
          const paidPrincipal = payment ? Number(payment.principal_portion || 0) : 0;
          if (paidPrincipal === 0 || paidPrincipal < principalPerPeriod) {
            total += principalPerPeriod - paidPrincipal;
          }
        }
      }
    });
    return total;
  })();

  const collectedPrincipal = (() => {
    let total = 0;
    thisMonth.forEach((p) => {
      total += p.principal_portion || 0;
    });
    return total;
  })();

  const kpis = [
    { icon: Landmark, label: "Running Principal", value: formatCurrency(totalPrincipal), sub: `${activeLoans.length} active loans`, color: "bg-primary text-primary-foreground" },
    { icon: ArrowDownCircle, label: "To Collect Interest", value: formatCurrency(toCollectInterest), sub: "Interest due this month", color: "bg-yellow-400 text-yellow-900" },
    { icon: ArrowDownCircle, label: "To Collect Principal", value: formatCurrency(toCollectPrincipal), sub: "Principal due this month", color: "bg-yellow-500 text-white" },
    { icon: Users, label: "Active Loans", value: activeLoans.length, sub: `${borrowers.filter(b => b.status === "active").length} borrowers`, color: "bg-emerald-500 text-white" },
    { icon: CheckCircle2, label: "Collected Interest", value: formatCurrency(collectedInterest), sub: "Interest collected this month", color: "bg-green-600 text-white" },
    { icon: CheckCircle2, label: "Collected Principal", value: formatCurrency(collectedPrincipal), sub: "Principal collected this month", color: "bg-emerald-600 text-white" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-6">
      {kpis.map((k) => <KPICard key={k.label} {...k} />)}
    </div>
  );
}