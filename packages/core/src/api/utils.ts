export type TickHandler = () => void | Promise<void>

export interface TickManager {
  now: () => number

  // Interval in seconds
  register: (handler: TickHandler, interval: number) => () => void

  // Start tick manager
  start: () => void

  // Stop tick manager
  stop: () => void

  waitTick: (ticks: number) => Promise<void>
}
