# Observability with MeasureContext

Read this guide when instrumenting an operation, recording a metric, adding structured logs,
propagating context across a transport, or extending an observability backend.
It describes the implemented interface and the server instrumentation built on it.

## Ownership and entry points

Application code accepts `MeasureContext` and uses its methods for observability. Import the type
from `@hcengineering/measurements` or an established public re-export in the owning package.
OpenTelemetry instruments, providers, callbacks, and SDK calls belong inside `measurements-otlp`.
An application needing a new instrument extends `MeasureContext` and its implementations rather
than importing OpenTelemetry to bypass the context.

| Layer | Responsibility | Source |
| --- | --- | --- |
| `MeasureContext` | Public application contract, options, parameter types | [types.ts](../foundations/core/packages/measurements/src/types.ts) |
| Shared lifecycle | Child creation, operation completion, logging, timing | [base-measure-context.ts](../foundations/core/packages/measurements/src/base-measure-context.ts) |
| Local and no-metrics contexts | Local statistics or execution without metric recording | [context.ts](../foundations/core/packages/measurements/src/context.ts) |
| Context proxy | Send measurements to multiple contexts while executing work once | [context-proxy.ts](../foundations/core/packages/measurements/src/context-proxy.ts) |
| OTLP adapter | Translate the contract into spans, metrics, logs, and propagation metadata | [telemetry.ts](../foundations/core/packages/measurements-otlp/src/telemetry.ts) |

Service bootstrap selects the root implementation using the existing telemetry factory or local
context constructor. Descendant operations receive that context; they do not initialize exporters
or create a separate root for each request. `BaseMeasureContext` is shared implementation code,
not a supported application extension interface.

## Choose the signal

| Need | Current application interface | Interpretation |
| --- | --- | --- |
| Measure an asynchronous operation | `ctx.with(name, params, callback, fullParams?, options?)` | Operation lifetime; local timing statistics and a span when tracing is enabled |
| Count operation invocations and outcomes | `ctx.withCounter(name, params, callback, fullParams?, options?)` | Same execution as `with`, plus automatic lifecycle counters |
| Measure synchronous work | `ctx.withSync(...)` | Synchronous lifetime only |
| Own a context with an explicit lifetime | `ctx.newChild(name, params, options?)`, then `child.end()` | Caller owns completion; no span by default |
| Count events | `ctx.counter(name, delta, attributes?)` | Positive event increments; OTLP uses a Counter |
| Record a current reading | `ctx.gauge(name, value, attributes?)` | OTLP records a Gauge value |
| Write a structured message | `ctx.info/warn/error/debug(message, fields?)` | A log, not an operation result or metric |

`with` and `withSync` also update a local tree of `Metrics`. That tree is not an OTLP histogram.
Creating spans does not automatically publish an unsampled request counter or latency histogram.
Trace sampling and explicit metric recording are separate mechanisms.

## Operation lifetime

Pass the callback's child context to nested work so timing, parentage, and logs follow the operation.
Use fixed operation names and put varying information into parameters.

```ts
import type { MeasureContext } from '@hcengineering/measurements'

async function processBatch (
  ctx: MeasureContext,
  handleBatch: (operationCtx: MeasureContext) => Promise<void>
): Promise<void> {
  await ctx.with('worker.process-batch', { source: 'queue' }, async (operationCtx) => {
    await handleBatch(operationCtx)
  })
}
```

- `with` completes the child after a returned value, a Promise, or another thenable settles.
  It propagates callback errors. A synchronous throw from its callback is thrown
  synchronously, even though the method's return type is `Promise<T>`; use `try/await/catch` when
  handling both synchronous and asynchronous failures.
- `withSync` completes immediately after the callback returns. Use it only for synchronous work;
  an async callback would finish the measurement before the work finishes.
- `newChild` does not finish automatically or activate an asynchronous tracing context by itself.
  Complete manually owned children in `finally`. Prefer `with` for bounded operations.
- `end()` is idempotent. With no argument it records elapsed milliseconds locally; an explicit
  value replaces the local measured value, not the actual span duration. Calling it early inside
  `with` closes the span before the callback finishes, so later failures cannot mark that span failed.
- Long-lived owners retain a service context, not a child belonging to a completed request.

`contextData` is shared by reference with child contexts, and `id` is copied when creating a child.
Neither provides automatic isolation of mutable data between concurrent requests.

## Parameters and parentage

`params` contains scalar values: strings, numbers, booleans, or `undefined`. Local operation
statistics can group these parameters, and the OTLP adapter puts defined values on a new span.
Parameters are not automatically inherited by children. For `with` and `withSync`, use
`options.inheritParams: true` when the child needs the parent's parameters; child values take
precedence. `newChild` has no `inheritParams` option.

