/**
 * ContractModule — standalone full-screen contract viewer with AI pre-fill.
 * Opens as a Dialog on top of NegotiationChat (stacked z-index).
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, X } from "lucide-react";
import { ContractViewer } from "./ContractViewer";

interface ContractModuleProps {
  bookingId: number;
  onClose: () => void;
}

export function ContractModule({ bookingId, onClose }: ContractModuleProps) {
  const { toast } = useToast();
  const [prefillTerms, setPrefillTerms] = useState<Record<string, any> | null>(null);

  const preFillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        api.agents.negotiation.buildContract.path.replace(":bookingId", String(bookingId)),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to pre-fill");
      }
      return res.json() as Promise<{ terms: Record<string, any>; inferenceNotes: string[] }>;
    },
    onSuccess: (data) => {
      setPrefillTerms(data.terms);
      toast({
        title: "AI pre-fill complete",
        description: data.inferenceNotes?.[0] || "Contract terms populated from negotiation context.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Pre-fill failed",
        description: err.message || "Could not generate terms. Fill manually.",
        variant: "destructive",
      });
    },
  });

  return createPortal(
    <>
      {/* Backdrop — above chat popup z-9999 */}
      <div
        className="fixed inset-0 z-[10000] bg-black/60"
        onClick={onClose}
      />

      {/* Panel — above backdrop */}
      <div
        className="fixed inset-4 z-[10001] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0 bg-background/80 backdrop-blur-sm">
          <h2 className="text-base font-semibold">Performance Contract</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => preFillMutation.mutate()}
              disabled={preFillMutation.isPending}
            >
              {preFillMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pre-filling...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> AI Pre-fill</>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ContractViewer fills the rest */}
        <div className="flex-1 overflow-auto">
          <ContractViewer
            bookingId={bookingId}
            onClose={onClose}
            prefillTerms={prefillTerms}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
