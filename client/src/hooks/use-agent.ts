import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// AGENT CONFIG + LLM CONFIG
// ============================================================================

export type ProviderConfig = {
  provider: string;
  model: string;
  hasKey: boolean;
  isActive: boolean;
  ollamaBaseUrl: string | null;
  isValid: boolean | null;
};

export type AgentConfigData = {
  agents: Array<{
    agentType: string;
    displayName: string;
    description: string | null;
    enabled: boolean;
    allowedRoles: string[];
  }>;
  providerConfigs: ProviderConfig[];
  activeProvider: string | null;
};

export function useAgentConfig() {
  return useQuery({
    queryKey: [api.agents.config.path],
    queryFn: async () => {
      const res = await fetch(api.agents.config.path);
      if (!res.ok) throw new Error("Failed to fetch agent config");
      return await res.json() as AgentConfigData;
    },
  });
}

export function useUpdateLlmConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      provider: string;
      model: string;
      apiKey?: string;
      ollamaBaseUrl?: string;
      openrouterModel?: string;
      setActive?: boolean;
    }) => {
      const res = await fetch(api.agents.llmConfig.update.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save LLM config");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.config.path] });
      toast({ title: "Saved", description: "API key saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteLlmConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch(api.agents.llmConfig.delete.path, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Failed to delete LLM config");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.config.path] });
      toast({ title: "Removed", description: "API key removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useSetActiveLlmConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch(api.agents.llmConfig.setActive.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to set active provider");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.config.path] });
      toast({ title: "Active provider updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useValidateLlmConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider?: string) => {
      const res = await fetch(api.agents.llmConfig.validate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider ? { provider } : {}),
      });
      if (!res.ok) throw new Error("Validation request failed");
      return await res.json() as { valid: boolean; error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.agents.config.path] });
      if (data.valid) {
        toast({ title: "Valid", description: "API key is working correctly." });
      } else {
        toast({ title: "Invalid", description: data.error || "API key validation failed.", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================================================
// EVENT WIZARD
// ============================================================================

export function useEventWizardRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text?: string }) => {
      const res = await fetch(api.agents.eventWizard.run.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Event wizard failed");
      }
      return await res.json() as {
        sessionId: number;
        result: {
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
        };
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.sessions.list.path] });
    },
  });
}

export function useEventWizardRefine() {
  return useMutation({
    mutationFn: async ({ sessionId, instruction }: { sessionId: number; instruction: string }) => {
      const url = buildUrl(api.agents.eventWizard.refine.path, { sessionId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Refinement failed");
      }
      return await res.json() as { sessionId: number; result: any };
    },
  });
}

// ============================================================================
// NEGOTIATION AGENT
// ============================================================================

export function useNegotiationStart(bookingId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targets: {
      targetMinPrice?: number;
      targetMaxPrice?: number;
      preferredSchedule?: string;
      mustHaveRiders?: string[];
      strategy?: "aggressive" | "balanced" | "conservative";
      notes?: string;
    }) => {
      const url = buildUrl(api.agents.negotiation.start.path, { bookingId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start negotiation agent");
      }
      return await res.json() as { sessionId: number; status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.negotiation.status.path, bookingId] });
      toast({ title: "Agent Active", description: "Negotiation assistant is analyzing the deal." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useNegotiationSetTargets(bookingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targets: {
      targetMinPrice?: number;
      targetMaxPrice?: number;
      preferredSchedule?: string;
      mustHaveRiders?: string[];
      strategy?: "aggressive" | "balanced" | "conservative";
      notes?: string;
    }) => {
      const url = buildUrl(api.agents.negotiation.setTargets.path, { bookingId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update targets");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.negotiation.status.path, bookingId] });
    },
  });
}

export function useNegotiationApprove(bookingId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (draftId: number) => {
      const url = buildUrl(api.agents.negotiation.approve.path, { bookingId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve draft");
      }
      return await res.json() as { success: boolean; proposalRound: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.negotiation.status.path, bookingId] });
      toast({ title: "Proposal Sent", description: "The draft proposal has been submitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useNegotiationStop(bookingId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.agents.negotiation.stop.path, { bookingId });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to stop agent");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.negotiation.status.path, bookingId] });
      toast({ title: "Agent Stopped", description: "Negotiation assistant deactivated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useNegotiationStatus(bookingId: number) {
  return useQuery({
    queryKey: [api.agents.negotiation.status.path, bookingId],
    queryFn: async () => {
      const url = buildUrl(api.agents.negotiation.status.path, { bookingId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch negotiation status");
      return await res.json() as {
        active: boolean;
        sessionId: number | null;
        status: string;
        pendingDrafts: Array<{
          id: number;
          proposal: any;
          reasoning?: string;
          createdAt: string;
        }>;
        lastActivityAt: string | null;
      };
    },
    enabled: !!bookingId,
    refetchInterval: 10000,
  });
}

// ============================================================================
// SESSIONS + FEEDBACK
// ============================================================================

export function useAgentSessions() {
  return useQuery({
    queryKey: [api.agents.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.agents.sessions.list.path);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json() as Array<{
        id: number;
        agentType: string;
        status: string;
        contextEntityType: string | null;
        contextEntityId: number | null;
        requestCount: number | null;
        startedAt: string | null;
        completedAt: string | null;
      }>;
    },
  });
}

export function useAgentSession(id: number) {
  return useQuery({
    queryKey: [api.agents.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.agents.sessions.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch session");
      return await res.json() as {
        session: any;
        messages: any[];
        feedback: any | null;
      };
    },
    enabled: !!id,
  });
}

export function useAgentFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, rating, comment }: {
      sessionId: number;
      rating: "positive" | "negative";
      comment?: string;
    }) => {
      const url = buildUrl(api.agents.sessions.feedback.path, { id: sessionId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit feedback");
      }
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.agents.sessions.get.path, vars.sessionId] });
      toast({ title: "Thanks!", description: "Your feedback helps improve the AI." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
