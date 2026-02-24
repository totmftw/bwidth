import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Loader2, FileText, CheckCircle, PenTool, Clock, AlertTriangle,
    Shield, Edit3, Send, X, ChevronRight, Eye, Check, Download,
    Plane, Hotel, Mic2, Users, Camera, Megaphone, XCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface ContractViewerProps {
    bookingId: number;
    onClose: () => void;
}

type ContractStep = "review" | "edit" | "accept" | "sign" | "admin_review" | "complete" | "voided";

export function ContractViewer({ bookingId, onClose }: ContractViewerProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState<ContractStep>("review");
    const [eulaChecked, setEulaChecked] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editNote, setEditNote] = useState("");
    const [editChanges, setEditChanges] = useState<Record<string, any>>({});
    const [signatureText, setSignatureText] = useState("");

    const role = user?.role === "artist" ? "artist" : (user?.role === "admin" || user?.role === "platform_admin") ? "admin" : "promoter";
    const isAdmin = role === "admin";

    // ─── 1. Initiate contract (idempotent) ──────────────────────────────
    const { mutate: initiateContract } = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/bookings/${bookingId}/contract/initiate`);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
        },
        onError: (error: any) => {
            console.error("Contract initiation error:", error);
        }
    });

    // ─── 2. Fetch contract ──────────────────────────────────────────────
    const { data: contract, isLoading, error, refetch } = useQuery({
        queryKey: [`contract-${bookingId}`],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/bookings/${bookingId}/contract`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error("Failed to fetch contract");
            }
            return await res.json();
        },
        refetchInterval: 15000,
    });

    // Auto-initiate if no contract exists
    useEffect(() => {
        if (contract === null) {
            initiateContract();
        }
    }, [contract]);

    // ─── Determine current step ─────────────────────────────────────────
    useEffect(() => {
        if (!contract) return;

        if (contract.status === "voided") { setActiveStep("voided"); return; }
        if (contract.status === "signed") { setActiveStep("complete"); return; }
        if (contract.status === "admin_review") { setActiveStep("admin_review"); return; }

        const myAccepted = role === "artist" ? contract.artistAcceptedAt : contract.promoterAcceptedAt;
        const mySigned = role === "artist" ? contract.signedByArtist : contract.signedByPromoter;
        const myReviewDone = role === "artist" ? contract.artistReviewDoneAt : contract.promoterReviewDoneAt;

        if (mySigned) setActiveStep("admin_review"); // Waiting for others or admin
        else if (myAccepted) setActiveStep("sign");
        else if (myReviewDone) setActiveStep("accept");
        else setActiveStep("review");
    }, [contract, role]);

    // ─── 3. Review (accept-as-is / propose edits) ──────────────────────
    const { mutate: reviewAction, isPending: isReviewing } = useMutation({
        mutationFn: async (data: { action: string; changes?: any; note?: string }) => {
            const res = await apiRequest("POST", `/api/contracts/${contract.id}/review`, data);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Review failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            setShowEditForm(false);
            setEditNote("");
            setEditChanges({});
            toast({ title: "Review submitted" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // ─── 4. Respond to edit request ─────────────────────────────────────
    const { mutate: respondToEdit, isPending: isResponding } = useMutation({
        mutationFn: async ({ reqId, decision, responseNote }: { reqId: number; decision: string; responseNote?: string }) => {
            const res = await apiRequest("POST", `/api/contracts/${contract.id}/edit-requests/${reqId}/respond`, { decision, responseNote });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Response failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            toast({ title: "Response recorded" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // ─── 5. Accept (EULA) ───────────────────────────────────────────────
    const { mutate: acceptContract, isPending: isAccepting } = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/contracts/${contract.id}/accept`, { agreed: true });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Accept failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            toast({ title: "Contract accepted", description: "You may now sign the contract." });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // ─── 6. Sign ────────────────────────────────────────────────────────
    const { mutate: signContract, isPending: isSigning } = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/contracts/${contract.id}/sign`, {
                signatureData: signatureText || user?.displayName || user?.username || "Signed",
                signatureMethod: "type",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Sign failed");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            toast({
                title: data.fullyExecuted ? "Contract Sent for Review!" : "Contract Signed!",
                description: data.fullyExecuted
                    ? "Both parties have signed. Contract is under admin review."
                    : "Waiting for the other party to sign."
            });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // ─── Admin Review Mutation ──────────────────────────────────────────
    const { mutate: adminReviewContract, isPending: isAdminReviewing } = useMutation({
        mutationFn: async ({ status, note }: { status: 'approved' | 'rejected', note?: string }) => {
            const res = await apiRequest("POST", `/admin/contracts/${contract.id}/review`, { status, note });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Admin review failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            queryClient.invalidateQueries({ queryKey: ["/admin/contracts/pending"] });
            toast({ title: "Contract reviewed successfully" });
            onClose();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // ─── Countdown timer ────────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
        if (!contract?.deadlineAt) return;
        const updateTimer = () => {
            const now = new Date().getTime();
            const deadline = new Date(contract.deadlineAt).getTime();
            const diff = deadline - now;
            if (diff <= 0) { setTimeLeft("Expired"); return; }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [contract?.deadlineAt]);

    // ─── Loading / Error ────────────────────────────────────────────────
    if (isLoading || (!contract && !error)) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading contract...</p>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Preparing contract...</p>
            </div>
        );
    }

    // ─── Derived state ──────────────────────────────────────────────────
    const isVoided = contract.status === "voided";
    const isFullySigned = contract.status === "signed";
    const isAdminReview = contract.status === "admin_review";
    const myEditUsed = role === "artist" ? contract.artistEditUsed : contract.promoterEditUsed;
    const myAccepted = role === "artist" ? contract.artistAcceptedAt : contract.promoterAcceptedAt;
    const mySigned = role === "artist" ? contract.signedByArtist : contract.signedByPromoter;
    const myReviewDone = role === "artist" ? contract.artistReviewDoneAt : contract.promoterReviewDoneAt;
    const pendingEditRequest = contract.editRequests?.find((er: any) => er.status === "pending");
    const isMyPendingEdit = pendingEditRequest?.requestedByRole === role;
    const deadlineExpired = timeLeft === "Expired";

    // ─── Step definitions ───────────────────────────────────────────────
    const steps = [
        { key: "review", label: "Review", icon: Eye },
        { key: "edit", label: "Edit", icon: Edit3, optional: true },
        { key: "accept", label: "Accept", icon: Check },
        { key: "sign", label: "Sign", icon: PenTool },
    ];

    const getStepStatus = (stepKey: string) => {
        if (isVoided) return "voided";
        if (stepKey === "review") return myReviewDone ? "complete" : activeStep === "review" ? "active" : "pending";
        if (stepKey === "edit") return myEditUsed ? "complete" : "optional";
        if (stepKey === "accept") return myAccepted ? "complete" : activeStep === "accept" ? "active" : "pending";
        if (stepKey === "sign") return mySigned ? "complete" : activeStep === "sign" ? "active" : "pending";
        return "pending";
    };

    // ─── Helper: set nested edit change ────────────────────────────────
    const setNestedChange = (category: string, field: string, value: any) => {
        setEditChanges(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [field]: value === "" ? undefined : value,
            }
        }));
    };

    // ─── Clean empty categories ─────────────────────────────────────────
    const cleanChanges = () => {
        const cleaned: Record<string, any> = {};
        for (const [category, fields] of Object.entries(editChanges)) {
            if (typeof fields === 'object' && fields !== null) {
                const nonEmpty = Object.fromEntries(
                    Object.entries(fields).filter(([_, v]) => v !== undefined && v !== "")
                );
                if (Object.keys(nonEmpty).length > 0) {
                    cleaned[category] = nonEmpty;
                }
            }
        }
        return cleaned;
    };

    return (
        <div className="flex flex-col h-[700px] w-full">
            {/* ═══ Header ═══ */}
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Performance Contract
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Booking #{bookingId} • Version {contract.currentVersion || 1}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isFullySigned && !isVoided && !isAdminReview && (
                            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${deadlineExpired
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                }`}>
                                <Clock className="w-3.5 h-3.5" />
                                {timeLeft || "..."}
                            </div>
                        )}
                        {isAdminReview && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
                                <Shield className="w-3 h-3 mr-1" /> Admin Review Pending
                            </Badge>
                        )}
                        {isFullySigned && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" /> Fully Signed
                            </Badge>
                        )}
                        {isVoided && (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Voided
                            </Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ═══ Step Progress ═══ */}
                <div className="flex items-center gap-1 mt-4">
                    {steps.map((step, i) => {
                        const status = getStepStatus(step.key);
                        const Icon = step.icon;
                        return (
                            <div key={step.key} className="flex items-center gap-1">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-default ${status === "complete"
                                    ? "bg-green-500/20 text-green-400"
                                    : status === "active"
                                        ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                                        : status === "optional"
                                            ? "bg-white/5 text-muted-foreground/50"
                                            : "bg-white/5 text-muted-foreground/40"
                                    }`}>
                                    {status === "complete" ? <CheckCircle className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                    {step.label}
                                    {step.optional && <span className="opacity-50 text-[10px]">(opt)</span>}
                                </div>
                                {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">
                    {/* ─── Voided Alert ─── */}
                    {isVoided && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-400">Contract Voided</p>
                                <p className="text-sm text-red-400/70 mt-1">
                                    This contract was not signed within the 48-hour deadline. The booking has been cancelled.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── Pending Edit Request Alert ─── */}
                    {pendingEditRequest && !isVoided && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <Edit3 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-amber-400">
                                        {isMyPendingEdit ? "Your Edit Request is Pending" : "Edit Request Needs Your Response"}
                                    </p>
                                    {pendingEditRequest.note && (
                                        <p className="text-sm text-muted-foreground mt-1 italic">
                                            &ldquo;{pendingEditRequest.note}&rdquo;
                                        </p>
                                    )}
                                    {/* Show categorized changes */}
                                    {pendingEditRequest.changes && (
                                        <div className="mt-2 space-y-1 text-xs">
                                            {Object.entries(pendingEditRequest.changes as any).map(([category, fields]) => (
                                                <div key={category} className="bg-white/5 rounded p-2">
                                                    <span className="font-semibold capitalize text-muted-foreground">{category}:</span>
                                                    <div className="ml-3 mt-0.5">
                                                        {typeof fields === 'object' && fields !== null
                                                            ? Object.entries(fields as any).map(([k, v]) => (
                                                                <div key={k} className="flex gap-2">
                                                                    <span className="text-muted-foreground">{k}:</span>
                                                                    <span>{String(v)}</span>
                                                                </div>
                                                            ))
                                                            : <span>{String(fields)}</span>
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!isMyPendingEdit && (
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-xs h-7"
                                                onClick={() => respondToEdit({ reqId: pendingEditRequest.id, decision: "APPROVE" })}
                                                disabled={isResponding}
                                            >
                                                {isResponding && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                                Approve Changes
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="text-xs h-7"
                                                onClick={() => respondToEdit({ reqId: pendingEditRequest.id, decision: "REJECT" })}
                                                disabled={isResponding}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Party Status Cards ─── */}
                    {!isVoided && (
                        <div className="grid grid-cols-2 gap-3">
                            <PartyStatusCard
                                label="Artist"
                                reviewed={!!contract.artistReviewDoneAt}
                                editUsed={contract.artistEditUsed}
                                accepted={!!contract.artistAcceptedAt}
                                signed={contract.signedByArtist}
                                isMe={role === "artist"}
                            />
                            <PartyStatusCard
                                label="Promoter"
                                reviewed={!!contract.promoterReviewDoneAt}
                                editUsed={contract.promoterEditUsed}
                                accepted={!!contract.promoterAcceptedAt}
                                signed={contract.signedByPromoter}
                                isMe={role === "promoter"}
                            />
                        </div>
                    )}

                    {/* ─── Contract Text ─── */}
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Contract Document</span>
                            <Badge variant="outline" className="text-[10px]">v{contract.currentVersion || 1}</Badge>
                        </div>
                        <div className="p-5 bg-white/[0.02] font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                            {contract.contractText}
                        </div>
                    </div>

                    {/* ═══ Comprehensive Edit Form ═══ */}
                    {showEditForm && !isVoided && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-primary" />
                                Propose Contract Edits
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Select categories below to modify. Core terms (fee, date, venue) are locked.
                                You can only propose edits <strong>once</strong>.
                            </p>

                            <Accordion type="multiple" className="w-full">
                                {/* ── Financial ── */}
                                <AccordionItem value="financial">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><span className="text-base">💰</span> Financial</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div>
                                            <Label className="text-xs">Payment Method</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.financial?.paymentMethod || ""}
                                                onChange={(e) => setNestedChange('financial', 'paymentMethod', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="bank_transfer">Bank Transfer</option>
                                                <option value="upi">UPI</option>
                                                <option value="card">Card</option>
                                            </select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Travel ── */}
                                <AccordionItem value="travel">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Plane className="w-4 h-4" /> Travel</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div>
                                            <Label className="text-xs">Responsibility</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.responsibility || ""}
                                                onChange={(e) => setNestedChange('travel', 'responsibility', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="artist">Artist</option>
                                                <option value="organizer">Organizer</option>
                                                <option value="shared">Shared</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Flight Class</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.flightClass || ""}
                                                onChange={(e) => setNestedChange('travel', 'flightClass', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="economy">Economy</option>
                                                <option value="premium_economy">Premium Economy</option>
                                                <option value="business">Business</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="airportPickup"
                                                checked={editChanges.travel?.airportPickup || false}
                                                onCheckedChange={(v) => setNestedChange('travel', 'airportPickup', v === true ? true : undefined)} />
                                            <Label htmlFor="airportPickup" className="text-xs">Airport Pickup</Label>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Ground Transport</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.groundTransport || ""}
                                                onChange={(e) => setNestedChange('travel', 'groundTransport', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="provided">Provided</option>
                                                <option value="not_provided">Not Provided</option>
                                                <option value="reimbursed">Reimbursed</option>
                                            </select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Accommodation ── */}
                                <AccordionItem value="accommodation">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Hotel className="w-4 h-4" /> Accommodation</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="accomIncluded"
                                                checked={editChanges.accommodation?.included || false}
                                                onCheckedChange={(v) => setNestedChange('accommodation', 'included', v === true ? true : undefined)} />
                                            <Label htmlFor="accomIncluded" className="text-xs">Accommodation Included</Label>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Hotel Star Rating</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.accommodation?.hotelStarRating || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'hotelStarRating', e.target.value ? parseInt(e.target.value) : undefined)}>
                                                <option value="">No change</option>
                                                <option value="3">3 Star</option>
                                                <option value="4">4 Star</option>
                                                <option value="5">5 Star</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Room Type</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.accommodation?.roomType || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'roomType', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="single">Single</option>
                                                <option value="double">Double</option>
                                                <option value="suite">Suite</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs">Check-in</Label>
                                                <Input type="time" className="mt-1"
                                                    value={editChanges.accommodation?.checkInTime || ""}
                                                    onChange={(e) => setNestedChange('accommodation', 'checkInTime', e.target.value || undefined)} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Check-out</Label>
                                                <Input type="time" className="mt-1"
                                                    value={editChanges.accommodation?.checkOutTime || ""}
                                                    onChange={(e) => setNestedChange('accommodation', 'checkOutTime', e.target.value || undefined)} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Nights</Label>
                                            <Input type="number" min={0} max={14} className="mt-1"
                                                value={editChanges.accommodation?.nights || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'nights', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Technical ── */}
                                <AccordionItem value="technical">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Mic2 className="w-4 h-4" /> Technical</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div>
                                            <Label className="text-xs">Sound Check Duration (mins)</Label>
                                            <Input type="number" min={15} max={180} className="mt-1" placeholder="60"
                                                value={editChanges.technical?.soundCheckDuration || ""}
                                                onChange={(e) => setNestedChange('technical', 'soundCheckDuration', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Stage Setup Time (mins)</Label>
                                            <Input type="number" min={0} max={180} className="mt-1" placeholder="30"
                                                value={editChanges.technical?.stageSetupTime || ""}
                                                onChange={(e) => setNestedChange('technical', 'stageSetupTime', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Equipment List (comma separated)</Label>
                                            <Input className="mt-1" placeholder="CDJ-3000, DJM-900NXS2, ..."
                                                value={editChanges.technical?.equipmentList?.join(', ') || ""}
                                                onChange={(e) => setNestedChange('technical', 'equipmentList',
                                                    e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined)} />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Hospitality ── */}
                                <AccordionItem value="hospitality">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Users className="w-4 h-4" /> Hospitality</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div>
                                            <Label className="text-xs">Guest List Count (0-20)</Label>
                                            <Input type="number" min={0} max={20} className="mt-1"
                                                value={editChanges.hospitality?.guestListCount || ""}
                                                onChange={(e) => setNestedChange('hospitality', 'guestListCount', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="greenRoom"
                                                checked={editChanges.hospitality?.greenRoomAccess || false}
                                                onCheckedChange={(v) => setNestedChange('hospitality', 'greenRoomAccess', v === true ? true : undefined)} />
                                            <Label htmlFor="greenRoom" className="text-xs">Green Room Access</Label>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Security Provisions</Label>
                                            <select className="w-full mt-1 px-3 py-1.5 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.hospitality?.securityProvisions || ""}
                                                onChange={(e) => setNestedChange('hospitality', 'securityProvisions', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="standard">Standard</option>
                                                <option value="enhanced">Enhanced</option>
                                            </select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Content Rights ── */}
                                <AccordionItem value="contentRights">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Camera className="w-4 h-4" /> Content Rights</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        {(['recordingAllowed', 'photographyAllowed', 'videographyAllowed', 'liveStreamingAllowed', 'socialMediaPostingAllowed'] as const).map(field => (
                                            <div key={field} className="flex items-center gap-2">
                                                <Checkbox id={field}
                                                    checked={editChanges.contentRights?.[field] || false}
                                                    onCheckedChange={(v) => setNestedChange('contentRights', field, v === true ? true : v === false ? false : undefined)} />
                                                <Label htmlFor={field} className="text-xs capitalize">
                                                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                                                </Label>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Branding ── */}
                                <AccordionItem value="branding">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> Branding & Promo</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="logoUsage"
                                                checked={editChanges.branding?.logoUsageAllowed || false}
                                                onCheckedChange={(v) => setNestedChange('branding', 'logoUsageAllowed', v === true ? true : undefined)} />
                                            <Label htmlFor="logoUsage" className="text-xs">Logo Usage Allowed</Label>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Social Media Guidelines</Label>
                                            <Textarea className="mt-1" placeholder="Posting guidelines..."
                                                value={editChanges.branding?.socialMediaGuidelines || ""}
                                                onChange={(e) => setNestedChange('branding', 'socialMediaGuidelines', e.target.value || undefined)} />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* ── Cancellation ── */}
                                <AccordionItem value="cancellation">
                                    <AccordionTrigger className="text-sm py-2"><span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancellation Policy</span></AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        <p className="text-xs text-muted-foreground italic">Artist cancellation penalties</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label className="text-[10px]">&gt;90 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.artistCancellationPenalties?.moreThan90Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            artistCancellationPenalties: {
                                                                ...(prev.cancellation?.artistCancellationPenalties || {}),
                                                                moreThan90Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">30-90 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.artistCancellationPenalties?.between30And90Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            artistCancellationPenalties: {
                                                                ...(prev.cancellation?.artistCancellationPenalties || {}),
                                                                between30And90Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">&lt;30 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.artistCancellationPenalties?.lessThan30Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            artistCancellationPenalties: {
                                                                ...(prev.cancellation?.artistCancellationPenalties || {}),
                                                                lessThan30Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground italic mt-2">Organizer cancellation penalties</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label className="text-[10px]">&gt;30 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.organizerCancellationPenalties?.moreThan30Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            organizerCancellationPenalties: {
                                                                ...(prev.cancellation?.organizerCancellationPenalties || {}),
                                                                moreThan30Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">15-30 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.organizerCancellationPenalties?.between15And30Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            organizerCancellationPenalties: {
                                                                ...(prev.cancellation?.organizerCancellationPenalties || {}),
                                                                between15And30Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">&lt;15 days (%)</Label>
                                                <Input type="number" min={0} max={100} className="mt-1"
                                                    value={editChanges.cancellation?.organizerCancellationPenalties?.lessThan15Days ?? ""}
                                                    onChange={(e) => setEditChanges(prev => ({
                                                        ...prev, cancellation: {
                                                            ...(prev.cancellation || {}),
                                                            organizerCancellationPenalties: {
                                                                ...(prev.cancellation?.organizerCancellationPenalties || {}),
                                                                lessThan15Days: e.target.value ? parseInt(e.target.value) : undefined,
                                                            }
                                                        }
                                                    }))} />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            {/* Edit note */}
                            <div>
                                <Label className="text-xs">Explanation / Notes</Label>
                                <Textarea className="mt-1" placeholder="Explain your proposed changes..."
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)} />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    className="bg-primary"
                                    onClick={() => {
                                        const cleaned = cleanChanges();
                                        if (Object.keys(cleaned).length === 0) {
                                            toast({ title: "No changes", description: "Please modify at least one field.", variant: "destructive" });
                                            return;
                                        }
                                        reviewAction({ action: "PROPOSE_EDITS", changes: cleaned, note: editNote });
                                    }}
                                    disabled={isReviewing}
                                >
                                    {isReviewing && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                    <Send className="w-3 h-3 mr-1" /> Submit Edit Request
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setShowEditForm(false); setEditChanges({}); }}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* ─── Version History ─── */}
                    {contract.versions && contract.versions.length > 1 && (
                        <div className="rounded-xl border border-white/10 p-4">
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Version History</h4>
                            <div className="space-y-1.5">
                                {contract.versions.map((v: any) => (
                                    <div key={v.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white/5 rounded">
                                        <div>
                                            <span className="font-medium">v{v.version}</span>
                                            {v.changeSummary && (
                                                <span className="text-muted-foreground ml-2">— {v.changeSummary}</span>
                                            )}
                                        </div>
                                        <span className="text-muted-foreground text-[10px]">
                                            {new Date(v.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* ═══ Action Footer ═══ */}
            <div className="border-t border-white/10 px-5 py-4 bg-card/80 backdrop-blur">
                {isVoided ? (
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                ) : isFullySigned ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Contract fully executed
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/api/contracts/${contract.id}/pdf`, '_blank')}
                            >
                                <Download className="w-3 h-3 mr-1" /> Download
                            </Button>
                            <Button variant="outline" onClick={onClose}>Close</Button>
                        </div>
                    </div>
                ) : isAdminReview ? (
                    <div className="flex justify-between items-center w-full">
                        {isAdmin ? (
                            <div className="flex gap-3 w-full justify-between items-center">
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-purple-400" />
                                    Reviewing as Admin
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        disabled={isAdminReviewing}
                                        onClick={() => adminReviewContract({ status: 'rejected' })}
                                    >
                                        {isAdminReviewing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        Reject Contract
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={isAdminReviewing}
                                        onClick={() => adminReviewContract({ status: 'approved' })}
                                    >
                                        {isAdminReviewing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve & Confirm
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                                <Shield className="w-4 h-4" />
                                Waiting for Admin Approval
                            </div>
                        )}
                        {!isAdmin && <Button variant="outline" onClick={onClose}>Close</Button>}
                    </div>
                ) : mySigned ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            You have signed. Waiting for others.
                        </div>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* STEP: REVIEW */}
                        {activeStep === "review" && !pendingEditRequest && (
                            <div className="flex items-center gap-3">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => reviewAction({ action: "ACCEPT_AS_IS" })}
                                    disabled={isReviewing || deadlineExpired}
                                >
                                    {isReviewing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Accept As-Is
                                </Button>
                                {!myEditUsed && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowEditForm(true)}
                                        disabled={deadlineExpired || showEditForm}
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Propose Edits
                                    </Button>
                                )}
                                <Button variant="ghost" onClick={onClose}>Close</Button>
                            </div>
                        )}

                        {/* STEP: ACCEPT (EULA) */}
                        {activeStep === "accept" && !pendingEditRequest && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <Checkbox
                                        id="eula-checkbox"
                                        checked={eulaChecked}
                                        onCheckedChange={(checked) => setEulaChecked(!!checked)}
                                    />
                                    <Label htmlFor="eula-checkbox" className="text-sm leading-relaxed cursor-pointer">
                                        I have read and agree to all terms and conditions outlined in this contract.
                                        I understand that this is a legally binding agreement once both parties have signed.
                                    </Label>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        className="flex-1 bg-primary"
                                        disabled={!eulaChecked || isAccepting || deadlineExpired}
                                        onClick={() => acceptContract()}
                                    >
                                        {isAccepting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        <Shield className="w-4 h-4 mr-2" />
                                        Accept and Continue to Signing
                                    </Button>
                                    <Button variant="ghost" onClick={onClose}>Close</Button>
                                </div>
                            </div>
                        )}

                        {/* STEP: SIGN */}
                        {activeStep === "sign" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground">Type your full name as signature</Label>
                                        <Input
                                            placeholder={user?.displayName || user?.username || "Your full legal name"}
                                            value={signatureText}
                                            onChange={(e) => setSignatureText(e.target.value)}
                                            className="mt-1 font-serif italic text-lg tracking-wide"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        disabled={isSigning || deadlineExpired || !signatureText.trim()}
                                        onClick={() => signContract()}
                                    >
                                        {isSigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        <PenTool className="w-4 h-4 mr-2" />
                                        Sign Contract
                                    </Button>
                                    <Button variant="ghost" onClick={onClose}>Close</Button>
                                </div>
                            </div>
                        )}

                        {/* Pending edit state */}
                        {pendingEditRequest && activeStep === "review" && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-amber-400">Edit request pending resolution...</span>
                                <Button variant="ghost" onClick={onClose}>Close</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══ Sub-components ═══

function PartyStatusCard({
    label, reviewed, editUsed, accepted, signed, isMe,
}: {
    label: string; reviewed: boolean; editUsed: boolean;
    accepted: boolean; signed: boolean; isMe: boolean;
}) {
    return (
        <div className={`rounded-lg border p-3 ${isMe ? "border-primary/30 bg-primary/5" : "border-white/10 bg-white/[0.02]"}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold">{label}</span>
                {isMe && <Badge variant="outline" className="text-[9px] px-1 py-0">You</Badge>}
            </div>
            <div className="space-y-1">
                <StatusLine label="Reviewed" done={reviewed} />
                <StatusLine label="Edit Used" done={editUsed} optional />
                <StatusLine label="Accepted" done={accepted} />
                <StatusLine label="Signed" done={signed} />
            </div>
        </div>
    );
}

function StatusLine({ label, done, optional }: { label: string; done: boolean; optional?: boolean }) {
    return (
        <div className="flex items-center gap-1.5 text-[10px]">
            {done ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
            ) : (
                <div className={`w-3 h-3 rounded-full border ${optional ? "border-white/20" : "border-white/30"}`} />
            )}
            <span className={done ? "text-green-400" : optional ? "text-muted-foreground/50" : "text-muted-foreground"}>
                {label}
            </span>
        </div>
    );
}
