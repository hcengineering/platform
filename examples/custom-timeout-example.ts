/**
 * Example: Using custom timeout for BackRPC client
 * 
 * This example demonstrates how to create a network client with custom timeout values.
 */

import { createNetworkClient } from '@hcengineering/network-client'

// Example 1: Default behavior - uses environment-based timeout
// In development (NODE_ENV=development): 3600 seconds (1 hour)
// In production: 3 seconds
await using defaultClient = createNetworkClient('localhost:3737')

// Example 2: Custom timeout - 10 minutes
await using customTimeoutClient = createNetworkClient('localhost:3737', 600)

// Example 3: Short timeout for fast failure detection - 1 second
await using fastFailClient = createNetworkClient('localhost:3737', 1)

// Example 4: Very long timeout for debugging - 2 hours
await using debugClient = createNetworkClient('localhost:3737', 7200)

async function main() {
  try {
    // Wait for connection with optional timeout
    await defaultClient.waitConnection(5000) // 5 second connection timeout
    console.log('Connected to server')

    // The client will maintain connection based on its aliveTimeout
    // Server will detect client as dead only after aliveTimeout seconds of inactivity
    
    // Your application logic here...
    
  } catch (error) {
    console.error('Connection failed:', error)
  }
}

main().catch(console.error)
