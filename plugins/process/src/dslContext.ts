import { Association, Class, Doc, Ref } from '@hcengineering/core'
import { _parseId, Resource } from '@hcengineering/platform'
import { ProcessFunction, processId } from '.'
import {
  Func,
  SelectedConst,
  SelectedContext,
  SelectedContextFunc,
  SelectedExecutionContext,
  SelectedNested,
  SelectedRelation,
  SelectedUserRequest
} from './types'

export function createContext (context: SelectedContext): string {
  try {
    return createDSLContext(context)
  } catch {
    return '$' + JSON.stringify(context)
  }
}

export function createDSLContext (context: SelectedContext): string {
  let expression = ''
  switch (context.type) {
    case 'attribute': {
      expression = `@${context.key}`
      break
    }
    case 'nested': {
      const nested = context
      expression = `@${nested.path}.${nested.key}`
      break
    }
    case 'relation': {
      const rel = context
      expression = `$relation(${rel.association},${rel.direction},${rel.key},${rel.name})`
      break
    }
    case 'context': {
      const ctx = context
      expression = `$context(${ctx.id},${ctx.key})`
      break
    }
    case 'const': {
      const val = context
      expression = `#${encodeValue(val.value)},${val.key}`
      break
    }
    case 'function': {
      const func = context
      expression = encodeFunc(func)
      break
    }
    case 'userRequest': {
      const req = context
      expression = `$userRequest(${req.id},${req.key},${req._class})`
      break
    }
    default: {
      throw new Error(`Unsupported SelectedContext type: ${(context as any)?.type}`)
    }
  }
  const modifiers: string[] = []
  if (context.sourceFunction !== undefined) {
    modifiers.push(encodeSourceFunc(context.sourceFunction))
  }
  for (const func of context.functions ?? []) {
    modifiers.push(encodeFunc(func))
  }
  if (context.fallbackValue !== undefined) {
    modifiers.push(encodeFallback(context.fallbackValue))
  }

  const payload = modifiers.length > 0 ? `${expression}${modifiers.join('')}` : expression
  return '${' + payload + '}'
}

function encodeValue (val: any): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (Array.isArray(val)) {
    return `[${val.map((v) => encodeValue(v)).join(',')}]`
  }
  switch (typeof val) {
    case 'number':
    case 'bigint':
      return val.toString()
    case 'boolean':
      return val ? 'true' : 'false'
    case 'string':
      return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    case 'object': {
      const entries = Object.entries(val).map(([k, v]) => `${k}=${encodeValue(v)}`)
      return `{${entries.join(',')}}`
    }
  }

  return String(val)
}

function encodeSourceFunc (val: Func): string {
  const ref = simplifyFuncRef(val.func as any)
  const props = encodeProps(val.props)
  return props.length > 0 ? `=>SOURCE(${ref},${props})` : `=>SOURCE(${ref})`
}

function encodeFallback (val: any): string {
  // If fallback is a simple value, encode it directly. If it's an object, treat as props.
  if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
    return `=>FALLBACK(${encodeProps(val)})`
  }
  return `=>FALLBACK(${encodeValue(val)})`
}

function encodeFunc (val: Func): string {
  const ref = simplifyFuncRef(val.func as any)
  const props = encodeProps(val.props ?? {})
  return `=>${ref}(${props})`
}

function encodeProps (props: Record<string, any>): string {
  const res: string[] = []
  for (const [key, value] of Object.entries(props)) {
    res.push(`${key}=${encodeValue(value)}`)
  }
  return res.join(',')
}

function simplifyFuncRef (val: Resource<Ref<ProcessFunction>>): string {
  try {
    const parsed = _parseId(val)
    if (parsed.kind === 'function') {
      if (parsed.component === processId) return parsed.name
      return `${parsed.component}.${parsed.name}`
    }
    return `${parsed.component}.${parsed.kind}.${parsed.name}`
  } catch {
    return val
  }
}

type Base<T extends SelectedContext> = Omit<T, 'fallbackValue' | 'functions' | 'sourceFunction'>
type Modifiers = Pick<SelectedContext, 'fallbackValue' | 'functions' | 'sourceFunction'>

export function parseDSLContext (dsl: string): SelectedContext | undefined {
  let s = dsl.trim()
  if (s.startsWith('${') && s.endsWith('}')) {
    s = s.slice(2, -1).trim()
  }

  try {
    const tokens = splitTopLevel(s, '=>')
    if (tokens.length === 0) return undefined

    const expr = tokens[0]
    const modifiers = tokens.slice(1)

    const base = parseExpression(expr)

    const { sourceFunction, functions, fallbackValue } = parseModifiers(modifiers)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const res: SelectedContext = {
      ...base,
      functions,
      sourceFunction,
      fallbackValue
    } as SelectedContext
    return res
  } catch {
    return undefined
  }
}

