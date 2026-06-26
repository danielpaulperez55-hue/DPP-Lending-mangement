import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import StatusBadge from "@/components/shared/StatusBadge";
import BorrowerLoanCard from "@/components/borrowers/BorrowerLoanCard";

function formatCurrency(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

export default function BorrowerDetail() {
  const { id } = useParams();

  const { data: borrower, isLoading } = useQuery({
    queryKey: ["borrower", id],
    queryFn: async () => {
      const list = await base44.entities.Borrower.filter({ id });
      return list[0];
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["borrower-loans", id],
    queryFn: () => base44.entities.Loan.filter({ borrower_id: id }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!borrower) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="text-muted-foreground">Borrower not found</p>
        <Link to="/borrowers" className="text-accent text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  return (
    <div className="px-5">
      <div className="pt-12 pb-4">
        <Link to="/borrowers" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Borrowers
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5 mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl font-heading">
            {borrower.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-heading font-bold">{borrower.full_name}</h2>
            <StatusBadge status={borrower.status} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {borrower.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{borrower.phone}</span>
            </div>
          )}
          {borrower.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{borrower.email}</span>
            </div>
          )}
          {borrower.address && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{borrower.address}</span>
            </div>
          )}
        </div>

        {borrower.notes && (
          <p className="mt-4 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
            {borrower.notes}
          </p>
        )}
      </motion.div>

      <h3 className="text-base font-heading font-semibold mb-3">Loans ({loans.length})</h3>
      <div className="mb-8">
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No loans for this borrower</p>
        ) : (
          loans.map((loan) => (
            <BorrowerLoanCard key={loan.id} loan={loan} borrower={borrower} />
          ))
        )}
      </div>
    </div>
  );
}