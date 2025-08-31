import { runWorker } from './worker'

runWorker().catch((err) => {
  console.error(err)
})