`fullParams` is optional diagnostic detail, supplied directly or by a lazy factory. The factory
is evaluated once during completion and its result is cached. These values can appear in local
samples and are attached to an OTLP span when a `with`/`withSync` operation finishes. The adapter
serializes object values for span attributes. Manual `newChild(...).end()` does not run the same
span finalization hook, so do not rely on it to attach `fullParams` to a span.

Use IDs only where needed for trace or administrative diagnosis. Keep tokens, credentials, and
document bodies out of observability payloads. High-cardinality identifiers are not metric dimensions.

The `span` option changes tracing behavior in the OTLP adapter:

| Value | Behavior |
| --- | --- |
| `true` | Create a span, preferring the context's saved parent; default for `with`/`withSync` |
| `'inherit'` | Create a span under the currently active asynchronous tracing context |
| `false` or `'skip'` | Create no span for this child; neither is a general tracing suppression switch |
| `'disable'` | Suppress tracing while executing this operation |

These options do not select a metric instrument or enable metric recording. With an OTLP-backed
context, `with` activates its tracing context for the callback and asynchronous work it awaits.

## Errors and structured logs

A thrown or rejected error escaping `with`/`withSync` marks its OTLP span as failed and is propagated.
`suspendErrors: true` suppresses span exception recording and error status, but still propagates the error.
If the callback catches an error and returns normally, the wrapper cannot infer a failed business outcome.

`ctx.error(message, fields)` only writes a log: it does not throw, finish the operation, or mark its
span as failed. Use `ctx.info`, `ctx.warn`, `ctx.error`, and `ctx.debug` for application logs rather
than bypassing the context's logger. `debug` requires a context created with debug log level.

Pass searchable diagnostic fields explicitly in the log call. The shared local logging path merges
context parameters into log fields, while the OTLP log hook receives the call's explicit fields and
the tracing context. Do not assume every span attribute is copied into every exported log.
The `log: true` operation option calls the configured logger's `logOperation`; it is not the same as
an explicit OTLP log emission, and the default console logger's operation hook is a no-op.

The shared base context isolates failures during completion and logging and reports telemetry failures
through its diagnostic helper. This is not a blanket guarantee for every observability call: direct
metric calls, child creation, and alternative implementations have their own behavior.

### Recording audit events

Use `recordAuditEvent` from `@hcengineering/server-core` after an applied domain change, or
`withAuditEvent` to record an asynchronous action's outcome. Await publication and explicitly
select safe attributes; never include credentials, request bodies or raw errors.

Event names and workspace-owner visibility are defined in the shared `AUDIT_EVENT_CATALOG`
in `@hcengineering/core`. New owner-visible events require a UI label; technical events remain
in the permanent journal and are excluded from owner queries before pagination.

Audit events use a separate Redpanda → PostgreSQL delivery path. Delivery failures do not
change the business result; events can be lost before broker acceptance.
See [Audit events](./audit.md) for API examples, the record schema, topic provisioning and recovery.

## Explicit metrics and dimensions

Explicit metrics accept a third argument containing scalar dimensions, using `Readonly<ParamsType>`.

```ts
ctx.counter('worker_batches_completed', 1, { source: 'queue' })
ctx.gauge('worker_cache_hit_ratio', hitRatio, { cache: 'clients' })
```

Explicit dimensions are used independently of tracing parameters; passing `{}` records without
context-derived dimensions. For legacy two-argument calls, the OTLP adapter still uses the context's
`params`, while the local implementation retains its previous unlabelled behavior. `fullParams`
are never metric dimensions. New instrumentation supplies the selected dimensions explicitly.

The OTLP adapter adds counter deltas and records gauge readings. The local implementation records
explicit metrics in `#name` nodes and preserves complete attribute combinations in `series`.
Each series contains `attributes`, `value`, and `operations`: for counters, `value` is the accumulated
delta and `operations` counts records; for gauges, `operations` holds the latest reading. A gauge
node's `operations` sums its dimensioned series. The series survive aggregation and JSON serialization.
These internal fields are not the portable meaning of an OTel instrument.

`MeasureContext` exposes no raw UpDownCounter, observable registration, or Histogram. Active-operation
tracking is provided by `withCounter`; additional public instruments require an actual application need.

For metric design:

- Use fixed metric names. Operations, domains, session kinds, and client services belong in a small
  set of explicitly selected dimensions.
- Separate cumulative events from current counts and duration distributions. A count of completed
  operations cannot be reconstructed from occasional samples of active operations.
- For current session and workspace counts, retain the existing periodic calculation and publication
  through `MeasureContext`, adding explicit dimensions. This task does not introduce a public observer API.
