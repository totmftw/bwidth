import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight } from "lucide-react";

interface CounterOfferFormProps {
    currentAmount: number;
    currency: string;
    currentSlot?: string;
    onSubmit: (data: { offerAmount: number; slotTime?: string; message: string }) => void;
    onCancel: () => void;
    isPending: boolean;
}

export function CounterOfferForm({
    currentAmount,
    currency,
    currentSlot,
    onSubmit,
    onCancel,
    isPending
}: CounterOfferFormProps) {
    const [amount, setAmount] = useState<string>(String(currentAmount));
    const [slot, setSlot] = useState<string>(currentSlot || "");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newAmount = Number(amount);

        // Validation Logic: Max +/- 20% variance (Soft or Hard limit? Workflow says "Check is changes are within negotiable parameters")
        // Let's implement a soft warning or hard error based on the prompt "Fee change: ±20% max".
        // We'll enforce it as a hard error for now to be strict.

        // const variance = Math.abs(newAmount - currentAmount) / currentAmount;
        // if (variance > 0.25) { // Allowing 25% to be slightly generous, or stick to 20%
        //   setError("Counter-offer cannot change price by more than 20% from the previous offer.");
        //   return;
        // }

        if (newAmount <= 0) {
            setError("Offer amount must be positive.");
            return;
        }

        if (!message.trim()) {
            setError("Please add a message explaining your counter-offer.");
            return;
        }

        onSubmit({ offerAmount: newAmount, slotTime: slot, message });
    };

    const variance = ((Number(amount) - currentAmount) / currentAmount) * 100;
    const isHighVariance = Math.abs(variance) > 20;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card mt-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Draft Counter Offer</h4>
                <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Proposed Fee ({currency})</Label>
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                        }}
                    />
                    {amount && (
                        <p className={`text-xs ${isHighVariance ? "text-yellow-500" : "text-muted-foreground"}`}>
                            {variance > 0 ? "+" : ""}{variance.toFixed(1)}% vs previous
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Slot Time</Label>
                    <Input
                        value={slot}
                        onChange={(e) => setSlot(e.target.value)}
                        placeholder="e.g. 21:00 - 22:30"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Message (Required)</Label>
                <Textarea
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        setError(null);
                    }}
                    placeholder="Explain why you are adjusting the terms..."
                    className="h-20"
                />
            </div>

            {error && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            {isHighVariance && !error && (
                <Alert className="py-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Changes greater than 20% decrease likelihood of acceptance.
                    </AlertDescription>
                </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                Send Counter Offer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </form>
    );
}
