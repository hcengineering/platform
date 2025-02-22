import postgres, { type Sql } from 'postgres'
import { compress } from 'snappy'

import http from 'node:http'

const port = parseInt(process.env.PORT ?? '6767')
const version = process.env.VERSION ?? '0.6.388'
const dbUrl = process.env.DB_URL ?? 'postgresql://root@host.docker.internal:26257/defaultdb?sslmode=disable'
const extraOptions = JSON.parse(process.env.DB_OPTIONS ?? '{}')

const authToken = process.env.AUTH_TOKEN ?? 'secret'
const tickTimeout = 5000

console.log('Green service: v4 ' + version, ' on port ' + port)

const sql: Sql = postgres(dbUrl, {
  connection: {
    application_name: 'green'
  },
  max: 100,
  min: 2,
  connect_timeout: 10,
  idle_timeout: 30,
  max_lifetime: 300,
  transform: {
    undefined: null
  },
  debug: false,
  notice: false,
  onnotice (notice) {},
  onparameter (key, value) {},
  ...extraOptions,
  prepare: true,
  fetch_types: true
})

async function toResponse (compression: string, data: any, response: http.ServerResponse, qtime: number): Promise<void> {
  if (compression === 'snappy') {
    response
      .writeHead(200, {
        'content-type': 'application/json',
        compression: 'snappy',
        'content-encoding': 'snappy',
        'keep-alive': 'timeout=5',
        querytime: `${qtime}`
      })
      .end(await compress(JSON.stringify(data)))
  } else {
    response
      .writeHead(200, {
        'content-type': 'application/json',
        'keep-alive': 'timeout=5',
        querytime: `${qtime}`
      })
      .end(JSON.stringify(data))
  }
}

const activeQueries = new Map<number, { time: number, cancel: () => void, query: string }>()

setInterval(() => {
  for (const [k, v] of activeQueries.entries()) {
    if (performance.now() - v.time > tickTimeout) {
      console.log('query hang', k, v)
      v.cancel()
      activeQueries.delete(k)
    }
  }
}, tickTimeout)

let queryId = 0

async function handleSQLFind (
  compression: string,
  req: http.IncomingMessage,
  response: http.ServerResponse
): Promise<void> {
  let data = ''
  for await (const chunk of req) {
    data += chunk
  }
  const json = JSON.parse(data)
  const qid = ++queryId
  try {
    const lq = (json.query as string).toLowerCase()
    if (filterInappropriateQuries(lq)) {
      console.error('not allowed', json.query)
      response.writeHead(403).end('Not allowed')
      return
    }
    const st = performance.now()
    const query = sql.unsafe(json.query, json.params, { prepare: true })
    activeQueries.set(qid, {
      time: performance.now(),
      cancel: () => {
        query.cancel()
      },
      query: json.query
    })
    const result = await query
    const qtime = performance.now() - st
    console.log('query', json.query, qtime, result.length)
    await toResponse(compression, result, response, qtime)
  } catch (err: any) {
    console.error('failed to execute sql', json.query, json.params, err.message, err)
    if (!response.writableEnded) {
      response.writeHead(500).end(err.message)
    }
  } finally {
    activeQueries.delete(qid)
  }
}

const reqHandler = (req: http.IncomingMessage, resp: http.ServerResponse): void => {
  const token = ((req.headers.authorization as string) ?? '').split(' ')[1]
  const compression = (req.headers.compression as string) ?? ''
  if (token !== authToken) {
    resp.writeHead(401).end('Unauthorized')
    return
  }

  const url = req.url ?? ''
  if (url.startsWith('/api/v1/version')) {
    resp.writeHead(200).end(version)
    return
  }
  if (req.method === 'POST' && url.startsWith('/api/v1/sql')) {
    void handleSQLFind(compression, req, resp).catch((err) => {
      console.error('failed to execute query: ', err)
    })
  } else {
    resp.writeHead(404).end('Not found')
  }
}

http.createServer(reqHandler).listen(port)
function filterInappropriateQuries (lq: string): boolean {
  const harmfulPatterns = ['begin', 'commit', 'rollback', 'drop', 'alter', 'truncate']
  return harmfulPatterns.some((pattern) => lq.includes(pattern))
}
