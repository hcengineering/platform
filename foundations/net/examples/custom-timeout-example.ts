/**
 * Example: Using custom timeout for BackRPC client
 * 
 * This example demonstrates how to create a network client with custom timeout values.
 * 
 * @example
 * // Start the network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // cd examples && rushx run:timeout
 */

import { createNetworkClient } from '@hcengineering/network-client'

async function main() {
  console.log('=== Custom Timeout Example ===\n')
  
  // Example 1: Default behavior - uses environment-based timeout
  // In development (NODE_ENV=development): 3600 seconds (1 hour)
  // In production: 3 seconds
  await using defaultClient = createNetworkClient('localhost:3737')
  console.log('✓ Created client with default timeout')

  // Example 2: Custom timeout - 10 minutes (600 seconds)
  await using customTimeoutClient = createNetworkClient('localhost:3737', 600)
  console.log('✓ Created client with 600s timeout')

  // Example 3: Short timeout for fast failure detection - 1 second
  await using fastFailClient = createNetworkClient('localhost:3737', 1)
  console.log('✓ Created client with 1s timeout')

  // Example 4: Very long timeout for debugging - 2 hours (7200 seconds)
  await using debugClient = createNetworkClient('localhost:3737', 7200)
  console.log('✓ Created client with 7200s timeout')

  console.log('\n✓ All clients created successfully!')
  console.log('Note: These are timeout settings for detecting inactive clients')
  console.log('Server will mark a client as dead after [aliveTimeout] seconds of inactivity')
  
  // Exit cleanly
  await new Promise(resolve => setTimeout(resolve, 100))
  process.exit(0)
}

main().catch(console.error)
