export interface BillingStats {
  liveKitStats: LiveKitStats
  datalakeStats: DatalakeStats
}

export interface DatalakeStats {
  count: number
  size: number
}

export interface LiveKitStats {
  sessions: LiveKitSessionsStats[]
  egress: LiveKitEgressStats[]
}

export interface LiveKitSessionsStats {
  day: string
  bandwidth: number
  minutes: number
}

export interface LiveKitEgressStats {
  day: string
  minutes: number
}

export interface LiveKitSessionData {
  workspace: string
  room: string
  sessionId: string
  sessionStart: string
  sessionEnd: string
  bandwidth: number
  minutes: number
}

export interface LiveKitEgressData {
  workspace: string
  room: string
  egressId: string
  egressStart: string
  egressEnd: string
  duration: number
}
