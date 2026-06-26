import { format, parseISO, addMonths, addWeeks, addDays } from "date-fns";

export function fmt(n) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateSchedule(loan) {
  const principal = Number(loan.principal_amount || 0);
  const rate = Number(loan.interest_rate || 0) / 100;
  const periods = Number(loan.term_months || loan.term_value || 1);
  const freq = loan.payment_frequency || "monthly";
  const startDate = loan.first_due_date || loan.start_date;

  const interestTotal = loan.interest_amount || principal * rate * periods;
  const principalPerPeriod = principal / periods;
  const interestPerPeriod = interestTotal / periods;
  const toPay = principalPerPeriod + interestPerPeriod;

  const rows = [];
  for (let i = 0; i < periods; i++) {
    let dueDate = null;
    if (startDate) {
      const base = parseISO(startDate);
      if (freq === "daily") dueDate = addDays(base, i);
      else if (freq === "weekly") dueDate = addWeeks(base, i);
      else dueDate = addMonths(base, i);
    }
    rows.push({
      date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      principal: principalPerPeriod,
      interest: interestPerPeriod,
      to_pay: toPay,
      status: "unpaid",
      paid_amount: 0,
      paid_date: null,
    });
  }
  return rows;
}

export function buildScheduleWithPayments(loan, payments) {
  // Use stored schedule as base if it exists (preserves manual modifications)
  const schedule =
    loan.schedule && loan.schedule.length > 0
      ? loan.schedule.map((r) => ({ ...r }))
      : generateSchedule(loan);

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
  );

  for (let i = 0; i < schedule.length; i++) {
    const payment = sortedPayments[i];
    if (payment) {
      const paidAmount = payment.amount || 0;
      schedule[i].paid_amount = paidAmount;
      schedule[i].paid_date = payment.payment_date;

      if (paidAmount >= schedule[i].to_pay - 0.01) {
        schedule[i].status = "fully_paid";
      } else if (
        paidAmount >= schedule[i].interest - 0.01 &&
        paidAmount < schedule[i].principal
      ) {
        schedule[i].status = "interest_paid";
      } else if (paidAmount > 0) {
        schedule[i].status = "partial";
      }
    }
  }
  return schedule;
}

export function addScheduleMonth(loan) {
  const schedule =
    loan.schedule && loan.schedule.length > 0
      ? [...loan.schedule]
      : generateSchedule(loan);

  const lastRow = schedule[schedule.length - 1];
  const lastDate = lastRow?.date ? parseISO(lastRow.date) : new Date();
  const newDate = addMonths(lastDate, 1);

  const loanPrincipal = Number(loan.principal_amount || 0);
  const rate = Number(loan.interest_rate || 0) / 100;
  const newInterest = loanPrincipal * rate;
  const principalPerPeriod = lastRow?.principal || loanPrincipal;

  schedule.push({
    date: format(newDate, "yyyy-MM-dd"),
    principal: principalPerPeriod,
    interest: newInterest,
    to_pay: principalPerPeriod + newInterest,
    status: "unpaid",
    paid_amount: 0,
    paid_date: null,
  });

  return schedule;
}

export function computeMaturityDate(startDate, periods, freq = "monthly") {
  if (!startDate) return null;
  const base = parseISO(startDate);
  const lastIdx = Math.max(0, periods - 1);
  if (freq === "daily") return format(addDays(base, lastIdx), "yyyy-MM-dd");
  if (freq === "weekly") return format(addWeeks(base, lastIdx), "yyyy-MM-dd");
  return format(addMonths(base, lastIdx), "yyyy-MM-dd");
}

export function computeLoanTotals(loan, payments = []) {
  // Always reconcile stored schedule with actual payment records
  let schedule = buildScheduleWithPayments(loan, payments);

  // Use actual payment record portions for accurate totals
  let interestPaid = 0;
  let principalPaid = 0;

  for (const p of payments) {
    interestPaid += Number(p.interest_portion || 0);
    principalPaid += Number(p.principal_portion || 0);
  }

  const principalBalance = Math.max(
    0,
    (loan.principal_amount || 0) - principalPaid
  );

  const nextDueRow = schedule.find(
    (r) => r.status === "unpaid" || r.status === "partial"
  );
  const nextDueDate = nextDueRow?.date || null;

  return {
    schedule,
    interestPaid,
    principalPaid,
    principalBalance,
    nextDueDate,
  };
}

export function extendScheduleForInterestOnly(loan, rowIndex) {
  const schedule = [
    ...(loan.schedule && loan.schedule.length > 0
      ? loan.schedule
      : generateSchedule(loan)),
  ];

  const row = { ...schedule[rowIndex] };
  row.status = "interest_paid";
  row.paid_amount = row.interest;
  row.paid_date = format(new Date(), "yyyy-MM-dd");
  schedule[rowIndex] = row;

  const lastRow = schedule[schedule.length - 1];
  const lastDate = lastRow.date ? parseISO(lastRow.date) : new Date();
  const newDate = addMonths(lastDate, 1);
  const remainingPrincipal = row.principal;
  const rate = Number(loan.interest_rate || 0) / 100;
  const newInterest = remainingPrincipal * rate;

  schedule.push({
    date: format(newDate, "yyyy-MM-dd"),
    principal: remainingPrincipal,
    interest: newInterest,
    to_pay: remainingPrincipal + newInterest,
    status: "unpaid",
    paid_amount: 0,
    paid_date: null,
  });

  return schedule;
}