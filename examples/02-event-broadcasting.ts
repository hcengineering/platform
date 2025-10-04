/**
 * Example 2: Event Broadcasting Container
 * 
 * This example demonstrates real-time event broadcasting to multiple connected clients.
 * Shows how to implement a cha  const agentServer = new NetworkAgentServer(tickManager, 'localhost', '*', 3738)
  await agentServer.start(agent)
  console.log('✓ Agent server started on port 3738\n')

  // 3. Connect three clients
  console.log('--- Connecting clients ---')
  await using client1 = createNetworkClient('localhost:3737')
  await client1.waitConnection(5000)
  await using client2 = createNetworkClient('localhost:3737')
  await client2.waitConnection(5000)
  await using client3 = createNetworkClient('localhost:3737')
  await client3.waitConnection(5000)
  console.log('✓ Three clients connected\n') messages are broadcast to all participants.
 * 
 * @example
 * // Start the network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // npx ts-node examples/02-event-broadcasting.ts
 */

import { AgentImpl, TickManagerImpl, NetworkImpl, createProxyHandler } from '../packages/core/src'
import { NetworkServer } from '../packages/server/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions
} from '../packages/core/src'

interface ChatMessage {
  username: string
  text: string
  timestamp: number
}

// Define the service interface for type-safe proxy usage
interface ChatRoomService {
  sendMessage: (username: string, text: string) => Promise<{ 
    success: boolean; 
    messageId: number; 
    timestamp: number 
  }>
  getHistory: () => Promise<{ 
    success: boolean; 
    messages: ChatMessage[]; 
    totalMessages: number 
  }>
  getUserCount: () => Promise<{ 
    success: boolean; 
    count: number; 
    connectedClients: ClientUuid[] 
  }>
  getRoomInfo: () => Promise<{
    success: boolean;
    roomName: string;
    uuid: ContainerUuid;
    messageCount: number;
    clientCount: number;
  }>
}

class ChatRoomContainer implements Container {
  private clients = new Map<ClientUuid, (data: any) => Promise<void>>()
  private messages: ChatMessage[] = []

  constructor(
    readonly uuid: ContainerUuid, 
    readonly roomName: string
  ) {
    console.log(`[ChatRoom] Room '${roomName}' created (${uuid})`)
  }

  // Implement the service interface
  private serviceImpl: ChatRoomService = {
    sendMessage: async (username: string, text: string) => {
      const message: ChatMessage = {
        username,
        text,
        timestamp: Date.now()
      }
      this.messages.push(message)
      
      console.log(`[ChatRoom] ${message.username}: ${message.text}`)
      
      // Broadcast to all connected clients
      await this.broadcastToAll({ 
        type: 'newMessage', 
        message,
        messageCount: this.messages.length 
      })
      
      return { 
        success: true, 
        messageId: this.messages.length - 1,
        timestamp: message.timestamp
      }
    },

    getHistory: async () => {
      return { 
        success: true, 
        messages: this.messages,
        totalMessages: this.messages.length 
      }
    },

    getUserCount: async () => {
      return { 
        success: true, 
        count: this.clients.size,
        connectedClients: Array.from(this.clients.keys())
      }
    },

    getRoomInfo: async () => {
      return {
        success: true,
        roomName: this.roomName,
        uuid: this.uuid,
        messageCount: this.messages.length,
        clientCount: this.clients.size
      }
    }
  }

  // Use proxy handler to route requests to service implementation
  request = createProxyHandler(this.serviceImpl as any, 'ChatRoomService')

  async ping(): Promise<void> {}

  async terminate(): Promise<void> {
    console.log(`[ChatRoom] Room '${this.roomName}' closing...`)
    
    // Notify all clients about room closure
    await this.broadcastToAll({ 
      type: 'roomClosed', 
      roomName: this.roomName,
      message: 'This room has been closed'
    })
    
    this.clients.clear()
    this.messages = []
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    console.log(`[ChatRoom] Client ${clientId} joined '${this.roomName}'`)
    this.clients.set(clientId, broadcast)
    
    // Send welcome message to the new client
    broadcast({ 
      type: 'welcome', 
      message: `Welcome to ${this.roomName}!`,
      currentUsers: this.clients.size,
      messageHistory: this.messages.length
    }).catch(err => console.error('[ChatRoom] Failed to send welcome:', err))
  }

  disconnect(clientId: ClientUuid): void {
    console.log(`[ChatRoom] Client ${clientId} left '${this.roomName}'`)
    this.clients.delete(clientId)
    
    // Notify remaining clients
    this.broadcastToAll({ 
      type: 'userLeft', 
      clientId,
      remainingUsers: this.clients.size 
    }).catch(err => console.error('[ChatRoom] Failed to broadcast user left:', err))
  }

  private async broadcastToAll(event: any): Promise<void> {
    const promises = Array.from(this.clients.values()).map(handler => 
      handler(event).catch(err => 
        console.error('[ChatRoom] Failed to broadcast to client:', err)
      )
    )
    await Promise.all(promises)
  }
}

