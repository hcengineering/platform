export class NetworkError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class BillingError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'BillingError'
  }
}
