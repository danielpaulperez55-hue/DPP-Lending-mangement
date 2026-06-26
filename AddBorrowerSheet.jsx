import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function AddBorrowerSheet({ open, onOpenChange, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, status: "active" });
    setForm({ full_name: "", phone: "", email: "", address: "", notes: "" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading">Add Borrower</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              required
              placeholder="Enter full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              placeholder="Home address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl"
              rows={3}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !form.full_name}
            className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 h-12"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Borrower"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}