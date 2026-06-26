import React, { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ShareLoanLink({ loanId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/loan/${loanId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-2 text-white border-white/30"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Share
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Copy shareable link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}