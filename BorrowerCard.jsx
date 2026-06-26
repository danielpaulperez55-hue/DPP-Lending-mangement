import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";

export default function BorrowerCard({ borrower, index, onDelete }) {
  return (
    <motion.div
      key={borrower.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative"
    >
      <Link
        to={`/borrowers/${borrower.id}`}
        className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border hover:border-accent/40 transition-colors pr-12"
      >
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
          {borrower.full_name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{borrower.full_name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {borrower.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {borrower.phone}
              </span>
            )}
            {borrower.email && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> {borrower.email}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={borrower.status} />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(borrower);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}