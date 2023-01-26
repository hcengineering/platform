import PQueue from 'p-queue'

export const bitrixQueue = new PQueue({
  intervalCap: 2,
  interval: 1000
})
