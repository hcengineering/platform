export type ContainerUuid = string & { _containerUuid: true }
export type ContainerKind = string & { _containerKind: true }
export type AgentUuid = string & { _networkAgentUuid: true }
export type ClientUuid = string & { _networkClientUuid: true }
export type ContainerEndpointRef = string & { _containerEndpointRef: true }
export type AgentEndpointRef = string & { _agentEndpointRef: true }

export interface ContainerRecord {
  agentId: AgentUuid
  uuid: ContainerUuid
  kind: ContainerKind
  endpoint: ContainerEndpointRef
  lastVisit: number // Last time when container was visited

  // Last request used
  extra?: Record<string, any> // Extra parameters for container start

  labels?: string[]
}
export interface ContainerEvent {
  added: ContainerRecord[]
  deleted: ContainerRecord[]
  updated: ContainerRecord[]
}

export interface ContainerRequest {
  kind: ContainerKind
  extra?: Record<string, any> // Extra parameters for container start

  labels?: string[]
}
