import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, subtitle, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-4 ${
        accent
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border"
      }`}
    >
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full -translate-y-8 translate-x-8" />
      )}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${
            accent ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 font-heading">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${
              accent ? "text-primary-foreground/60" : "text-muted-foreground"
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-xl ${
            accent ? "bg-accent/20" : "bg-muted"
          }`}>
            <Icon className={`w-4 h-4 ${
              accent ? "text-accent" : "text-muted-foreground"
            }`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}