- For active operations tracked by deltas, `withCounter` owns incrementing before work and
  decrementing after settlement, including failures. Arbitrary expiry windows do not represent in-flight work.
- Keep nested request and internal-operation measurements separate; summing both double-counts work.
- Keep user, workspace, request, session, and instance IDs in diagnostic signals rather than metric
  dimensions. Missing client-source metadata is `unknown`, not an inferred browser or service.

## Operation counters

`withCounter` has the same
argument order and execution semantics as `with`: `name`, `params`, `callback`, optional `fullParams`,
and optional options. Both methods accept `WithOptions`; counter recording is the only
additional behavior.

It uses the shared `with` execution machinery, preserving child
creation, synchronous exception propagation, Promise and thenable handling, return behavior,
`fullParams` evaluation, tracing, logging, metadata propagation, parameter inheritance, and all
existing options. The callback receives the same kind of child context it would receive from `with`.
The explicitly supplied `params` also identify the metric series; inherited tracing parameters
are not automatically added to metric attributes.

```ts
await ctx.withCounter(
  'server-operations',
  { operation: 'find', domain },
  async (operationCtx) => await findDocuments(operationCtx)
)
```

For the name `operation`, every call records:

| Metric | Instrument | Update |
| --- | --- | --- |
| `operation` | Counter | Increment once before executing the callback |
| `operation-active` | UpDownCounter | Increment before execution; decrement after either success or failure |
| `operation-completed` | Counter | Increment only after successful completion |
| `operation-failed` | Counter | Increment only after a synchronous throw or asynchronous rejection |

All four instruments use the same snapshot of explicit attributes captured at entry;
the caller's `params` object is not frozen. The local recorder prepares the series key once for
that snapshot and reuses it within the call. Caller-owned attributes passed directly to `counter`
or `gauge` are read again on each recording, so reusing and changing that object remains supported.
A call contributes to
exactly one outcome counter: `completed` means success, not every completion. The callback executes
once and propagates its result or error using the shared operation lifecycle. Use `ctx.counter(...)`
directly when only an event count is needed.

The shared implementation owns active-count balancing and outcome recording. Application code
does not pair increments with decrements. A public raw `upDownCounter` method is not required for
this use case. Backend-specific recording remains in the adapters, including `measurements-otlp`.
At each invocation and settlement, the shared lifecycle sends the corresponding metric changes to
the adapter. The OTLP adapter records them immediately using cached Counter and UpDownCounter
instruments. The existing periodic exporter handles delivery; add no per-call instrument creation,
observer registrations, polling loops, or separate export mechanism for `withCounter`.

Operation counters follow actual callback settlement, even after an explicit child `end()`.
`suspendErrors` controls span reporting only and does not suppress the failed counter. An error
caught inside the callback and converted to an ordinary result is a successful wrapper outcome;
an error log alone does not change it. Telemetry recording failures must not replace the business
result or error.

Session and workspace counts remain in the existing periodic statistics calculation and are published
through `MeasureContext` with explicit dimensions. They are not derived from operation counters.
`MetricObservation`, `observeUpDownCounter`, and public subscription/disposal contracts are outside
this task's scope. Implement only the capabilities required by these call sites.

The regression tests cover parity with `with`, concurrent calls, synchronous throws,
rejected thenables, explicit early `end()`, attribute stability, telemetry failures, and proxy fan-out
without duplicate callback execution.

## Server metric families and session diagnosis

The session manager publishes the current session and workspace gauges once per second. Each
connected session belongs to exactly one `kind`: `user`, `anonymous`, or `system`. A session's
`client_service` comes from `token.extra.service`; missing, empty, or invalid values become `unknown`.
Service attribution and account kind are independent: a service can connect using an ordinary account.
New valid service names become dimension values without a central service allowlist.

| Family | Dimensions | Meaning |
| --- | --- | --- |
| `server-sessions` | `kind`, `client_service` | Current connected sessions; disappeared groups receive zero |
| `server-workspaces` | `kind=user\|system_only\|idle` | Current workspaces; guest-only workspaces are in `user`, and `idle` means no sessions |
| `server-operations` and lifecycle suffixes | `operation`, optional `domain` | Client operations, including `find`, `tx`, and `domain_request` |
| `server-requests` and lifecycle suffixes | `method`, `mode`, `client_service` | Outer WebSocket/RPC handling |
| `server-lifecycle` and lifecycle suffixes | `operation`, optional `client_service` | Session creation and workspace initialization |

Request counters include dispatched handlers that may catch errors and send a protocol error response;
their successful wrapper completion does not imply a successful business operation. Client operation
wrappers record failures before their response handlers catch those errors. Keep the two levels separate.
The hung-session policy and client-message timing metric are outside this change.

