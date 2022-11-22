import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { readSyncMessage, writeSyncStep1, writeUpdate } from 'y-protocols/sync'
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs'

import { createDecoder, readVarUint, readVarUint8Array } from 'lib0/decoding'
import { createEncoder, length, toUint8Array, writeVarUint, writeVarUint8Array } from 'lib0/encoding'

import { Token } from '@hcengineering/server-token'
import WebSocket from 'ws'

import { MinioService } from '@hcengineering/minio'

const wsReadyStateConnecting = 0
const wsReadyStateOpen = 1
const wsReadyStateClosing = 2 // eslint-disable-line
const wsReadyStateClosed = 3 // eslint-disable-line

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0'

/**
 * @public
 */
export interface YPersistence {
  bindState: (
    documentId: string,
    ydoc: WSSharedDoc,
    token: Token,
    minio: MinioService,
    initialContentId: string
  ) => Promise<void>
  writeState: (documentId: string, ydoc: WSSharedDoc, token: Token) => Promise<void>
  provider: any
}

/**
 * @public
 */
let persistence: YPersistence
persistence = {
  provider: 'platform',
  bindState: async (
    documentId: string,
    ydoc: WSSharedDoc,
    token: Token,
    minio: MinioService,
    initialContentId: string
  ): Promise<void> => {
    try {
      ydoc.minio = minio

      let minioDocument: Buffer | undefined
      try {
        minioDocument = Buffer.concat(await minio.read(token.workspace, documentId))
        console.log('bind for document', documentId, token.email)
      } catch (err: any) {
        if (initialContentId !== undefined && initialContentId.length > 0) {
          // Try first take existing document.

          const existingDoc = getYDoc(initialContentId, token, true, minio, initialContentId, false)
          if (existingDoc !== undefined) {
            const newUpdates = encodeStateAsUpdate(existingDoc)
            minioDocument = Buffer.from(newUpdates.buffer)
            console.log('bind for existing document', documentId, token.email)
          } else {
            minioDocument = Buffer.concat(await minio.read(token.workspace, initialContentId))
            console.log('bind for initial document', documentId, token.email, initialContentId)
          }
        }
      }

      if (minioDocument !== undefined && minioDocument.length > 0) {
        try {
          const uint8arr = new Uint8Array(minioDocument)
          applyUpdate(ydoc, uint8arr)
        } catch (err) {
          console.error(err)
        }
      }
    } catch (err: any) {
      console.error(err)
    }
  },
  writeState: async (documentId: string, ydoc: WSSharedDoc, token: Token): Promise<void> => {
    try {
      const newUpdates = encodeStateAsUpdate(ydoc)
      const buffer = Buffer.from(newUpdates.buffer)

      await ydoc?.minio?.put(token.workspace, documentId, buffer)

      console.log('state written for', documentId, token.email)
    } catch (err: any) {
      console.error(err)
    }
  }
}

/**
 * @public
 */
export function setPersistence (persistence_: YPersistence): void {
  persistence = persistence_
}

/**
 * @public
 */
export const getPersistence = (): YPersistence | null => persistence

/**
 * @public
 */
export const docs: Map<string, WSSharedDoc> = new Map()

const messageSync = 0
const messageAwareness = 1
// const messageAuth = 2

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
const updateHandler = (update: Uint8Array, origin: any, doc: WSSharedDoc): any => {
  const encoder = createEncoder()
  writeVarUint(encoder, messageSync)
  writeUpdate(encoder, update)
  const message = toUint8Array(encoder)
  doc.conns.forEach((_, conn) => send(doc, conn, message))
}

export interface ConnectionEntry {
  ids: Set<number>
  token: Token
}

class WSSharedDoc extends Doc {
  conns = new Map<WebSocket, ConnectionEntry>()
  awareness: Awareness

  minio?: MinioService