function parseExpression (expr: string): Base<SelectedContext> {
  if (expr.startsWith('@')) {
    const body = expr.slice(1)
    const dot = body.indexOf('.')
    if (dot === -1) {
      return { type: 'attribute', key: body }
    }
    const res: Base<SelectedNested> = { type: 'nested', path: body.slice(0, dot), key: body.slice(dot + 1) }
    return res
  }

  if (expr.startsWith('#')) {
    const lastComma = expr.lastIndexOf(',')
    if (lastComma === -1) throw new Error('Invalid const expression')
    const valueStr = expr.slice(1, lastComma)
    const key = expr.slice(lastComma + 1)
    const res: Base<SelectedConst> = { type: 'const', value: decodeValue(valueStr), key }
    return res
  }

  if (expr.startsWith('$relation(')) {
    const inside = expr.slice('$relation('.length, -1)
    const parts = splitTopLevel(inside, ',')
    const association = parts[0] as Ref<Association>
    const direction = parts[1] as 'A' | 'B'
    const key = parts[2]
    const name = parts[3]
    const res: Base<SelectedRelation> = { type: 'relation', association, direction, key, name }
    return res
  }

  if (expr.startsWith('$context(')) {
    const inside = expr.slice('$context('.length, -1)
    const parts = splitTopLevel(inside, ',')
    const id = decodeValue(parts[0])
    const key = parts[1]
    const res: Base<SelectedExecutionContext> = { type: 'context', id, key }
    return res
  }

  if (expr.startsWith('$userRequest(')) {
    const inside = expr.slice('$userRequest('.length, -1)
    const parts = splitTopLevel(inside, ',')
    const id = decodeValue(parts[0])
    const key = parts[1]
    const _class = parts[2] as Ref<Class<Doc>>

    const res: Base<SelectedUserRequest> = { type: 'userRequest', id, key, _class }
    return res
  }

  if (expr.startsWith('=>')) {
    // function expression as primary
    const fn = parseFuncToken(expr)
    const res: Base<SelectedContextFunc> = { type: 'function', func: fn.func, props: fn.props, key: '' }
    return res
  }

  throw new Error(`Unsupported DSL expression: ${expr}`)
}

function parseModifiers (modifiers: string[]): Modifiers {
  const res: Modifiers = {}
  for (const m of modifiers) {
    if (m.startsWith('=>SOURCE(')) {
      const inside = m.slice('=>SOURCE('.length, -1)
      const parts = splitTopLevel(inside, ',')
      const funcRef = parts[0]
      const props = parts.length > 1 && parts[1].length > 0 ? parseProps(parts[1]) : {}
      res.sourceFunction = { func: expandFuncRef(funcRef), props }
    } else if (m.startsWith('=>FALLBACK(')) {
      const inside = m.slice('=>FALLBACK('.length, -1)
      if (inside.includes('=')) {
        res.fallbackValue = parseProps(inside)
      } else {
        res.fallbackValue = decodeValue(inside)
      }
    } else if (m.startsWith('=>')) {
      const fn = parseFuncToken(m)
      res.functions = res.functions ?? []
      res.functions.push(fn)
    }
  }
  return res
}

function splitTopLevel (s: string, separator: string): string[] {
  const res: string[] = []
  let cur = ''
  let depth = 0
  let quote: string | null = null
  let escaped = false
  let templateDepth = 0

  const sep = separator

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]

    if (quote !== null) {
      cur += ch
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === quote) quote = null
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      escaped = false
      continue
    }

    if (ch === '$' && s[i + 1] === '{') {
      cur += '${'
      templateDepth++
      depth++
      i++
      continue
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++
      cur += ch
      continue
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      if (ch === '}' && templateDepth > 0) templateDepth--
      depth = Math.max(0, depth - 1)
      cur += ch
      continue
    }

    if (depth === 0 && templateDepth === 0) {
      if (sep.length === 1) {
        if (ch === sep) {
          res.push(cur.trim())
          cur = ''
          continue
        }
      } else {
        if (s.substring(i, i + sep.length) === sep) {
          if (cur.length > 0) res.push(cur)
          cur = sep
          i += sep.length - 1
          continue
        }
      }
    }

    cur += ch
  }

  if (cur.length > 0) res.push(cur.trim())
  return res
}

function parseFuncToken (token: string): Func {
  const body = token.slice(2)
  const open = body.indexOf('(')
  if (open === -1) {
    return { func: expandFuncRef(body), props: {} }
  }
  const ref = body.slice(0, open)
  const inside = body.slice(open + 1, -1)
  const props = inside.length > 0 ? parseProps(inside) : {}
  return { func: expandFuncRef(ref), props }
}

function parseProps (s: string): Record<string, any> {
  const out: Record<string, any> = {}
  if (s.trim().length === 0) return out
  const parts = splitTopLevel(s, ',')
  for (const p of parts) {
    const eq = p.indexOf('=')
    if (eq === -1) continue
    const key = p.slice(0, eq)
    const valStr = p.slice(eq + 1)
    out[key] = decodeValue(valStr)
  }
  return out
}

function decodeValue (s: string): any {
  const str = s.trim()
  if (str === 'null') return null
  if (str === 'undefined') return undefined
  if (str === 'true') return true
  if (str === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    const n = Number(str)
    return Number.isNaN(n) ? str : n
  }
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1).replace(/\\"/g, '"')
  }
  if (str.startsWith('[') && str.endsWith(']')) {
    const inner = str.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map(decodeValue)
  }
  if (str.startsWith('{') && str.endsWith('}')) {
    const inner = str.slice(1, -1).trim()
    if (inner === '') return {}
    const obj: Record<string, any> = {}
    const entries = splitTopLevel(inner, ',')
    for (const entry of entries) {
      const eq = entry.indexOf('=')
      if (eq === -1) continue
      const key = entry.slice(0, eq).trim()
      const val = entry.slice(eq + 1).trim()
      obj[key] = decodeValue(val)
    }
    return obj
  }
  return str
}

function expandFuncRef (val: any): Ref<ProcessFunction> {
  if (typeof val !== 'string') return val as Ref<ProcessFunction>
  const parts = val.split('.')
  if (parts.length === 1) {
    return `${processId}:function:${val}` as Ref<ProcessFunction>
  }
  if (parts.length === 2) {
    return `${parts[0]}:function:${parts[1]}` as Ref<ProcessFunction>
  }
  return val.replaceAll('.', ':') as Ref<ProcessFunction>
}
