/**
 * Agent Orchestrator — registry and lifecycle manager for all AI agents.
 *
 * Instantiated once at server startup and provides a single entry point
 * for starting, resuming, and cancelling agent sessions.
 */

import { BaseAgent, AgentRunParams, AgentRunResult, AgentError } from "./agent-base";
import { storage } from "../storage";

class AgentOrchestrator {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.agentType, agent);
  }

  getAgent(agentType: string): BaseAgent {
    const agent = this.agents.get(agentType);
    if (!agent) throw new AgentError(`Unknown agent type: ${agentType}`, 400);
    return agent;
  }

  listRegistered(): string[] {
    return Array.from(this.agents.keys());
  }

  async startSession(params: AgentRunParams & { agentType: string }): Promise<AgentRunResult> {
    const agent = this.getAgent(params.agentType);
    return agent.run(params);
  }

  async cancelSession(sessionId: number, userId: number): Promise<void> {
    const session = await storage.getAgentSession(sessionId);
    if (!session) throw new AgentError("Session not found", 404);
    if (session.userId !== userId) throw new AgentError("Not your session", 403);
    if (session.status !== "active" && session.status !== "paused") {
      throw new AgentError("Session is not active", 400);
    }
    await storage.updateAgentSession(sessionId, {
      status: "cancelled",
      completedAt: new Date(),
    });
  }

  async getActiveSession(userId: number, agentType: string, contextEntityId?: number) {
    return storage.getActiveAgentSession(userId, agentType, contextEntityId);
  }
}

export const orchestrator = new AgentOrchestrator();