async function main(): Promise<void> {
  console.log('=== Event Broadcasting Container Example ===\n')

  // 1. Setup infrastructure
  const tickManager = new TickManagerImpl(1)
  tickManager.start()
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(network, tickManager, '*', 3737)
  console.log('✓ Network server started\n')

  // 2. Create agent
  const agent = new AgentImpl('chat-agent' as any, {
    ['chat-room' as ContainerKind]: async (options: GetOptions) => {
      const roomName = options.labels?.[0] || 'general'
      const uuid = options.uuid ?? `room-${roomName}-${Date.now()}` as ContainerUuid
      const container = new ChatRoomContainer(uuid, roomName)
      return {
        uuid,
        container,
        endpoint: `chat://${roomName}/${uuid}` as any
      }
    }
  })

  const agentServer = new NetworkAgentServer(tickManager, 'localhost', '*', 3738)
  await agentServer.start(agent)
  console.log('✓ Agent server started\n')

  // 3. Create multiple clients
  const client1 = createNetworkClient('localhost:3737')
  await client1.waitConnection(5000)
  const client2 = createNetworkClient('localhost:3737')
  await client2.waitConnection(5000)
  const client3 = createNetworkClient('localhost:3737')
  await client3.waitConnection(5000)
  console.log('✓ Three clients connected\n')

  // 4. Register agent
  await client1.register(agent)
  console.log('✓ Agent registered\n')

  // 5. All clients join the same chat room
  console.log('--- Clients joining chat room ---')
  const chatRef1 = await client1.get('chat-room' as ContainerKind, { 
    uuid: 'room-general' as ContainerUuid,
    labels: ['general']
  })
  
  const chatRef2 = await client2.get('chat-room' as ContainerKind, { 
    uuid: 'room-general' as ContainerUuid,
    labels: ['general']
  })
  
  const chatRef3 = await client3.get('chat-room' as ContainerKind, { 
    uuid: 'room-general' as ContainerUuid,
    labels: ['general']
  })
  console.log('✓ All clients have chat room references\n')

  // 6. Connect and setup event listeners
  console.log('--- Setting up event listeners ---')
  const conn1 = await chatRef1.connect()
  conn1.on = async (event: any) => {
    console.log('[Client1 Event]', event.type, ':', JSON.stringify(event).substring(0, 100))
  }

  const conn2 = await chatRef2.connect()
  conn2.on = async (event: any) => {
    console.log('[Client2 Event]', event.type, ':', JSON.stringify(event).substring(0, 100))
  }

  const conn3 = await chatRef3.connect()
  conn3.on = async (event: any) => {
    console.log('[Client3 Event]', event.type, ':', JSON.stringify(event).substring(0, 100))
  }
  
  // Wait for connections to establish
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('✓ Event listeners ready\n')

  // 7. Create typed proxies using cast method
  const chat1 = conn1.cast<ChatRoomService>('ChatRoomService')
  const chat2 = conn2.cast<ChatRoomService>('ChatRoomService')
  const chat3 = conn3.cast<ChatRoomService>('ChatRoomService')
  console.log('✓ Created typed proxies\n')

  // 8. Check room status
  console.log('--- Room info ---')
  const roomInfo = await chat1.getUserCount()
  console.log('Users in room:', roomInfo)
  console.log()

  // 9. Send messages using typed methods (will be broadcast to all clients)
  console.log('--- Broadcasting messages ---')
  await chat1.sendMessage('Alice', 'Hello everyone!')
  await new Promise(resolve => setTimeout(resolve, 200))

  await chat2.sendMessage('Bob', 'Hi Alice!')
  await new Promise(resolve => setTimeout(resolve, 200))

  await chat3.sendMessage('Charlie', 'Hey folks! 👋')
  await new Promise(resolve => setTimeout(resolve, 200))

  await chat1.sendMessage('Alice', 'Nice to meet you all!')
  await new Promise(resolve => setTimeout(resolve, 200))
  console.log()

  // 10. Retrieve chat history
  console.log('--- Chat history ---')
  const history = await chat2.getHistory()
  console.log(`Total messages: ${history.totalMessages}`)
  history.messages.forEach((msg: ChatMessage, idx: number) => {
    const time = new Date(msg.timestamp).toISOString()
    console.log(`  ${idx + 1}. [${time}] ${msg.username}: ${msg.text}`)
  })
  console.log()

  // 11. Simulate one client leaving
  console.log('--- Client3 disconnecting ---')
  await conn3.close()
  await chatRef3.close()
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log()

  // 12. Check updated user count
  const updatedInfo = await chat1.getUserCount()
  console.log('Users remaining in room:', updatedInfo.count)
  console.log()

  // 13. Cleanup
  console.log('--- Cleanup ---')
  await conn1.close()
  await conn2.close()
  await chatRef1.close()
  await chatRef2.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  
  console.log('\n✓ Example completed successfully!')
}

main().catch(console.error)

export { ChatRoomContainer }
