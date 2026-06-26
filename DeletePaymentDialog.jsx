import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DeletePaymentDialog({ payment, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: loan } = useQuery({
    queryKey: ["loan-for-delete", payment?.loan_id],
    queryFn: async () => {
      const list = await base44.entities.Loan.filter({ id: payment.loan_id });
      return list[0];
    },
    enabled: !!payment,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (loan) {
        const newTotalPaid = Math.max(0, (loan.total_paid || 0) - (payment.amount || 0));
        const newPrincipalPaid = Math.max(0, (loan.principal_paid || 0) - (payment.principal_portion || 0));
        const newInterestPaid = Math.max(0, (loan.interest_paid || 0) - (payment.interest_portion || 0));
        const newBalance = (loan.total_due || 0) - newTotalPaid;
        const newStatus = newBalance <= 0 ? "paid" : "active";
        await base44.entities.Loan.update(loan.id, {
          total_paid: newTotalPaid,
          principal_paid: newPrincipalPaid,
          interest_paid: newInterestPaid,
          remaining_balance: Math.max(0, newBalance),
          status: newStatus,
        });
      }

      await base44.entities.Payment.delete(payment.id);

      await base44.entities.AuditLog.create({
        action: "DELETE_PAYMENT",
        entity_type: "Payment",
        entity_id: payment.id,
        description: `Deleted payment of ₱${Number(payment.amount || 0).toLocaleString("en-PH")} for ${payment.borrower_name || "borrower"} by ${user?.full_name || user?.email || "admin"}`,
        performed_by: user?.full_name || user?.email || "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loan?.id] });
      import("sonner").then(({ toast }) => {
        toast.success("Payment record deleted successfully");
      });
      onClose();
    },
  });

  return (
    <AlertDialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this payment record? This action cannot be undone.
            The loan balance will be adjusted accordingly.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}