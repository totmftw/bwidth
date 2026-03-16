import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function ContractSetup() {
    const { user } = useAuth();
    const [, navigate] = useLocation();

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                    onClick={() => navigate("/bookings")}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Bookings
                </Button>
                <h1 className="text-3xl font-display font-bold">Contract Setup</h1>
                <p className="text-muted-foreground">
                    Generate and sign a contract for your booking
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="glass-card border-white/5 overflow-hidden">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto">
                            <FileText className="w-10 h-10 text-primary" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">Contract Workflow Coming Soon</h2>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                The contract generation and signing workflow is being built.
                                Once ready, you'll be able to generate, review, and digitally sign contracts directly here.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                <span className="text-xs font-medium text-emerald-500">Negotiation Complete</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <FileText className="w-6 h-6 text-primary" />
                                <span className="text-xs font-medium text-primary">Contract Generation</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border">
                                <Clock className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Signing & Review</span>
                            </div>
                        </div>

                        <Button
                            className="bg-primary gap-2"
                            onClick={() => navigate("/bookings")}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Bookings
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
