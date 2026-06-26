import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Check } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef(null);

  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const result = await base44.entities.Settings.list("-created_date", 1);
      return result[0] || {};
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settings.id) {
        return base44.entities.Settings.update(settings.id, data);
      } else {
        return base44.entities.Settings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setUploaded(true);
      setTimeout(() => setUploaded(false), 3000);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateSettingsMutation.mutate({ logo_url: file_url });
    setUploading(false);
  };

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Settings" subtitle="Manage your company branding" />

      <div className="max-w-2xl">
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Company Logo</h2>

          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {settings.logo_url ? (
                <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden flex items-center justify-center bg-muted">
                  <img
                    src={settings.logo_url}
                    alt="Company Logo"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                  <p className="text-xs text-muted-foreground text-center">No logo</p>
                </div>
              )}
            </div>

            {/* Upload Section */}
            <div className="flex-1">
              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  asChild
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {uploaded ? (
                      <>
                        <Check className="w-4 h-4" />
                        Uploaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {uploading ? "Uploading..." : "Choose Logo"}
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Upload PNG, JPG, or SVG.
              </p>
            </div>
          </div>

          {settings.logo_url && (
            <p className="text-xs text-muted-foreground mt-4">
              ✓ Logo will appear on public loan statements
            </p>
          )}
        </div>
      </div>
    </div>
  );
}