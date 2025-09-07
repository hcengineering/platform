import type { AgentUuid } from '../api/types'
import { timeouts } from '../api/timeouts'
import { AgentImpl } from '../agent'
import { TickManagerImpl } from '../utils'
import { NetworkImpl } from '../server'

class FakeTickManager extends TickManagerImpl {
  time: number = 0

  now (): number {
    return this.time
  }
}

const agents = {
  agent1: 'agent1' as AgentUuid,
  agent2: 'agent2' as AgentUuid,
  agent3: 'agent3' as AgentUuid
}

describe('alive checkins tests', () => {
  it('should mark and remove agent if not alive', async () => {
    const tickManager = new FakeTickManager(1) // 1 tick per second
    const network = new NetworkImpl(tickManager)
    const agent1 = new AgentImpl(agents.agent1, {})

    // Register agent
    await agent1.register(network)

    // Get initial lastSeen time
    const agentRecord = (await network.agents()).find((a) => a.agentId === agents.agent1)
    expect(agentRecord).toBeDefined()

    // Make looks like agent is not alive anymore
    tickManager.time += 1000 + timeouts.aliveTimeout * 1000

    // Trigger alive callback
    await (network as any).checkAlive()

    // Check that lastSeen was updated (we can't easily test the exact timestamp,
    // but we can verify the agent is still in the network)
    const updatedAgentRecord = (await network.agents()).find((a) => a.agentId === agents.agent1)
    expect(updatedAgentRecord).toBeUndefined()
  })
})
