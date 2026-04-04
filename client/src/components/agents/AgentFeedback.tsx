import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useAgentFeedback } from "@/hooks/use-agent";

interface AgentFeedbackProps {
  sessionId: number;
  existingRating?: "positive" | "negative" | null;
}

export function AgentFeedback({ sessionId, existingRating }: AgentFeedbackProps) {
  const [rating, setRating] = useState<"positive" | "negative" | null>(existingRating ?? null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const feedback = useAgentFeedback();

  const submit = (selectedRating: "positive" | "negative") => {
    setRating(selectedRating);
    if (!showComment) {
      setShowComment(true);
      return;
    }
    feedback.mutate({ sessionId, rating: selectedRating, comment: comment || undefined });
  };

  const submitWithComment = () => {
    if (!rating) return;
    feedback.mutate({ sessionId, rating, comment: comment || undefined });
  };

  if (feedback.isSuccess || existingRating) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {(rating ?? existingRating) === "positive" ? (
          <ThumbsUp className="h-4 w-4 text-green-600" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-600" />
        )}
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submit("positive")}
          disabled={feedback.isPending}
          className={rating === "positive" ? "text-green-600" : ""}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submit("negative")}
          disabled={feedback.isPending}
          className={rating === "negative" ? "text-red-600" : ""}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
      {showComment && (
        <div className="space-y-2">
          <Textarea
            placeholder="Optional: tell us more..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button size="sm" onClick={submitWithComment} disabled={feedback.isPending}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