  /**
   * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
   * @param {Object | null} conn Origin is the connection that made the change
   */
  awarenessChangeHandler = (
    { added, updated, removed }: { added: Array<number>, updated: Array<number>, removed: Array<number> },
    conn: WebSocket | null
  ): void => {
    const changedClients = added.concat(updated, removed)
    if (conn !== null) {
      const connControlledIDs = /** @type {Set<number>} */ this.conns.get(conn)
      if (connControlledIDs !== undefined) {
        added.forEach((clientID) => {
          connControlledIDs.ids.add(clientID)
        })
        removed.forEach((clientID) => {
          connControlledIDs.ids.delete(clientID)
        })
      }
    }
    // broadcast awareness update
    const encoder = createEncoder()
    writeVarUint(encoder, messageAwareness)
    writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changedClients))
    const buff = toUint8Array(encoder)
    this.conns.forEach((_, c) => {
      send(this, c, buff)
    })
  }

  constructor (readonly name: string) {
    super({ gc: gcEnabled })

    this.awareness = new Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.awarenessChangeHandler)
    this.on('update', updateHandler)
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docId - the name of the Y.Doc to find or create
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
export function getYDoc (
  docId: string,
  token: Token,
  gc = true,
  minio: MinioService,
  initialContentId: string,
  allowBind = true
): WSSharedDoc | undefined {
  let doc = docs.get(docId)
  if (doc === undefined && allowBind) {
    doc = new WSSharedDoc(docId)
    doc.gc = gc
    docs.set(docId, doc)

    void persistence.bindState(docId, doc, token, minio, initialContentId)
  }
  return doc
}
/**
 * @param {any} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = (conn: any, doc: WSSharedDoc, message: Uint8Array): void => {
  try {
    const encoder = createEncoder()
    const decoder = createDecoder(message)
    const messageType = readVarUint(decoder)
    switch (messageType) {
      case messageSync:
        writeVarUint(encoder, messageSync)
        readSyncMessage(decoder, encoder, doc, null)

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1.
        if (length(encoder) > 1) {
          send(doc, conn, toUint8Array(encoder))
        }
        break
      case messageAwareness: {
        applyAwarenessUpdate(doc.awareness, readVarUint8Array(decoder), conn)
        break
      }
    }
  } catch (err) {
    console.error(err)
    doc.emit('error', [err])
  }
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc: WSSharedDoc, conn: any): void => {
  if (doc.conns.has(conn)) {
    /**
     * @type {Set<number>}
     */
    const controlledIds = doc.conns.get(conn)
    doc.conns.delete(conn)
    removeAwarenessStates(doc.awareness, Array.from(controlledIds?.ids?.values() ?? []), null)
    if (doc.conns.size === 0 && persistence !== null) {
      // if persisted, we store state and destroy ydocument
      if (controlledIds !== undefined) {
        void persistence.writeState(doc.name, doc, controlledIds?.token).then(() => {
          docs.delete(doc.name)
          doc.destroy()
        })
      }
    }
  }
  conn.close()
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 * @param {Uint8Array} m
 */
const send = (doc: WSSharedDoc, conn: any, m: Uint8Array): void => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn)
  }
  try {
    conn.send(
      m,
      /** @param {any} err */ (err: any) => {
        err != null && closeConn(doc, conn)
      }
    )
  } catch (e) {
    closeConn(doc, conn)
  }
}

const pingTimeout = 30000

export function setupWSConnection (
  conn: WebSocket,
  req: any,
  documentId: string,
  token: Token,
  minio: MinioService,
  initialContentId: string,
  gc = true
): void {
  conn.binaryType = 'arraybuffer'
  // get doc, initialize if it does not exist yet
  const doc = getYDoc(documentId, token, gc, minio, initialContentId)
  if (doc === undefined) {
    conn.close()
    return
  }
  doc.conns.set(conn, { ids: new Set(), token })
  // listen and reply to events
  conn.on('message', (message: ArrayBuffer) => messageListener(conn, doc, new Uint8Array(message)))

  // Check if connection is still alive
  let pongReceived = true
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn)
      }
      clearInterval(pingInterval)
    } else if (doc.conns.has(conn)) {
      pongReceived = false
      try {
        conn.ping()
      } catch (e) {
        closeConn(doc, conn)
        clearInterval(pingInterval)
      }
    }
  }, pingTimeout)
  conn.on('close', () => {
    closeConn(doc, conn)
    clearInterval(pingInterval)
  })
  conn.on('pong', () => {
    pongReceived = true
  })
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = createEncoder()
    writeVarUint(encoder, messageSync)
    writeSyncStep1(encoder, doc)
    send(doc, conn, toUint8Array(encoder))
    const awarenessStates = doc.awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder = createEncoder()
      writeVarUint(encoder, messageAwareness)
      writeVarUint8Array(encoder, encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
      send(doc, conn, toUint8Array(encoder))
    }
  }
}
