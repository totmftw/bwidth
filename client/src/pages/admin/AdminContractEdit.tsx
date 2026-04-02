import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractDetail {
  id: number;
  status: string;
  bookingId: number;
  contractText: string;
  pdfUrl?: string;
  adminReviewNote?: string;
  adminReviewStatus?: string;
  artistSignedAt?: string;
  promoterSignedAt?: string;
  signerSequence?: string;
  version: number;
  initiatedAt: string;
  finalizedAt?: string;
  booking?: {
    id: number;
    status: string;
    artist?: { name: string };
    organizer?: { name: string };
  };
  versions?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  "draft",
  "sent",
  "signed_by_promoter",
  "signed_by_artist",
  "admin_review",
  "signed",
  "completed",
];

const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "signed_by_promoter",
  "signed_by_artist",
  "admin_review",
  "signed",
  "voided",
  "completed",
];

function ContractStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    sent: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    signed_by_promoter: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    signed_by_artist: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    admin_review: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    signed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    voided: "bg-red-500/15 text-red-400 border-red-500/25",
    completed: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  };
  return (
    <Badge
      className={`border ${cfg[status] ?? "bg-muted/50 text-muted-foreground border-white/10"}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatDate(iso: string | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FlowIndicator({ status }: { status: string }) {
  const currentIdx = FLOW_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {FLOW_STEPS.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : isPast
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/[0.03] text-muted-foreground border border-white/5"
              }`}
            >
              {isPast && <CheckCircle2 className="w-3 h-3" />}
              {isCurrent && <Shield className="w-3 h-3" />}
              <span>{step.replace(/_/g, " ")}</span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div
                className={`w-4 h-px mx-0.5 ${isPast || isCurrent ? "bg-primary/30" : "bg-white/10"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminContractEdit() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "">("");
  const [reviewNote, setReviewNote] = useState("");
  const [forceStatus, setForceStatus] = useState("");

  const { data: contract, isLoading, isError } = useQuery<ContractDetail>({
    queryKey: ["/api/admin/contracts", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/contracts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contract");
      return res.json();
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewDecision) throw new Error("Select approve or reject");
      const res = await fetch(`/api/admin/contracts/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: reviewDecision, note: reviewNote }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Review failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review submitted" });
      setReviewDecision("");
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts/pending"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

  const forceStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: forceStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contract status updated" });
      setForceStatus("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts", id] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load contract.</p>
        <Link href="/admin/contracts">
          <Button variant="outline" className="border-white/10">
            Back to Contracts
          </Button>
        </Link>
      </div>
    );
  }

  const showReviewPanel =
    contract.status === "admin_review" || contract.status === "signed_by_artist";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <Link href="/admin/contracts">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5 bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Contract #{contract.id}</h1>
            <ContractStatusBadge status={contract.status} />
          </div>
        </div>
      </motion.div>

      {/* Flow Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="bg-card/40 border border-white/5 rounded-xl p-4 overflow-x-auto"
      >
        <FlowIndicator status={contract.status} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Admin Review Panel */}
          {showReviewPanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
            >
              <Card className="bg-orange-500/5 backdrop-blur-xl border border-orange-500/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-orange-400">
                    <Shield className="w-4 h-4" />
                    Admin Review Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Decision</Label>
                    <Select
                      value={reviewDecision}
                      onValueChange={(v) => setReviewDecision(v as any)}
                    >
                      <SelectTrigger className="bg-card/40 border-white/10">
                        <SelectValue placeholder="Select approve or reject…" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        <SelectItem value="approved">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Approve
                          </span>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <span className="flex items-center gap-2">
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            Reject
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Review Note</Label>
                    <Textarea
                      rows={3}
                      placeholder="Notes for the parties…"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                    />
                  </div>
                  <Button
                    onClick={() => reviewMutation.mutate()}
                    disabled={!reviewDecision || reviewMutation.isPending}
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Submit Review
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Contract Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Contract Text</CardTitle>
              </CardHeader>
              <CardContent>
                {contract.contractText ? (
                  <pre className="text-xs text-muted-foreground font-mono bg-black/20 rounded-lg p-4 overflow-auto max-h-[500px] whitespace-pre-wrap leading-relaxed">
                    {contract.contractText}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No contract text generated yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="space-y-4">
          {/* Contract Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Contract Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Booking ID
                  </p>
                  <p className="font-mono font-medium mt-0.5">#{contract.bookingId}</p>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Version
                  </p>
                  <p className="font-medium mt-0.5">v{contract.version}</p>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Initiated
                  </p>
                  <p className="font-medium mt-0.5">{formatDate(contract.initiatedAt) ?? "—"}</p>
                </div>
                {contract.finalizedAt && (
                  <>
                    <Separator className="bg-white/5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Finalized
                      </p>
                      <p className="font-medium mt-0.5">{formatDate(contract.finalizedAt)}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Signatures */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Promoter
                    </p>
                    <p className="font-medium mt-0.5">
                      {formatDate(contract.promoterSignedAt) ?? "Pending"}
                    </p>
                  </div>
                  {contract.promoterSignedAt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Artist
                    </p>
                    <p className="font-medium mt-0.5">
                      {formatDate(contract.artistSignedAt) ?? "Pending"}
                    </p>
                  </div>
                  {contract.artistSignedAt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Admin Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Force Status</Label>
                  <Select value={forceStatus} onValueChange={setForceStatus}>
                    <SelectTrigger className="bg-card/40 border-white/10">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      {CONTRACT_STATUSES.filter((s) => s !== contract.status).map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => forceStatusMutation.mutate()}
                  disabled={!forceStatus || forceStatusMutation.isPending}
                  variant="outline"
                  className="w-full border-white/10 hover:border-primary/30 gap-2"
                >
                  {forceStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Apply
                </Button>

                {contract.pdfUrl && (
                  <>
                    <Separator className="bg-white/5" />
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        className="w-full border-white/10 hover:border-primary/30 gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View PDF
                      </Button>
                    </a>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
