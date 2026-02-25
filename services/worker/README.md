# Time Machine Service

The Time Machine service is an autonomous, generic service responsible for handling delayed events (timers). It replaces the previous Temporal implementation with a database-backed polling mechanism and Kafka-based communication.

## How it works

1.  **Commands**: The service consumes commands from the `TimeMachine` Kafka topic.
2.  **Storage**: Scheduled events are stored in a PostgreSQL table `time_machine.delayed_events`.
3.  **Polling**: The service periodically polls the database for expired events.
4.  **Events**: When an event expires, the service sends the stored `data` to the specified `topic` via Kafka and removes the record from its database.

## Kafka Interactions

### Consumed (Incoming)
**Topic**: `TimeMachine` (`timeMachine`)
**Message Type**: `TimeMachineMessage`

| Type | Description |
| :--- | :--- |
| `schedule` | Schedules a new timer or updates an existing one. Requires `id`, `targetDate`, `topic`, and `data`. |
| `cancel` | Removes scheduled timers. The `id` supports pattern matching via `ILIKE` (e.g., `prefix_%`). |

### Produced (Outgoing)
**Topic**: Dynamic (specified in `schedule` command)
**Message Type**: Arbitrary JSON (stored in `data`)

When a timer expires, the service relays the exact `data` payload to the target `topic`.

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DB_URL` | `postgres://localhost:5432/huly` | Connection string for the PostgreSQL database. |
| `POLL_INTERVAL` | `5000` | Polling interval for expired events in milliseconds. |
| `QUEUE_CONFIG` | - | Kafka bootstrap servers configuration. |
| `QUEUE_REGION` | `cockroach` | Platform region configuration. |

## Database Schema

The service automatically initializes its own schema if it doesn't exist:
- **Schema**: `time_machine`
- **Table**: `delayed_events`
- **Columns**: `id` (text), `workspace` (uuid), `target_date` (int8), `topic` (text), `data` (jsonb).
- **Primary Key**: `(id, workspace)`
