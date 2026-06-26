import React from "react";

export default function PageHeader({ title, subtitle, action, subtitleClassName }) {
  return (
    <div className="px-5 pt-12 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'Nunito' }}>
            {title}
          </h1>
          {subtitle && (
            <p className={subtitleClassName || "text-sm text-muted-foreground mt-0.5"} style={{ fontFamily: 'Nunito' }}>{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}