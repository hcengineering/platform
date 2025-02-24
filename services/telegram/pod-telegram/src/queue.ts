import { Event } from './types'

export class MsgQueue {
  private events: Event[] = []
  private inProgress = false

  constructor (
    private paused: boolean,
    private readonly onEvent: (event: Event) => Promise<void>
  ) {}

  add (event: Event): void {
    this.events.push(event)

    void this.handle()
  }

  dropBefore (id: number): void {
    this.events = this.events.filter((x) => x.msg.id > id)
  }

  unpause (): void {
    this.paused = false

    void this.handle()
  }

  pause (): void {
    this.paused = true
  }

  private async handle (): Promise<void> {
    while (!this.paused) {
      if (this.inProgress) continue
      const event = this.events.shift()

      if (event === undefined) {
        return
      }
      this.inProgress = true
      await this.onEvent(event)
      this.inProgress = false
    }
  }
}
