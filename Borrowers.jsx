import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import AddBorrowerSheet from "@/components/borrowers/AddBorrowerSheet";
import BorrowerCard from "@/components/borrowers/BorrowerCard";

export default function Borrowers() {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: borrowers = [], isLoading } = useQuery({
    queryKey: ["borrowers"],
    queryFn: () => base44.entities.Borrower.list("-created_date", 100),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list("-created_date", 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Borrower.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (borrower) => {
      const borrowerPayments = payments.filter((p) => p.borrower_id === borrower.id);
      for (const p of borrowerPayments) {
        await base44.entities.Payment.delete(p.id);
      }
      const borrowerLoans = loans.filter((l) => l.borrower_id === borrower.id);
      for (const l of borrowerLoans) {
        await base44.entities.Loan.delete(l.id);
      }
      await base44.entities.Borrower.delete(borrower.id);

      await base44.entities.AuditLog.create({
        action: "DELETE_BORROWER",
        entity_type: "Borrower",
        entity_id: borrower.id,
        description: `Deleted borrower ${borrower.full_name} and ${borrowerLoans.length} associated loan(s) and ${borrowerPayments.length} payment(s)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
      setDeleteTarget(null);
    },
  });

  const filtered = borrowers.filter((b) =>
    b.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-5">
      <PageHeader
        title="Borrowers"
        subtitle={`${borrowers.length} total`}
        action={
          <Button
            size="sm"
            className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        }
      />

      {borrowers.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search borrowers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card border-border"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : borrowers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No borrowers yet"
          description="Add your first borrower to start tracking loans"
          action={
            <Button
              className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Borrower
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((borrower, i) => (
              <BorrowerCard
                key={borrower.id}
                borrower={borrower}
                index={i}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddBorrowerSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Borrower</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.full_name}? This action cannot be undone.
              All associated loans and payment records will also be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}