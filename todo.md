# Huly Network - TODO & Roadmap

This document outlines the planned improvements and future development goals for Huly Network.

## Completed ✓

- [x] Basic functional implementation and zeromq transport based implementation
  - [x] basic tests
  - [x] basic rate limit logic

---

## High Priority Initiatives

### 1. Smart Container Termination

Implement intelligent container termination with graceful shutdown and state restoration support.

**Key Features**:

- **Pre-termination State**: Containers should be able to return a special status indicating they cannot be terminated immediately
- **Restore Call Support**: Network should support a restore operation to bring containers back from pre-termination state
- **Graceful Shutdown**: Allow containers to complete critical operations before termination
- **Timeout Handling**: Define timeout policies for containers in pre-termination state

**Benefits**:

- Improved data consistency and reliability
- Graceful handling of long-running operations
- Better resource management during high-load scenarios
- Reduced risk of data loss during container shutdown

Required for Huly Collaborator service to be used for.

---

### 2. Rust-based NetworkServer Coordinator

Rewrite the NetworkServer coordinator component in Rust for better performance, lower latency, and improved resource efficiency.

**Motivation**:

- **Performance**: Rust's zero-cost abstractions and efficient memory management
- **Concurrency**: Better handling of high-throughput concurrent requests
- **Safety**: Memory safety without garbage collection overhead
- **Resource Efficiency**: Lower CPU and memory footprint

**Considerations**:

- Maintain backward compatibility with existing APIs
- Ensure smooth migration path for existing deployments
- Consider using async Rust frameworks like Tokio
- Evaluate NAPI-RS for Node.js interop if needed

---

### 3. High Availability (HA) Support for Network Coordinator

Add high availability capabilities to ensure network coordinator resilience and continuous operation.

**Key Features**:

- **Active-Passive Failover**: Automatic failover to standby coordinator instances
- **State Synchronization**: Real-time state replication across coordinator instances
- **Health Checks**: Continuous monitoring and automated failure detection
- **Split-brain Prevention**: Consensus mechanisms to prevent conflicting states

**Benefits**:

- Zero-downtime deployments
- Automatic recovery from coordinator failures
- Improved system reliability and uptime
- Better handling of maintenance windows

---

### 4. Comprehensive Performance Testing Suite

Develop a robust performance testing framework to evaluate Huly Network under various load scenarios and identify bottlenecks.

**Test Scenarios**:

1. **High Request Volume**: Thousands of concurrent requests per second
2. **Container Scaling**: Dynamic scaling with hundreds of containers
3. **Network Latency**: Various network conditions and geographic distributions
4. **Memory Pressure**: Large payload transfers and memory-intensive operations
5. **Failover & Recovery**: Coordinator failures and recovery scenarios
6. **Multi-tenant Load**: Mixed workloads from multiple tenants
7. **Long-running Connections**: WebSocket and streaming connection stability
8. **Cold Start Performance**: Container initialization and warm-up times

**Metrics to Track**:

- Request latency (p50, p95, p99)
- Throughput (requests/second)
- Container startup time
- Resource utilization (CPU, memory, network)
- Connection pool efficiency
- Redis operation latency
- Error rates under load

---

### 5. Streaming Capabilities for Partial Data Transfer

Introduce streaming capabilities to enable efficient partial data transfer from containers to clients.

**Use Cases**:

- **Large Response Payloads**: Stream large datasets without loading everything in memory

### 6. Security and External Client/Agent Support

Enable secure external access to the Huly Network Server Hub, allowing trusted clients and agents outside the private installation to consume services safely.

**Key Features**:

- **Authentication & Authorization**: Implement robust token-based authentication (JWT, API keys) for external clients
- **TLS/SSL Encryption**: Enforce encrypted connections for all external communication
- **Rate Limiting**: Apply granular rate limits per client/agent to prevent abuse
- **Access Control Lists (ACLs)**: Fine-grained permissions for external clients to access specific services
- **Audit Logging**: Comprehensive logging of external access attempts and activities

**Security Considerations**:

- Network isolation between internal and external traffic
- DDoS protection and request filtering
- Certificate management and rotation
- Secure credential storage and rotation policies
- IP whitelisting/blacklisting capabilities

**Use Cases**:

- Third-party integrations accessing Huly services
- Remote monitoring and management agents
- External webhooks and event consumers
- Partner applications requiring controlled access
- Mobile/desktop clients connecting from public networks

**Benefits**:

- Secure extension of Huly Network beyond internal networks
- Controlled exposure of services to external consumers
- Enhanced flexibility for hybrid deployment scenarios
- Support for distributed teams and remote workers

- **Real-time Data Processing**: Push incremental results as they become available

## Other Important Tasks

### Monitoring & Observability

- [ ] Add OpenTelemetry for monitoring/logging

## Contributing

Contributions to any of these initiatives are welcome! Please refer to the main README.md for contribution guidelines.
