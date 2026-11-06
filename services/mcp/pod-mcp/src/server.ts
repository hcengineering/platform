//
// Copyright © 2026 TraceX.
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type PlatformContext } from '@hcengineering/ai-core'
import { tools } from '@hcengineering/ai-tools'
import { type MeasureContext } from '@hcengineering/core'
import {
  createMcpExpressApp,
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  requireBearerAuth
} from '@modelcontextprotocol/express'
import { toNodeHandler } from '@modelcontextprotocol/node'
import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  type AuthInfo,
  type CallToolResult
} from '@modelcontextprotocol/server'
import cors from 'cors'
import express, { type Express } from 'express'
import { type Server } from 'http'

import { type McpConfig } from './config'
import { createMcpTokenVerifier, type TraceXAuthInfo } from './auth'
import { jsonStructuredText, jsonText } from './mcp'
import { registerMeWorkspacesTool } from './tools/me/workspaces'
import type { WorkspaceConnection, WorkspaceManager } from './workspace'

const SERVER_NAME = 'tracex-mcp'
const SERVER_VERSION = '0.1.0'
const SERVER_INSTRUCTIONS = `TraceX MCP provides tools for the workspaces accessible to the authenticated TraceX account. Never ask the user for tokens or expose token values.

Call my.workspaces to discover workspaces authorized by this connection. A connection may be restricted to one workspace. Every other tool requires the exact workspace ID returned by my.workspaces. There is no implicit current or last-used workspace. When the intended workspace is ambiguous, ask the user before proceeding. Do not guess from duplicate workspace or object names. State the target workspace when reporting changes. Production and staging are separate installations.

Use read-only tools first to discover the available object types, allowed fields, and stable identifiers before making changes. Do not invent workspace ids, object ids, class ids, mixin ids, type ids, or attribute keys; obtain them from tool results or ask the user to clarify.

Call mutating tools only when the user clearly intends to create, update, delete, mark, or otherwise change workspace data. Before mutating an existing object, load its current state when it is not already known, respect readonly or historical-version errors, and stop instead of forcing a change.

When tools expose structured schemas, follow those schemas exactly.

Prefer narrow queries and practical limits. Request only enough results to answer the user's task, use filters when available, and prefer structuredContent from tool results when present. If a tool returns an error, use the error code and message to correct the request; do not repeatedly retry the same invalid arguments.`

type ToolDefinition = (typeof tools)[number]
type ToolExecutionResult = Awaited<ReturnType<ToolDefinition['execute']>>

export function createServer (config: McpConfig, workspaceManager: WorkspaceManager, ctx: MeasureContext): Express {
  const resourceServerUrl = new URL(config.OAuthResourceURL)
  const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: [resourceServerUrl.hostname] })

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
  app.use(
    mcpAuthMetadataRouter({
      oauthMetadata: {
        issuer: config.OAuthIssuerURL,
        authorization_endpoint: `${config.OAuthIssuerURL}/authorize`,
        token_endpoint: `${config.OAuthIssuerURL}/token`,
        registration_endpoint: `${config.OAuthIssuerURL}/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: ['tracex']
      },
      resourceServerUrl,
      resourceName: 'TraceX MCP',
      scopesSupported: ['tracex'],
      dangerouslyAllowInsecureIssuerUrl: config.OAuthAllowHttp
    })
  )

  app.all(
    resourceServerUrl.pathname,
    requireBearerAuth({
      verifier: createMcpTokenVerifier(config),
      requiredScopes: ['tracex'],
      expectedResource: resourceServerUrl,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceServerUrl).toString()
    }),
    (req, res) => {
      void nodeHandler(req, res, req.body).catch((err) => {
        ctx.error('MCP request failed', errorLog(err))
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' })
        }
      })
    }
  )

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
      instructions: `${SERVER_INSTRUCTIONS}\n\nConnected TraceX installation: ${String(auth.resource)}`
    }
  )

  registerMeWorkspacesTool(server, workspaceManager, auth)

  for (const tool of tools) {
    const inputSchema = {
      ...tool.inputSchema,
      properties: {
        ...tool.inputSchema.properties,
        workspace: {
          type: 'string',
          description:
            'Exact workspace ID returned by my.workspaces. Required for every call; never infer an implicit current workspace.'
        }
      },
      required: [...(tool.inputSchema.required ?? []), 'workspace']
    }
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: fromJsonSchema<Record<string, unknown>>(inputSchema),
        ...(tool.outputSchema !== undefined ? { outputSchema: fromJsonSchema(tool.outputSchema) } : {})
      },
      async (args) => {
        const { workspace, ...input } = args
        if (typeof workspace !== 'string' || workspace === '') {
          return jsonText(
            { error: { code: 'workspace_required', message: 'Choose an explicit workspace ID from my.workspaces.' } },
            true
          )
        }
        try {
          const connection = await workspaceManager.getConnection(
            auth.extra.accountToken,
            workspace,
            auth.extra.workspaceId
          )
          const result = toToolResult(tool, await tool.execute(input, createToolContext(ctx, connection)))
          return {
            ...result,
            content: [
              {
                type: 'text' as const,
                text: `TraceX workspace: ${connection.workspaceName} (${connection.workspaceUrl}; ${workspace})\nInstallation: ${String(auth.resource)}`
              },
              ...result.content
            ]
          }
        } catch {
          return jsonText(
            {
              error: {
                code: 'workspace_operation_failed',
                message:
                  'The operation failed. Verify the workspace with my.workspaces and reload the object before retrying. If the TraceX session has expired, reconnect.',
                workspace
              }
            },
            true
          )
        }
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
    workspaceIds: connection.workspaceIds,
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

function getTraceXAuthInfo (authInfo: AuthInfo | undefined): TraceXAuthInfo {
  if (
    typeof authInfo?.extra?.accountToken !== 'string' ||
    typeof authInfo.extra.connectionId !== 'string' ||
    authInfo.extra.workspaceId === undefined
  ) {
    throw new Error('Missing authenticated TraceX MCP request')
  }
  return authInfo as TraceXAuthInfo
}

function errorLog (err: unknown): { error: string, stack?: string } {
  return err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) }
}
