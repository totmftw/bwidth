import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Loader2, FileText, CheckCircle, PenTool, Clock, AlertTriangle,
    Shield, Edit3, X, ChevronRight, Check, Download,
    Calendar as CalendarIcon
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollableTimePicker } from "@/components/ScrollableTimePicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

interface ContractViewerProps {
    bookingId: number;
    onClose: () => void;
}

type ContractStep = "review" | "edit" | "accept" | "sign" | "admin_review" | "complete" | "voided";
type EditPhase = "organizer_review" | "artist_review" | "ready_to_sign";

export default function ContractPage() {
    const [, params] = useRoute("/contract/:id");
    const [, setLocation] = useLocation();
    const bookingId = params?.id ? parseInt(params.id) : 0;

    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState<ContractStep>("review");
    const [eulaChecked, setEulaChecked] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editNote, setEditNote] = useState("");
    const [editChanges, setEditChanges] = useState<Record<string, any>>({});
    const [signatureText, setSignatureText] = useState(() => user?.name || (user as any)?.displayName || user?.username || "");
    const [hasReadContract, setHasReadContract] = useState(false);
    const contractRef = useRef<HTMLDivElement>(null);

    const handleContractScroll = () => {
        const el = contractRef.current;
        if (!el || hasReadContract) return;
        const pct = (el.scrollTop + el.clientHeight) / el.scrollHeight;
        if (pct >= 0.9) setHasReadContract(true);
    };

    const role = user?.role === "artist" ? "artist" : (user?.role === "admin" || user?.role === "platform_admin") ? "admin" : "promoter";
    const isAdmin = role === "admin";

    // ─── 1. Fetch contract ──────────────────────────────────────────────
    const { data: contract, isLoading, error, refetch } = useQuery({
        queryKey: [`contract-${bookingId}`],
        queryFn: async () => {
            const res = await fetch(`/api/bookings/${bookingId}/contract`, { credentials: "include" });
            if (!res.ok) {
                if (res.status === 404) return null;
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to fetch contract");
            }
            return await res.json();
        },
        refetchInterval: 15000,
    });

    // ─── Derive currentPhase from server-provided editPhase ─────────────
    const editPhase: EditPhase = (contract?.editPhase as EditPhase) || "organizer_review";

    let currentPhase: string;
    if (contract?.status === "voided") currentPhase = "voided";
    else if (contract?.status === "signed" || contract?.status === "completed") currentPhase = "complete";
    else if (contract?.status === "admin_review") currentPhase = "admin_review";
    else if (contract?.signedByPromoter || contract?.signedByArtist) currentPhase = "signing";
    else if (editPhase === "ready_to_sign") currentPhase = "signing";
    else if (editPhase === "artist_review") currentPhase = "artist_review";
    else currentPhase = "organizer_review";

    // Keep legacy activeStep in sync for the signing/accept sub-steps
    useEffect(() => {
        if (!contract) return;
        if (contract.status === "voided") { setActiveStep("voided"); return; }
        if (contract.status === "signed") { setActiveStep("complete"); return; }
        if (contract.status === "admin_review") { setActiveStep("admin_review"); return; }

        const myAccepted = role === "artist" ? contract.artistAcceptedAt : contract.promoterAcceptedAt;
        const mySigned = role === "artist" ? contract.signedByArtist : contract.signedByPromoter;

        if (mySigned) setActiveStep("admin_review");
        else if (myAccepted) setActiveStep("sign");
        else setActiveStep("review");
    }, [contract, role]);

    // ─── 3. Review (accept-as-is / propose edits) ──────────────────────
    const { mutate: reviewAction, isPending: isReviewing } = useMutation({
        mutationFn: async (data: { action: string; changes?: any; note?: string }) => {
            const res = await fetch(`/api/contracts/${contract.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include"
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
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

    // ─── 4. Accept (EULA) — after review phase is complete ─────────────
    const { mutate: acceptContract, isPending: isAccepting } = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/contracts/${contract.id}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agreed: true }),
                credentials: "include"
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
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
            const res = await fetch(`/api/contracts/${contract.id}/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signatureData: signatureText || user?.displayName || user?.username || "Signed",
                    signatureMethod: "type",
                }),
                credentials: "include"
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
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
            const res = await fetch(`/api/admin/contracts/${contract.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, note }),
                credentials: "include"
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Admin review failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`contract-${bookingId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts/pending"] });
            toast({ title: "Contract reviewed successfully" });
            setLocation("/dashboard");
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

    const contractSections = contract?.contractText?.split(/(?=\n\d+\.\s+[A-Z])/) || [];
    const [activeEditCategory, setActiveEditCategory] = useState<string | null>(null);

    // ─── Loading / Error ────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading contract...</p>
            </div>
        );
    }

    if (!contract && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Contract is being generated...</p>
                <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed to load contract.</p>
                <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
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

    const commissionBreakdown = contract.commissionBreakdownJson;
    const deadlineExpired = timeLeft === "Expired";

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
        <div className="flex flex-col min-h-screen w-full bg-background">
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
                        <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="h-8 w-8">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ═══ Phase Indicator ═══ */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
                    {(["Organizer Review", "Artist Review", "Signing", "Admin Review", "Complete"] as const).map((label, i) => {
                        const phases = ["organizer_review", "artist_review", "signing", "admin_review", "complete"];
                        const isActive = phases[i] === currentPhase;
                        const isPast = phases.indexOf(currentPhase) > i;
                        return (
                            <div key={label} className="flex items-center gap-1 shrink-0">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                                    isPast ? "bg-primary text-primary-foreground" :
                                    isActive ? "bg-primary/20 text-primary border-2 border-primary" :
                                    "bg-white/5 text-muted-foreground/50"
                                )}>
                                    {isPast ? <Check className="w-3 h-3" /> : i + 1}
                                </div>
                                <span className={cn(
                                    "text-xs hidden md:block whitespace-nowrap",
                                    isActive && "font-semibold text-foreground",
                                    !isActive && "text-muted-foreground/60"
                                )}>{label}</span>
                                {i < 4 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
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

                    {/* ─── Phase Banner: show waiting message for non-active party ─── */}
                    {!isVoided && currentPhase === "organizer_review" && role === "artist" && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                            <p className="text-sm text-blue-400">Waiting for the organizer to review and finalize the contract.</p>
                        </div>
                    )}
                    {!isVoided && currentPhase === "artist_review" && role === "promoter" && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                            <p className="text-sm text-blue-400">Waiting for the artist to review the contract.</p>
                        </div>
                    )}

                    {/* ─── Single Line Status Tracker ─── */}
                    {!isVoided && (
                        <div className="w-full overflow-x-auto scrollbar-hide py-1">
                            <div className="flex items-center gap-4 text-xs whitespace-nowrap min-w-max px-1">
                                {/* Artist Status */}
                                <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${role === 'artist' ? 'text-primary' : ''}`}>Artist {role === 'artist' && '(You)'}</span>
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Reviewed" done={!!contract.artistReviewDoneAt} />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Edit Used" done={contract.artistEditUsed} optional />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Accepted" done={!!contract.artistAcceptedAt} />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Signed" done={contract.signedByArtist} />
                                </div>
                                
                                <div className="w-px h-4 bg-white/20 mx-2"></div>

                                {/* Promoter Status */}
                                <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${role === 'promoter' ? 'text-primary' : ''}`}>Promoter {role === 'promoter' && '(You)'}</span>
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Reviewed" done={!!contract.promoterReviewDoneAt} />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Edit Used" done={contract.promoterEditUsed} optional />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Accepted" done={!!contract.promoterAcceptedAt} />
                                    <span className="text-muted-foreground/50">•</span>
                                    <TrackerItem label="Signed" done={contract.signedByPromoter} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Warning: unfilled legal placeholders ─── */}
                    {contract.contractText?.includes('[') && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <span className="font-semibold text-amber-500">Legal details incomplete.</span>
                                {" "}The contract contains placeholder text (missing PAN/GSTIN/address).{" "}
                                <a href="/profile" className="text-primary underline">Complete Legal & Bank profile →</a>
                            </div>
                        </div>
                    )}

                    {/* ─── Contract Text ─── */}
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Contract Document</span>
                            <Badge variant="outline" className="text-[10px]">v{contract.currentVersion || 1}</Badge>
                        </div>
                        <div
                            ref={contractRef}
                            onScroll={handleContractScroll}
                            className="p-5 bg-white/[0.02] font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                        >
                            {contractSections.map((section: string, idx: number) => {
                                let editKey = null;
                                if (section.includes("1. EVENT DETAILS")) editKey = "core";
                                else if (section.includes("2. TRAVEL")) editKey = "travel";
                                else if (section.includes("3. PAYMENT TERMS")) editKey = "financial";
                                else if (section.includes("4. BILLING")) editKey = "branding";
                                else if (section.includes("5. HOSPITALITY")) editKey = "hospitality";
                                else if (section.includes("6. EQUIPMENT")) editKey = "technical";
                                else if (section.includes("7. INTELLECTUAL PROPERTY")) editKey = "contentRights";
                                else if (section.includes("8. CANCELLATION")) editKey = "cancellation";

                                const isMyReviewPhase = (currentPhase === "organizer_review" && role === "promoter") ||
                                    (currentPhase === "artist_review" && role === "artist");
                                const canEdit = !isVoided && isMyReviewPhase && !myEditUsed;

                                return (
                                    <div key={idx} className="relative group mb-6">
                                        {editKey && canEdit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="absolute -top-2 right-0 h-7 text-xs bg-card/80 backdrop-blur"
                                                onClick={() => {
                                                    setActiveEditCategory(editKey);
                                                    setShowEditForm(true);
                                                }}
                                            >
                                                <Edit3 className="w-3 h-3 mr-1" /> Edit
                                            </Button>
                                        )}
                                        <div>{section}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {!hasReadContract && (
                            <div className="px-4 py-1.5 bg-white/5 border-t border-white/10 text-[10px] text-muted-foreground text-center">
                                ↓ Scroll to read full contract before accepting
                            </div>
                        )}
                    </div>

                    {/* ═══ Inline Edit Form Sheet ═══ */}
                    <Sheet open={showEditForm} onOpenChange={setShowEditForm}>
                        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl px-4 py-6">
                            <SheetHeader className="mb-4">
                                <SheetTitle className="flex items-center gap-2 text-lg">
                                    <Edit3 className="w-5 h-5 text-primary" />
                                    Edit {activeEditCategory ? activeEditCategory.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'Terms'}
                                </SheetTitle>
                            </SheetHeader>

                            <div className="space-y-4">
                                {activeEditCategory === "core" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold">Event Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal bg-background/80 h-12",
                                                            !editChanges.core?.eventDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                        {editChanges.core?.eventDate ? format(new Date(editChanges.core.eventDate), "dd MMM yyyy") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={editChanges.core?.eventDate ? new Date(editChanges.core.eventDate) : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const dateStr = format(date, "yyyy-MM-dd");
                                                                setNestedChange('core', 'eventDate', dateStr);
                                                            } else {
                                                                setNestedChange('core', 'eventDate', undefined);
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold">Slot Time</Label>
                                            <ScrollableTimePicker 
                                                value={editChanges.core?.slotTime || ""}
                                                onChange={(val) => setNestedChange('core', 'slotTime', val || undefined)}
                                                className="h-12 bg-background/80"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeEditCategory === "financial" && (
                                    <div>
                                        <Label className="text-sm">Payment Method</Label>
                                        <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                            value={editChanges.financial?.paymentMethod || ""}
                                            onChange={(e) => setNestedChange('financial', 'paymentMethod', e.target.value || undefined)}>
                                            <option value="">No change</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="upi">UPI</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </div>
                                )}

                                {activeEditCategory === "travel" && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm">Responsibility</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.responsibility || ""}
                                                onChange={(e) => setNestedChange('travel', 'responsibility', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="artist">Artist</option>
                                                <option value="organizer">Organizer</option>
                                                <option value="shared">Shared</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Flight Class</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.flightClass || ""}
                                                onChange={(e) => setNestedChange('travel', 'flightClass', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="economy">Economy</option>
                                                <option value="premium_economy">Premium Economy</option>
                                                <option value="business">Business</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3 py-2">
                                            <Checkbox id="airportPickup" className="w-5 h-5"
                                                checked={editChanges.travel?.airportPickup || false}
                                                onCheckedChange={(v) => setNestedChange('travel', 'airportPickup', v === true ? true : undefined)} />
                                            <Label htmlFor="airportPickup" className="text-sm">Airport Pickup</Label>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Ground Transport</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.travel?.groundTransport || ""}
                                                onChange={(e) => setNestedChange('travel', 'groundTransport', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="provided">Provided</option>
                                                <option value="not_provided">Not Provided</option>
                                                <option value="reimbursed">Reimbursed</option>
                                            </select>
                                        </div>
                                        <hr className="border-white/10 my-4" />
                                        <div className="flex items-center gap-3 py-2">
                                            <Checkbox id="accomIncluded" className="w-5 h-5"
                                                checked={editChanges.accommodation?.included || false}
                                                onCheckedChange={(v) => setNestedChange('accommodation', 'included', v === true ? true : undefined)} />
                                            <Label htmlFor="accomIncluded" className="text-sm">Accommodation Included</Label>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Hotel Star Rating</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.accommodation?.hotelStarRating || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'hotelStarRating', e.target.value ? parseInt(e.target.value) : undefined)}>
                                                <option value="">No change</option>
                                                <option value="3">3 Star</option>
                                                <option value="4">4 Star</option>
                                                <option value="5">5 Star</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Room Type</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.accommodation?.roomType || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'roomType', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="single">Single</option>
                                                <option value="double">Double</option>
                                                <option value="suite">Suite</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm">Check-in</Label>
                                                <Input type="time" className="mt-1 h-12"
                                                    value={editChanges.accommodation?.checkInTime || ""}
                                                    onChange={(e) => setNestedChange('accommodation', 'checkInTime', e.target.value || undefined)} />
                                            </div>
                                            <div>
                                                <Label className="text-sm">Check-out</Label>
                                                <Input type="time" className="mt-1 h-12"
                                                    value={editChanges.accommodation?.checkOutTime || ""}
                                                    onChange={(e) => setNestedChange('accommodation', 'checkOutTime', e.target.value || undefined)} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Nights</Label>
                                            <Input type="number" min={0} max={14} className="mt-1 h-12"
                                                value={editChanges.accommodation?.nights || ""}
                                                onChange={(e) => setNestedChange('accommodation', 'nights', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                    </div>
                                )}

                                {activeEditCategory === "hospitality" && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm">Guest List Count (0-20)</Label>
                                            <Input type="number" min={0} max={20} className="mt-1 h-12"
                                                value={editChanges.hospitality?.guestListCount || ""}
                                                onChange={(e) => setNestedChange('hospitality', 'guestListCount', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div className="flex items-center gap-3 py-2">
                                            <Checkbox id="greenRoom" className="w-5 h-5"
                                                checked={editChanges.hospitality?.greenRoomAccess || false}
                                                onCheckedChange={(v) => setNestedChange('hospitality', 'greenRoomAccess', v === true ? true : undefined)} />
                                            <Label htmlFor="greenRoom" className="text-sm">Green Room Access</Label>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Security Provisions</Label>
                                            <select className="w-full mt-1 px-3 h-12 rounded-md bg-background border border-white/10 text-sm"
                                                value={editChanges.hospitality?.securityProvisions || ""}
                                                onChange={(e) => setNestedChange('hospitality', 'securityProvisions', e.target.value || undefined)}>
                                                <option value="">No change</option>
                                                <option value="standard">Standard</option>
                                                <option value="enhanced">Enhanced</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {activeEditCategory === "technical" && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm">Sound Check Duration (mins)</Label>
                                            <Input type="number" min={15} max={180} className="mt-1 h-12" placeholder="60"
                                                value={editChanges.technical?.soundCheckDuration || ""}
                                                onChange={(e) => setNestedChange('technical', 'soundCheckDuration', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div>
                                            <Label className="text-sm">Stage Setup Time (mins)</Label>
                                            <Input type="number" min={0} max={180} className="mt-1 h-12" placeholder="30"
                                                value={editChanges.technical?.stageSetupTime || ""}
                                                onChange={(e) => setNestedChange('technical', 'stageSetupTime', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                        <div>
                                            <Label className="text-sm">Equipment List (comma separated)</Label>
                                            <Input className="mt-1 h-12" placeholder="CDJ-3000, DJM-900NXS2, ..."
                                                value={editChanges.technical?.equipmentList?.join(', ') || ""}
                                                onChange={(e) => setNestedChange('technical', 'equipmentList',
                                                    e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined)} />
                                        </div>
                                    </div>
                                )}

                                {activeEditCategory === "contentRights" && (
                                    <div className="space-y-4">
                                        {(['recordingAllowed', 'photographyAllowed', 'videographyAllowed', 'liveStreamingAllowed', 'socialMediaPostingAllowed'] as const).map(field => (
                                            <div key={field} className="flex items-center gap-3 py-2">
                                                <Checkbox id={field} className="w-5 h-5"
                                                    checked={editChanges.contentRights?.[field] || false}
                                                    onCheckedChange={(v) => setNestedChange('contentRights', field, v === true ? true : v === false ? false : undefined)} />
                                                <Label htmlFor={field} className="text-sm capitalize">
                                                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeEditCategory === "branding" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 py-2">
                                            <Checkbox id="logoUsage" className="w-5 h-5"
                                                checked={editChanges.branding?.logoUsageAllowed || false}
                                                onCheckedChange={(v) => setNestedChange('branding', 'logoUsageAllowed', v === true ? true : undefined)} />
                                            <Label htmlFor="logoUsage" className="text-sm">Logo Usage Allowed</Label>
                                        </div>
                                        <div>
                                            <Label className="text-sm">Social Media Guidelines</Label>
                                            <Textarea className="mt-1 min-h-[100px]" placeholder="Posting guidelines..."
                                                value={editChanges.branding?.socialMediaGuidelines || ""}
                                                onChange={(e) => setNestedChange('branding', 'socialMediaGuidelines', e.target.value || undefined)} />
                                        </div>
                                    </div>
                                )}

                                {activeEditCategory === "cancellation" && (
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-sm font-semibold mb-3">Artist Cancellation Penalties</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <Label className="text-xs">&gt;90 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                                    <Label className="text-xs">30-90 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                                    <Label className="text-xs">&lt;30 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold mb-3">Organizer Cancellation Penalties</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <Label className="text-xs">&gt;30 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                                    <Label className="text-xs">15-30 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                                    <Label className="text-xs">&lt;15 days (%)</Label>
                                                    <Input type="number" min={0} max={100} className="mt-1 h-12"
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
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-sm">Explanation / Notes</Label>
                                    <Textarea className="mt-1 min-h-[80px]" placeholder="Explain your proposed changes..."
                                        value={editNote}
                                        onChange={(e) => setEditNote(e.target.value)} />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        className="w-full h-12 bg-primary"
                                        onClick={() => {
                                            const cleaned = cleanChanges();
                                            if (Object.keys(cleaned).length === 0) {
                                                toast({ title: "No changes", description: "Please modify at least one field.", variant: "destructive" });
                                                return;
                                            }
                                            reviewAction({ action: "PROPOSE_EDITS", changes: cleaned, note: editNote });
                                            setShowEditForm(false);
                                        }}
                                        disabled={isReviewing}
                                    >
                                        {isReviewing && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                                        Submit Proposed Edits
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

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
            <div className="border-t border-white/10 px-5 py-4 bg-card/80 backdrop-blur sticky bottom-0">
                {isVoided ? (
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setLocation("/dashboard")}>Close</Button>
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
                            <Button variant="outline" onClick={() => setLocation("/dashboard")}>Close</Button>
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
                        {!isAdmin && <Button variant="outline" onClick={() => setLocation("/dashboard")}>Close</Button>}
                    </div>
                ) : mySigned ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            You have signed. Waiting for others.
                        </div>
                        <Button variant="outline" onClick={() => setLocation("/dashboard")}>Close</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* STEP: REVIEW — only shown to the party whose turn it is */}
                        {activeStep === "review" && (
                            (currentPhase === "organizer_review" && role === "promoter") ||
                            (currentPhase === "artist_review" && role === "artist")
                        ) && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <Button
                                        className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                                        onClick={() => reviewAction({ action: "ACCEPT_AS_IS" })}
                                        disabled={isReviewing || deadlineExpired || !hasReadContract}
                                        title={!hasReadContract ? "Scroll to read the full contract first" : undefined}
                                    >
                                        {isReviewing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {hasReadContract ? "Accept As-Is" : "Read Contract First ↓"}
                                    </Button>
                                    {!myEditUsed && (
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12"
                                            onClick={() => {
                                                setActiveEditCategory("core");
                                                setShowEditForm(true);
                                            }}
                                            disabled={deadlineExpired || showEditForm}
                                        >
                                            <Edit3 className="w-4 h-4 mr-2" />
                                            Propose Edits
                                        </Button>
                                    )}
                                </div>
                                <Button variant="ghost" className="h-12 w-full" onClick={() => setLocation("/dashboard")}>Close</Button>
                            </div>
                        )}

                        {/* STEP: ACCEPT (EULA) */}
                        {activeStep === "accept" && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                                    <Checkbox
                                        id="eula-checkbox"
                                        checked={eulaChecked}
                                        className="mt-1"
                                        onCheckedChange={(checked) => setEulaChecked(!!checked)}
                                    />
                                    <Label htmlFor="eula-checkbox" className="text-sm leading-relaxed cursor-pointer">
                                        I have read and agree to all terms and conditions outlined in this contract.
                                        I understand that this is a legally binding agreement once both parties have signed.
                                    </Label>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full h-12 bg-primary"
                                        disabled={!eulaChecked || isAccepting || deadlineExpired}
                                        onClick={() => acceptContract()}
                                    >
                                        {isAccepting && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                                        <Shield className="w-5 h-5 mr-2" />
                                        Accept and Continue to Signing
                                    </Button>
                                    <Button variant="ghost" className="h-12 w-full" onClick={() => setLocation("/dashboard")}>Close</Button>
                                </div>
                            </div>
                        )}

                        {/* STEP: SIGN */}
                        {activeStep === "sign" && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm text-muted-foreground mb-2 block">Type your full name as signature</Label>
                                    <Input
                                        placeholder={user?.displayName || user?.username || "Your full legal name"}
                                        value={signatureText}
                                        onChange={(e) => setSignatureText(e.target.value)}
                                        className="font-serif italic text-lg tracking-wide h-14"
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full h-12 bg-green-600 hover:bg-green-700"
                                        disabled={isSigning || deadlineExpired || !signatureText.trim()}
                                        onClick={() => signContract()}
                                    >
                                        {isSigning && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                                        <PenTool className="w-5 h-5 mr-2" />
                                        Sign Contract
                                    </Button>
                                    <Button variant="ghost" className="h-12 w-full" onClick={() => setLocation("/dashboard")}>Close</Button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

// ═══ Sub-components ═══

function TrackerItem({ label, done, optional }: { label: string; done: boolean; optional?: boolean }) {
    return (
        <div className="flex items-center gap-1">
            <span className={done ? "text-foreground" : optional ? "text-muted-foreground/50" : "text-muted-foreground/70"}>
                {label}
            </span>
            {done ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
            ) : (
                <Clock className="w-3 h-3 text-muted-foreground/50" />
            )}
        </div>
    );
}
