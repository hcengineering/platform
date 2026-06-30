//
// Standalone connection test:  npx ts-node src/test-huly.ts
// Verifies the service can log into Huly and see your Tracker projects.
//

import './ws-polyfill'
import { config as loadEnv } from 'dotenv'
loadEnv()

import { connect } from '@hcengineering/api-client'
import tracker from '@hcengineering/tracker'
import config from './config'

async function main (): Promise<void> {
  for (const k of ['HulyUrl', 'HulyEmail', 'HulyPassword', 'HulyWorkspace'] as const) {
    if (config[k] === '') throw Error(`Missing ${k} in .env`)
  }

  console.log(`Connecting to ${config.HulyUrl} (workspace: ${config.HulyWorkspace}) as ${config.HulyEmail} ...`)
  const client = await connect(config.HulyUrl, {
    email: config.HulyEmail,
    password: config.HulyPassword,
    workspace: config.HulyWorkspace
  })

  const projects = await client.findAll(tracker.class.Project, {})
  console.log(`\n✅ Connected. Found ${projects.length} project(s):`)
  for (const p of projects) {
    console.log(`   • ${p.name}  (identifier: ${p.identifier}, _id: ${p._id})`)
  }

  await client.close()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\n❌ Connection failed:', err)
  process.exit(1)
})