For an individual connection, use the existing administrative statistics rather than adding instance
IDs to metric dimensions. Session entries include `clientService`, `kind`, `createTime`, a safe
`sessionInstanceId`, and selected socket details such as `remoteAddress` and `userAgent` when available.
The existing `sessionId` output also uses this safe instance identity: transport socket IDs can contain
bearer tokens and must not be exposed. RPC sockets can have no address or user-agent metadata.

## Transport propagation

Use `ctx.extractMeta()` to obtain transport metadata. Carry it through the existing message or request
metadata contract, then provide it using `options.meta` when entering the receiving operation:

```ts
await receivingCtx.with(
  'worker.consume',
  {},
  async (operationCtx) => await handleMessage(operationCtx),
  undefined,
  { meta: receivedMeta }
)
```

Here `receivedMeta` is the metadata carried by the transport and `handleMessage` is application work.
The adapter owns injection, extraction, and trace-parent selection. Application code does not parse
trace IDs or call OpenTelemetry propagation APIs. Local and no-metrics contexts return empty metadata.

## Backends and configuration

- `MeasureMetricsContext` records local statistics. `NoMetricsContext` still executes callbacks and
  forwards logs but records no metrics. Application work must not depend on a particular backend.
- `createMeasureContextProxy(first, ...others)` fans out operations, metric calls, and completion,
  executing application callbacks once. Logs, `extractMeta`, `getParams`, and readable properties use
  the first context. The first context therefore matters for propagation and logging.
- Bootstrap uses the existing `createOpenTelemetryMetricsContext` factory. It falls back to a local
  context if SDK initialization is unavailable, such as when no trace/common endpoint is configured.
  An unreachable collector does not itself trigger that fallback; initialization does not probe it.
- SDK initialization is shared within the process. Configure it before creating roots. The current
  HTTP exporters append `/v1/traces`, `/v1/metrics`, or `/v1/logs`; a common base endpoint is appropriate.
  The current periodic metrics reader collects every 15 seconds. Trace sampling follows SDK settings.
- Context log export is enabled only with `OTEL_LOGGER_ENABLED=true`. This flag does not disable
  traces or separate analytics reporting hooks. See the adapter for the exact environment contract
  rather than introducing service-specific SDK setup.

## Extending the contract

When adding metric attributes or new instruments, keep the public interface independent of OTel types:

1. Define the behavior and types in `measurements`, including value semantics, attributes, and ownership.
2. Implement the contract in the local, no-metrics, and OTLP contexts. Update the base declarations and
   proxy fan-out; make any backend differences explicit instead of silently losing data.
3. Reuse the existing operation lifecycle, metric publication, and export mechanisms. Keep this task
   limited to `withCounter` and explicit metric dimensions; introduce no generic observer infrastructure.
4. Test externally visible behavior across backends: one execution of business work, parameter
   preservation, completion on success and failure, and metric-series separation.
5. Update this guide and examples together with the implementation; distinguish implemented methods
   from any future proposals.

Existing contract tests are in
[measurements tests](../foundations/core/packages/measurements/src/__tests__)
and [OTLP tests](../foundations/core/packages/measurements-otlp/src/__tests__). In particular,
`base-context-contract.test.ts` covers lifecycle parity and asynchronous tracing behavior.

## Validation for MeasureContext changes

Apply these checks when changing the interface, shared operation lifecycle, metric recording,
context proxy, or backend implementations:

1. Run the Jest suites in both `measurements` and `measurements-otlp`, including the shared contract,
   `withCounter`, proxy, error-isolation, and performance tests. From each package directory, use
   `rtk proxy ./node_modules/.bin/jest --runInBand --coverage=false`. Ensure dependencies resolve to
   the modified sources so stale package artifacts do not produce a false pass.
2. Run the existing [Tinybench driver](../foundations/core/packages/measurements-otlp/src/__tests__/benchmark/run.cjs)
   for timing and retained-memory checks; follow its setup instructions. Compare before and after
   using the same supported Node version, architecture, workloads, and options. Run performance
   checks sequentially, without concurrent tests or other measurement runs.
3. Ensure the benchmark exercises the changed path. Ordinary `with` measurements do not cover
   `withCounter`; counter changes need invocation, active, and outcome recording, and OTLP recording needs
   real in-memory SDK instruments with network export excluded from the timed path. Extend the
   existing coverage where necessary rather than treating an unmeasured path as validated.
4. Report commands, functional test results, timing medians per operation or level, retained memory,
   and failed thresholds. Identify the comparison baseline: a raw-execution multiplier is different
   from a change relative to `with` or the previous implementation. Report pre-existing failures,
   new regressions, and checks that could not run separately; preserve the existing thresholds.
