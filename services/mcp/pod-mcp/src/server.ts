//
// Copyright © 2026 TraceX.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { type PlatformContext } from '@hcengineering/ai-core'
import { tools } from '@hcengineering/ai-tools'
import { type MeasureContext } from '@hcengineering/core'
import { decodeToken, readToken, type Token } from '@hcengineering/server-token'

import { createMcpExpressApp } from '@modelcontextprotocol/express'
import { toNodeHandler } from '@modelcontextprotocol/node'
import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  type AuthInfo,
  type CallToolResult
} from '@modelcontextprotocol/server'
import cors from 'cors'
import express, { type Express, type Request } from 'express'
import { type Server } from 'http'

import { type McpConfig } from './config'
import { jsonStructuredText, jsonText } from './mcp'
import type { WorkspaceConnection, WorkspaceManager } from './workspace'

const SERVER_NAME = 'tracex-mcp'
const SERVER_VERSION = '0.1.0'
const SERVER_INSTRUCTIONS = `TraceX MCP provides tools for working with the TraceX workspace. Every request is scoped to the bearer token used to connect to this MCP server; do not ask the user for tokens and never expose token values.

Use read-only tools first to discover the available object types, allowed fields, and stable identifiers before making changes. Do not invent workspace ids, object ids, class ids, mixin ids, type ids, or attribute keys; obtain them from tool results or ask the user to clarify.

Call mutating tools only when the user clearly intends to create, update, delete, mark, or otherwise change workspace data. Before mutating an existing object, load its current state when it is not already known, respect readonly or historical-version errors, and stop instead of forcing a change.

When tools expose structured schemas, follow those schemas exactly.

Prefer narrow queries and practical limits. Request only enough results to answer the user's task, use filters when available, and prefer structuredContent from tool results when present. If a tool returns an error, use the error code and message to correct the request; do not repeatedly retry the same invalid arguments.`

type ToolDefinition = (typeof tools)[number]
type ToolExecutionResult = Awaited<ReturnType<ToolDefinition['execute']>>

export type TraceXAuthInfo = AuthInfo & {
  extra: {
    tracexToken: Token
  }
}

type AuthenticatedRequest = Request & {
  auth?: AuthInfo
}

export function createServer (config: McpConfig, workspaceManager: WorkspaceManager, ctx: MeasureContext): Express {
  const app = createMcpExpressApp({ host: '0.0.0.0' })

  app.use(cors())
  app.use(express.json({ limit: '5mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: config.ServiceID, server: SERVER_NAME })
  })

  const handler = createMcpHandler(
    ({ authInfo }) => createMcpServer(getTraceXAuthInfo(authInfo), workspaceManager, ctx),
    { responseMode: 'json' }
  )
  const nodeHandler = toNodeHandler(handler)

  app.all('/mcp', authenticateRequest(config, ctx), (req, res) => {
    void nodeHandler(req, res, req.body).catch((err) => {
      ctx.error('MCP request failed', errorLog(err))
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' })
      }
    })
  })

  return app
}

export function listen (app: Express, port: number, ctx: MeasureContext, host?: string): Server {
  const cb = (): void => {
    ctx.info('TraceX MCP service started', { host: host ?? '*', port })
  }
  return host !== undefined ? app.listen(port, host, cb) : app.listen(port, cb)
}

export function createMcpServer (
  auth: TraceXAuthInfo,
  workspaceManager: WorkspaceManager,
  ctx: MeasureContext
): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    {
      instructions: SERVER_INSTRUCTIONS
    }
  )

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: fromJsonSchema<Record<string, unknown>>(tool.inputSchema),
        ...(tool.outputSchema !== undefined ? { outputSchema: fromJsonSchema(tool.outputSchema) } : {})
      },
      async (args) => {
        const connection = await workspaceManager.getConnection(auth.extra.tracexToken, auth.token)
        const result = await tool.execute(args, createToolContext(ctx, connection))
        return toToolResult(tool, result)
      }
    )
  }

  return server
}

function createToolContext (ctx: MeasureContext, connection: WorkspaceConnection): PlatformContext {
  return {
    ctx,
    token: connection.token,
    rawToken: connection.rawToken,
    workspace: connection.workspace,
    client: connection.client,
    hierarchy: connection.client.getHierarchy(),
    model: connection.client.getModel(),
    storage: connection.storage,
    collaborator: connection.collaborator
  }
}

export function toToolResult (tool: ToolDefinition, result: ToolExecutionResult): CallToolResult {
  return result.ok
    ? tool.outputSchema !== undefined
      ? jsonStructuredText(result.output)
      : jsonText(result.output)
    : jsonText({ error: result.error }, true)
}

function authenticateRequest (config: McpConfig, ctx: MeasureContext): express.RequestHandler {
  return (req: AuthenticatedRequest, res, next) => {
    const rawToken = readToken(req.headers)
    if (rawToken === undefined) {
      res.status(401).json({ error: 'Missing bearer token' })
      return
    }

    try {
      const token = decodeToken(rawToken, true, config.ServerSecret)
      req.auth = createAuthInfo(rawToken, token)
      next()
    } catch (err) {
      ctx.warn('Invalid MCP token', errorLog(err))
      res.status(401).json({ error: 'Invalid token' })
    }
  }
}

export function createAuthInfo (rawToken: string, token: Token): TraceXAuthInfo {
  return {
    token: rawToken,
    clientId: String(token.account),
    scopes: [],
    extra: {
      tracexToken: token
    }
  }
}

function getTraceXAuthInfo (authInfo: AuthInfo | undefined): TraceXAuthInfo {
  const token = authInfo?.extra?.tracexToken
  if (authInfo === undefined || token === undefined) {
    throw new Error('Missing authenticated TraceX MCP request')
  }
  return authInfo as TraceXAuthInfo
}

function errorLog (err: unknown): { error: string, stack?: string } {
  return err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) }
}
