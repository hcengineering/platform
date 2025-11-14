import type { AgentEndpointRef, AgentUuid, ContainerEndpointRef, ContainerUuid } from './api/types'

export enum EndpointKind {
  routed, // Container is routed via host as router, host is BackRPCServer, and send operation should be used to pass data to target.
  direct, // A direct connection to container.
  noconnect // No connection to container via network, only send on network.
}
// An Agent or Container endpoint referenfe to establish a direct connection to.
export interface EndpointRefData {
  kind: EndpointKind
  host: string
  port: number
  agentId: AgentUuid
  uuid?: ContainerUuid
}

export function agentDirectRef (host: string, port: number, uuid: AgentUuid): AgentEndpointRef {
  return JSON.stringify({
    host,
    port,
    kind: EndpointKind.direct,
    agentId: uuid
  } satisfies EndpointRefData) as AgentEndpointRef
}

export function agentNoConnectRef (uuid: AgentUuid): AgentEndpointRef {
  return JSON.stringify({
    kind: EndpointKind.noconnect,
    agentId: uuid,
    host: '',
    port: 0
  } satisfies EndpointRefData) as AgentEndpointRef
}

export function containerOnAgentEndpointRef (
  agentEndpoint: AgentEndpointRef,
  container: ContainerUuid
): ContainerEndpointRef {
  const agentData = JSON.parse(agentEndpoint) as EndpointRefData
  return JSON.stringify({
    kind: agentData.kind === EndpointKind.noconnect ? agentData.kind : EndpointKind.routed,
    host: agentData.host,
    port: agentData.port,
    agentId: agentData.agentId,
    uuid: container
  } satisfies EndpointRefData) as ContainerEndpointRef
}

export function parseEndpointRef (ref: AgentEndpointRef | ContainerEndpointRef): EndpointRefData {
  return JSON.parse(ref) as EndpointRefData
}
export function containerDirectRef (
  host: string,
  port: number,
  uuid: ContainerUuid,
  agentId: AgentUuid
): ContainerEndpointRef {
  return JSON.stringify({
    kind: EndpointKind.direct,
    host,
    port,
    uuid,
    agentId
  } satisfies EndpointRefData) as ContainerEndpointRef
}
