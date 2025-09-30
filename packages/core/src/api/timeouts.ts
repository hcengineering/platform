// Check if we're in Node.js development mode
const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

// In development mode with Node.js, use a huge timeout (1 hour) to allow for debugging
const devAliveTimeout = 3600 // 1 hour in seconds

export const timeouts = {
  aliveTimeout: isDevelopment ? devAliveTimeout : 3, // seconds - timeout for detecting dead agents/clients
  unusedContainerTimeout: 5, // 10 seconds for container to be terminated because of being unused
  pingInterval: 1 // seconds - how often to ping agents
}
