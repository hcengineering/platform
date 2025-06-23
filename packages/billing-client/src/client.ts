import { concatLink, WorkspaceUuid } from '@hcengineering/core'
import { BillingError, NetworkError } from './error'
import {
  BillingStats,
  DatalakeStats,
  LiveKitEgressData,
  LiveKitEgressStats,
  LiveKitSessionData,
  LiveKitSessionsStats,
  LiveKitStats
} from './types'

/** @public */
export function getClient (billingUrl?: string, token?: string): BillingClient {
  if (billingUrl === undefined || billingUrl == null || billingUrl === '') {
    throw new Error('Billing url not specified')
  }
  if (token === undefined || token == null || token === '') {
    throw new Error('Token not specified')
  }

  return new BillingClient(billingUrl, token)
}

export class BillingClient {
  private readonly headers: Record<string, string>

  constructor (
    private readonly endpoint: string,
    private readonly token: string
  ) {
    this.headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  }

  async getBillingStats (workspace: WorkspaceUuid): Promise<BillingStats> {
    const path = `/api/v1/${workspace}/stats`
    const url = new URL(concatLink(this.endpoint, path))
    const response = await fetchSafe(url, { headers: { ...this.headers } })
    return (await response.json()) as BillingStats
  }

  async getDatalakeStats (workspace: WorkspaceUuid): Promise<DatalakeStats> {
    const path = `/api/v1/${workspace}/datalake/stats`
    const url = new URL(concatLink(this.endpoint, path))
    const response = await fetchSafe(url, { headers: { ...this.headers } })
    return (await response.json()) as DatalakeStats
  }

  async getLiveKitStats (workspace: WorkspaceUuid): Promise<LiveKitStats> {
    const path = `/api/v1/${workspace}/livekit/stats`
    const url = new URL(concatLink(this.endpoint, path))
    const response = await fetchSafe(url, { headers: { ...this.headers } })
    return (await response.json()) as LiveKitStats
  }

  async getLiveKitSessionsStats (workspace: WorkspaceUuid): Promise<LiveKitSessionsStats[]> {
    const path = `/api/v1/${workspace}/livekit/sessions`
    const url = new URL(concatLink(this.endpoint, path))
    const response = await fetchSafe(url, { headers: { ...this.headers } })
    return (await response.json()) as LiveKitSessionsStats[]
  }

  async getLiveKitEgressStats (workspace: WorkspaceUuid): Promise<LiveKitEgressStats[]> {
    const path = `/api/v1/${workspace}/livekit/egress`
    const url = new URL(concatLink(this.endpoint, path))
    const response = await fetchSafe(url, { headers: { ...this.headers } })
    return (await response.json()) as LiveKitEgressStats[]
  }

  async postLiveKitSessions (sessions: LiveKitSessionData[]): Promise<void> {
    const path = '/api/v1/livekit/sessions'
    const url = new URL(concatLink(this.endpoint, path))
    const body = JSON.stringify(sessions)
    await fetchSafe(url, { method: 'POST', headers: { ...this.headers }, body })
  }

  async postLiveKitEgress (egress: LiveKitEgressData[]): Promise<void> {
    const path = '/api/v1/livekit/egress'
    const url = new URL(concatLink(this.endpoint, path))
    const body = JSON.stringify(egress)
    await fetchSafe(url, { method: 'POST', headers: { ...this.headers }, body })
  }
}

async function fetchSafe (url: string | URL, init?: RequestInit): Promise<Response> {
  let response
  try {
    response = await fetch(url, init)
  } catch (err: any) {
    throw new NetworkError(`Network error ${err}`)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new BillingError(text)
  }

  return response
}
