import React from "react";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  defaulted: "bg-gray-100 text-gray-600 border-gray-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      statusStyles[status] || statusStyles.active
    }`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}