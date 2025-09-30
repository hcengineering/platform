// Check if we're in Node.js development mode

export const timeouts = {
  aliveTimeout: 3, // seconds - timeout for detecting dead agents/clients
  unusedContainerTimeout: 5, // 10 seconds for container to be terminated because of being unused
  pingInterval: 1 // seconds - how often to ping agents
}
