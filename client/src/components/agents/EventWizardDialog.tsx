import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, AlertCircle } from "lucide-react";
import { useEventWizardRun, useEventWizardRefine } from "@/hooks/use-agent";
import { AgentFeedback } from "./AgentFeedback";

interface EventWizardResult {
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | null;
  visibility?: "public" | "private";
  stages?: Array<{ name: string; startTime?: string; endTime?: string }>;
  confidence?: number;
  suggestions?: string[];
}

interface EventWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: EventWizardResult) => void;
}

export function EventWizardDialog({ open, onOpenChange, onApply }: EventWizardDialogProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<EventWizardResult | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [refineText, setRefineText] = useState("");

  const run = useEventWizardRun();
  const refine = useEventWizardRefine();

  const handleExtract = () => {
    if (!text.trim()) return;
    run.mutate(
      { text },
      {
        onSuccess: (data) => {
          setResult(data.result);
          setSessionId(data.sessionId);
        },
      },
    );
  };

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  const handleRefine = () => {
    if (!sessionId || !refineText.trim()) return;
    refine.mutate(
      { sessionId, instruction: refineText },
      {
        onSuccess: (data) => {
          setResult(data.result);
          setRefineText("");
        },
      },
    );
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      onOpenChange(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setText("");
      setResult(null);
      setSessionId(null);
      setRefineText("");
    }
    onOpenChange(isOpen);
  };

  const isPending = run.isPending || refine.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Event Wizard
          </DialogTitle>
          <DialogDescription>
            Describe your event or paste details, and the AI will extract structured data to pre-fill your form.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Describe Event</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="space-y-3">
                <Textarea
                  placeholder="Paste or type your event description here... e.g. 'Rock concert at Phoenix Marketcity, Bangalore on 15th June 2026, 7PM to 11PM, capacity 500, featuring local indie bands'"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </TabsContent>
              <TabsContent value="upload" className="space-y-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a .txt file with event details
                  </p>
                  <input
                    type="file"
                    accept=".txt,.text"
                    onChange={handleFileRead}
                    className="text-sm"
                  />
                </div>
                {text && (
                  <p className="text-sm text-muted-foreground">
                    File loaded ({text.length} characters)
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {run.isError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {run.error.message}
              </div>
            )}

            <Button onClick={handleExtract} disabled={!text.trim() || isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Event Details
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Extracted Details</CardTitle>
                  {result.confidence != null && (
                    <Badge variant="outline" className={result.confidence >= 0.7 ? "text-green-700" : "text-yellow-700"}>
                      {Math.round(result.confidence * 100)}% confident
                    </Badge>
                  )}
                </div>
                {result.confidence != null && (
                  <Progress value={result.confidence * 100} className="h-1.5" />
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {result.title && (
                  <div><span className="font-medium">Title:</span> {result.title}</div>
                )}
                {result.date && (
                  <div><span className="font-medium">Date:</span> {result.date}</div>
                )}
                {(result.startTime || result.endTime) && (
                  <div>
                    <span className="font-medium">Time:</span>{" "}
                    {result.startTime}{result.endTime ? ` - ${result.endTime}` : ""}
                  </div>
                )}
                {result.capacity != null && (
                  <div><span className="font-medium">Capacity:</span> {result.capacity}</div>
                )}
                {result.visibility && (
                  <div><span className="font-medium">Visibility:</span> {result.visibility}</div>
                )}
                {result.description && (
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{result.description}</p>
                  </div>
                )}
                {result.stages && result.stages.length > 0 && (
                  <div>
                    <span className="font-medium">Stages:</span>
                    <ul className="mt-1 list-disc list-inside text-muted-foreground">
                      {result.stages.map((s, i) => (
                        <li key={i}>
                          {s.name} {s.startTime && `(${s.startTime}${s.endTime ? ` - ${s.endTime}` : ""})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.suggestions && result.suggestions.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Suggestions</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="Want to adjust something? e.g. 'Change the time to 8PM' or 'Add a VIP stage'"
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={!refineText.trim() || isPending}
              >
                {refine.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                Refine
              </Button>
            </div>

            {sessionId && <AgentFeedback sessionId={sessionId} />}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} className="flex-1">
                Apply to Form
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setSessionId(null); }}>
                Start Over
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
