export interface BillingStats {
  liveKitStats: LiveKitStats
  datalakeStats: DatalakeStats
}

export interface DatalakeStats {
  count: number
  size: number
}

export interface LiveKitStats {
  sessions: LiveKitSessionsStats
  egress: LiveKitEgressStats
}

export interface LiveKitSessionsStats {
  totalBandwidth: number
  totalMinutes: number
}

export interface LiveKitEgressStats {
  totalMinutes: number
}
