# Production Deployment Guide

Complete guide for deploying Huly Virtual Network to production environments.

## ⚠️ Critical Limitation: Network Service

**The Network Server does NOT support high availability:**

- ❌ **Single instance only** - Cannot run multiple network servers
- ❌ **No clustering** - Network service cannot be clustered
- ❌ **Single point of failure** - Network service failure affects entire system

**Mitigation strategies:**

- Use process monitoring (systemd, PM2, Kubernetes with restart policies)
- Implement health checks and automatic restarts
- Agents automatically reconnect after network service restart
- Plan for brief downtime during network service failures/restarts

**Note**: Agents and containers DO support HA through stateless registration. Only the central network server is a singleton.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Architecture](#deployment-architecture)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Configuration](#configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security](#security)
- [High Availability](#high-availability)
- [Performance Tuning](#performance-tuning)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Monitoring configured
- [ ] Backup strategy defined
- [ ] Rollback plan prepared
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Incident response plan ready
- [ ] Performance baselines established

## Deployment Architecture

### Recommended Production Architecture

**IMPORTANT**: The diagram shows Network Server 1 and 2, but only ONE can be active at a time. The architecture should use active-passive with quick failover, not active-active.

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐           ┌─────▼──────┐
         │  Network    │           │  Network   │
         │  Server 1   │           │  Server 2  │
         │  (Active)   │           │  (Standby) │ ⚠️ Only ONE active!
         └──────┬──────┘           └─────┬──────┘
                │                         │
        ┌───────┴───────────────────────┬─┘
        │                               │
   ┌────▼─────┐                    ┌───▼──────┐
   │ Agent 1  │                    │ Agent 2  │
   │ ────────│                     │ ────────│
   │ • Session│                    │ • Session│
   │ • Query  │                    │ • Query  │
   └──────────┘                    └──────────┘
        │                               │
   ┌────▼─────┐                    ┌───▼──────┐
   │ Agent 3  │                    │ Agent 4  │
   │ ────────│                     │ ────────│
   │ • Transact│                   │ • Transact│
   │ • Workspace│                  │ • Workspace│
   └──────────┘                    └──────────┘
```

### Component Distribution

**Network Servers:**

- 1 active instance (others in standby for manual/automatic failover)
- ⚠️ **Critical**: Only ONE network server can be active at a time
- Use process monitoring for quick restarts (systemd, PM2, Kubernetes)
- Standby can be cold standby with quick startup

**Agents:**

- 3+ per container kind for redundancy
- Distributed across availability zones
- Auto-scaling based on load

**Monitoring:**

- Centralized logging
- Metrics collection
- Alerting system

## Docker Deployment

### Network Server

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  network-server:
    image: hardcoreeng/network-pod:latest
    container_name: huly-network
    restart: unless-stopped
    ports:
      - '3737:3737'
    environment:
      - NODE_ENV=production
      - NETWORK_PORT=3737
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3737/health']
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - huly-network

  # Agent 1
  agent-1:
    build: ./agents
    container_name: huly-agent-1
    restart: unless-stopped
    environment:
      - AGENT_ID=agent-1
      - NETWORK_HOST=network-server
      - NETWORK_PORT=3737
      - AGENT_PORT=3738
      - NODE_ENV=production
    ports:
      - '3738:3738'
    depends_on:
      - network-server
    networks:
      - huly-network

  # Agent 2
  agent-2:
    build: ./agents
    container_name: huly-agent-2
    restart: unless-stopped
    environment:
      - AGENT_ID=agent-2
      - NETWORK_HOST=network-server
      - NETWORK_PORT=3737
      - AGENT_PORT=3739
      - NODE_ENV=production
    ports:
      - '3739:3739'
    depends_on:
      - network-server
    networks:
      - huly-network

networks:
  huly-network:
    driver: bridge

volumes:
  logs:
  config:
```

### Agent Dockerfile

Create `agents/Dockerfile`:

```dockerfile
FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build if needed
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Run agent
CMD ["node", "dist/agent.js"]
```

### Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Scale agents
docker-compose up -d --scale agent-1=3

# Stop
docker-compose down
```

## Kubernetes Deployment

### Network Server Deployment

Create `k8s/network-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: huly-network
  labels:
    app: huly-network
spec:
  replicas: 2
  selector:
    matchLabels:
      app: huly-network
  template:
    metadata:
      labels:
        app: huly-network
    spec:
      containers:
        - name: network
          image: hardcoreeng/network-pod:latest
          ports:
            - containerPort: 3737
              name: network
          env:
            - name: NODE_ENV
              value: 'production'
            - name: NETWORK_PORT
              value: '3737'
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '2000m'
          livenessProbe:
            tcpSocket:
              port: 3737
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            tcpSocket:
              port: 3737
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: huly-network-service
spec:
  selector:
    app: huly-network
  ports:
    - protocol: TCP
      port: 3737
      targetPort: 3737
  type: LoadBalancer
```

### Agent Deployment

Create `k8s/agent-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: huly-agents
  labels:
    app: huly-agent
spec:
  replicas: 4
  selector:
    matchLabels:
      app: huly-agent
  template:
    metadata:
      labels:
        app: huly-agent
    spec:
      containers:
        - name: agent
          image: your-registry/huly-agent:latest
          env:
            - name: NETWORK_HOST
              value: 'huly-network-service'
            - name: NETWORK_PORT
              value: '3737'
            - name: AGENT_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NODE_ENV
              value: 'production'
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            exec:
              command:
                - node
                - healthcheck.js
            initialDelaySeconds: 30
            periodSeconds: 30
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: huly-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: huly-agents
  minReplicas: 4
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace huly-network

# Apply configurations
kubectl apply -f k8s/network-deployment.yaml -n huly-network
kubectl apply -f k8s/agent-deployment.yaml -n huly-network

# Check status
kubectl get pods -n huly-network
kubectl get services -n huly-network

# View logs
kubectl logs -f deployment/huly-network -n huly-network
kubectl logs -f deployment/huly-agents -n huly-network

# Scale manually
kubectl scale deployment huly-agents --replicas=10 -n huly-network
```

## Configuration

### Environment Variables

**Network Server:**

```bash
# Core settings
NODE_ENV=production
NETWORK_PORT=3737
NETWORK_BIND_ADDRESS=0.0.0.0

# Timeouts (seconds)
ALIVE_TIMEOUT=3
PING_INTERVAL=1
CONTAINER_TIMEOUT=60

# Performance
TICK_RATE=1000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/huly/network.log
```

**Agents:**

```bash
# Core settings
AGENT_ID=agent-1
NETWORK_HOST=network-server
NETWORK_PORT=3737
AGENT_PORT=3738

# Container settings
MAX_CONTAINERS=100
CONTAINER_MEMORY_LIMIT=512M

# Timeouts
ALIVE_TIMEOUT=3600  # Development: 1 hour

# Logging
LOG_LEVEL=info
```

### Configuration File

Create `config/production.json`:

```json
{
  "network": {
    "port": 3737,
    "bindAddress": "0.0.0.0",
    "aliveTimeout": 3,
    "pingInterval": 1,
    "containerTimeout": 60
  },
  "agent": {
    "maxContainers": 100,
    "memoryLimit": "512M",
    "healthCheckInterval": 30
  },
  "logging": {
    "level": "info",
    "format": "json",
    "destination": "stdout"
  },
  "monitoring": {
    "enabled": true,
    "metricsPort": 9090,
    "tracingEnabled": true
  }
}
```

## Monitoring and Logging

### Prometheus Metrics

Expose metrics endpoint:

```typescript
import express from 'express'
import { register, Counter, Histogram, Gauge } from 'prom-client'

const app = express()

// Metrics
const requestCounter = new Counter({
  name: 'huly_requests_total',
  help: 'Total number of requests',
  labelNames: ['operation', 'status']
})

const requestDuration = new Histogram({
  name: 'huly_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['operation']
})

const activeContainers = new Gauge({
  name: 'huly_active_containers',
  help: 'Number of active containers',
  labelNames: ['kind']
})

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

app.listen(9090, () => {
  console.log('Metrics server listening on :9090')
})
```

### Structured Logging

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'huly-network',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/var/log/huly/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/huly/combined.log'
    })
  ]
})

// Use throughout application
logger.info('Network started', { port: 3737 })
logger.error('Container failed', {
  containerId: uuid,
  error: err.message
})
```

### Health Checks

```typescript
// healthcheck.js
import { createNetworkClient } from '@hcengineering/network-client'

async function healthCheck() {
  try {
    const client = createNetworkClient('localhost:3737')
    await client.waitConnection(5000)

    // Check if we can list containers
    await client.list()

    await client.close()

    console.log('Health check: OK')
    process.exit(0)
  } catch (error) {
    console.error('Health check: FAILED', error)
    process.exit(1)
  }
}

healthCheck()
```

## Security

### Network Security

1. **Use TLS for production:**

```typescript
// Enable TLS on network server
import { readFileSync } from 'fs'

const options = {
  cert: readFileSync('/path/to/cert.pem'),
  key: readFileSync('/path/to/key.pem')
}
```

2. **Firewall rules:**

```bash
# Allow only necessary ports
ufw allow 3737/tcp  # Network server
ufw allow 3738:3800/tcp  # Agent ports
ufw deny from any to any
```

3. **Authentication:**

```typescript
// Implement client authentication
class SecureNetworkServer extends NetworkServer {
  validateClient(clientId: ClientUuid, token: string): boolean {
    return this.authService.validateToken(token)
  }
}
```

### Container Security

1. **Run containers with limited privileges**
2. **Use security contexts in Kubernetes**
3. **Scan images for vulnerabilities**
4. **Implement rate limiting**
5. **Validate all inputs**

## High Availability

### Active-Passive Setup

```typescript
// Primary network server
const primary = new NetworkServer(network, tickManager, '*', 3737)

// Standby watches primary
setInterval(async () => {
  if (!(await checkPrimaryHealth())) {
    console.log('Primary failed, activating standby')
    await standby.start()
  }
}, 5000)
```

### Active-Active with Load Balancer

Use stateless containers for critical services:

```typescript
// Register same container on multiple agents
for (const agent of [agent1, agent2, agent3]) {
  agent.addStatelessContainer(
    'critical-service' as ContainerUuid,
    'critical' as ContainerKind,
    `critical://${agent.uuid}/service` as any,
    new CriticalServiceContainer('critical-service' as any)
  )
}
```

## Performance Tuning

### Network Server Tuning

```typescript
// Increase tick rate for lower latency
const tickManager = new TickManagerImpl(10000) // 10,000 ticks/sec

// Adjust timeouts for production
const aliveTimeout = 3 // seconds
const containerTimeout = 60 // seconds
```

### Agent Tuning

```typescript
// Limit concurrent containers
const maxContainers = 100

// Pre-warm containers
for (let i = 0; i < 10; i++) {
  await agent.get('session' as any, {})
}
```

### Container Optimization

```typescript
// Use connection pooling
class OptimizedContainer implements Container {
  private dbPool = createPool({ max: 10 })

  async request(operation: string, data?: any): Promise<any> {
    const conn = await this.dbPool.acquire()
    try {
      return await this.processWithConnection(conn, operation, data)
    } finally {
      this.dbPool.release(conn)
    }
  }
}
```

## Backup and Recovery

### State Backup

```typescript
// Backup container state periodically
setInterval(async () => {
  for (const [uuid, container] of containers) {
    const state = await container.exportState()
    await backup.save(uuid, state)
  }
}, 60000) // Every minute
```

### Recovery

```typescript
// Restore from backup
async function recover(uuid: ContainerUuid) {
  const state = await backup.load(uuid)
  const container = new MyContainer(uuid)
  await container.importState(state)
  return container
}
```

## Troubleshooting

### Common Issues

**Network server won't start:**

```bash
# Check port availability
lsof -i :3737

# Check logs
tail -f /var/log/huly/error.log

# Verify configuration
cat config/production.json
```

**Agents not connecting:**

```bash
# Test connectivity
telnet network-server 3737

# Check agent logs
docker logs huly-agent-1

# Verify DNS resolution
nslookup network-server
```

**High memory usage:**

```bash
# Check container count
kubectl top pods -n huly-network

# Scale down if needed
kubectl scale deployment huly-agents --replicas=5
```

### Debugging Tools

```bash
# Network statistics
netstat -an | grep 3737

# Process monitoring
top -p $(pgrep -f huly)

# Memory profiling
node --inspect agent.js
```

## Maintenance

### Rolling Updates

```bash
# Kubernetes rolling update
kubectl set image deployment/huly-network \
  network=hardcoreeng/network-pod:v2.0.0 \
  --record -n huly-network

# Docker Compose
docker-compose pull
docker-compose up -d --no-deps --build network-server
```

### Graceful Shutdown

```typescript
// Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully')

  // Stop accepting new connections
  await server.close()

  // Wait for existing operations
  await waitForCompletion(30000)

  // Cleanup
  tickManager.stop()

  process.exit(0)
})
```

## Next Steps

- [Monitoring and Observability](MONITORING.md)
- [Security Best Practices](SECURITY.md)
- [Performance Tuning](PERFORMANCE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

---

For assistance with production deployments, open an issue on GitHub or contact support.
