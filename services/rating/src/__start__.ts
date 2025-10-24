import { start } from './index'

void start().catch((err) => {
  console.error('Failed to start rating service', err)
})
