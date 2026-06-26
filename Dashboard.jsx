import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import QuickActions from "@/components/dashboard/QuickActions";
import BorrowerRegistrationForm from "@/components/dashboard/BorrowerRegistrationForm";
import DashboardPaymentTables from "@/components/dashboard/DashboardPaymentTables";
import PaymentEntrySheet from "@/components/payments/PaymentEntrySheet";

export default function Dashboard() {
  const [showPayment, setShowPayment] = useState(false);
  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list("-created_date", 200),
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ["borrowers"],
    queryFn: () => base44.entities.Borrower.list("-created_date", 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["recent-payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 100),
  });

  return (
    <div className="px-5 pb-10">
      <PageHeader title="DPP LENDING TRUST SERVICES" subtitle="DASHBOARD" subtitleClassName="text-lg font-semibold text-slate-700" />

      {/* Payment Tables */}
      <DashboardPaymentTables loans={loans} payments={payments} />

      {/* KPIs */}
      <DashboardKPIs loans={loans} borrowers={borrowers} payments={payments} />

      {/* Quick Actions */}
      <QuickActions onPayment={() => setShowPayment(true)} />

      {/* Borrower Registration Form */}
      <div id="register-form">
        <BorrowerRegistrationForm />
      </div>

      <PaymentEntrySheet open={showPayment} onOpenChange={setShowPayment} />
    </div>
  );
}