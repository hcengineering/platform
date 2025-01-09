import bigInt from 'big-integer'
import { Api, Logger, TelegramClient } from 'telegram'
import { computeCheck } from 'telegram/Password'
import type { _MessagesIter } from 'telegram/client/messages'
import type { EntityLike } from 'telegram/define'
import { RPCError } from 'telegram/errors'
import type { NewMessageEvent } from 'telegram/events'
import { NewMessage } from 'telegram/events'
import { StringSession } from 'telegram/sessions'
import type { Dialog } from 'telegram/tl/custom/dialog'
import config from './config'
import { ApiError, Code } from './error'
// Using built-in types instead of node:timers for better compatibility
type Timeout = ReturnType<typeof setTimeout>

Logger.setLevel('none')

type SignInState = 'init' | 'code' | 'pass' | 'end'
class SignInFlow {
  private _state: SignInState = 'init'
  private codeHash: string | undefined

  constructor (
    private readonly client: TelegramClient,
    private readonly phone: string,
    private readonly onEnd: () => void
  ) {}

  async init (): Promise<void> {
    if (this._state !== 'init') {
      throw Error('Invalid sign in method')
    }

    const res = await this.client.sendCode(this.creds, this.phone)
    this.codeHash = res.phoneCodeHash
    this._state = 'code'
  }

  get state (): SignInState {
    return this._state
  }

  async code (code: string): Promise<boolean> {
    if (this._state !== 'code') {
      throw Error('Invalid sign in method')
    }

    try {
      const res = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.phone,
          phoneCodeHash: this.codeHash,
          phoneCode: code
        })
      )

      if (res instanceof Api.auth.AuthorizationSignUpRequired) {
        throw Error('Account does not exist')
      }

      this.finish()
      return true
    } catch (err: unknown) {
      if (err instanceof RPCError) {
        const untypedErr: any = err
        if (untypedErr.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          this._state = 'pass'
          return false
        }

        if (untypedErr.errorMessage === 'PHONE_CODE_INVALID') {
          throw new ApiError(Code.PhoneCodeInvalid, err.message)
        }
      }

      throw err
    }
  }

  async pass (password: string): Promise<void> {
    if (this._state !== 'pass') {
      throw Error('Invalid sign in method')
    }

    const passSrpRes = await this.client.invoke(new Api.account.GetPassword())
    const passSrpCheck = await computeCheck(passSrpRes, password)
    await this.client.invoke(new Api.auth.CheckPassword({ password: passSrpCheck }))

    this.finish()
  }

  private finish (): void {
    this._state = 'end'
    this.onEnd()
  }

  private get creds (): { apiId: number, apiHash: string } {
    return {
      apiId: this.client.apiId,
      apiHash: this.client.apiHash
    }
  }
}

type Listener = (user: Api.User, msg: Api.Message) => void

class TelegramConnection {
  private _signInFlow: SignInFlow | undefined
  private readonly listeners = new Map<number, Listener>()
  private subID = 0
  private handlerAdded = false
  private readinessInterval: Timeout | undefined
  private connecting = false
  private reconnectAttempts = 0
  private static readonly MAX_RECONNECT_ATTEMPTS = 3
  private static readonly RECONNECT_TIMEOUT = 5000 // 5 seconds timeout for connection attempts
  private static readonly RECONNECT_BACKOFF = 1000 // Add 1 second delay between retries

  private delay (ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  constructor (
    readonly client: TelegramClient,
    readonly phone: string
  ) {
    // Important: this routine is also required to keep getting telegram updates
    // For some reason gramjs (or Telegram API) stops getting updates after minute or so and
    // calling api methods works like workaround
    this.setReadinessInterval()
  }

  setReadinessInterval (): void {
    if (this.readinessInterval === undefined) {
      this.readinessInterval = setInterval(() => {
        void this.reconnect()
      }, 30 * 1000)
    }
  }

  private async connectWithTimeout (): Promise<void> {
    const timeoutId = setTimeout(() => {
      // Force disconnect if we timeout
      void this.client.disconnect()
      throw new Error('Connection attempt timed out')
    }, TelegramConnection.RECONNECT_TIMEOUT)

    try {
      await this.client.connect()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async tryReconnect (): Promise<void> {
    if (this.connecting) {
      return
    }

    if (this.client.connected === true) {
      console.log('Already connected')
      this.reconnectAttempts = 0 // Reset counter on successful connection
      return
    }

    if (this.reconnectAttempts >= TelegramConnection.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnection attempts (${TelegramConnection.MAX_RECONNECT_ATTEMPTS}) reached`)
      // Reset counter but wait for next interval
      this.reconnectAttempts = 0
      return
    }

    try {
      this.connecting = true
      await this.connectWithTimeout()
      this.reconnectAttempts = 0 // Reset on successful connection
    } catch (e: unknown) {
      this.reconnectAttempts++

      // Handle specific error types
      if (e instanceof RPCError) {
        // Handle Telegram RPC-specific errors
        const rpcError = e
        console.error(`Telegram RPC error during connection attempt ${this.reconnectAttempts}: ${rpcError.message}`)
        if (
          rpcError.message.includes('AUTH_KEY_UNREGISTERED') ||
          rpcError.message.includes('SESSION_REVOKED')
        ) {
          // Authentication errors - need to re-authenticate
          this._signInFlow = undefined // Force re-authentication
          throw new ApiError(Code.PhoneCodeInvalid, 'Re-authentication required') // Use existing auth error code
        }
      } else if (e instanceof Error) {
        const error = e
        if (error.message.includes('Connection attempt timed out')) {
          console.error(`Connection timeout on attempt ${this.reconnectAttempts}`)
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENETUNREACH')) {
          console.error(`Network error on attempt ${this.reconnectAttempts}: ${error.message}`)
        } else {
          console.error(`Connection attempt ${this.reconnectAttempts} failed: ${error.message}`)
        }
      } else {
        console.error(`Connection attempt ${this.reconnectAttempts} failed with unknown error`)
      }

      // Add exponential backoff delay using callback
      const backoffDelay = TelegramConnection.RECONNECT_BACKOFF * Math.pow(2, this.reconnectAttempts - 1)
      await this.delay(backoffDelay)

      // If we've hit max attempts, emit a more specific error
      if (this.reconnectAttempts >= TelegramConnection.MAX_RECONNECT_ATTEMPTS) {
        throw new ApiError(
          Code.PhoneCodeInvalid,
          `Failed to connect after ${TelegramConnection.MAX_RECONNECT_ATTEMPTS} attempts`
        ) // Use existing error code
      }
    } finally {
      this.connecting = false
    }
  }

  async reconnect (): Promise<void> {
    try {
      const ready = await this.isReady()

      if (!ready) {
        await this.tryReconnect()
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Reconnection error: ${err.message}`)
      } else {
        console.error('Unknown reconnection error occurred')
      }
    }
  }

  private clearHandlers (): void {
    // Clear all event handlers to prevent memory leaks
    this.client.listEventHandlers().forEach(([builder, callback]) => {
      this.client.removeEventHandler(callback, builder)
    })
    this.handlerAdded = false
    this.listeners.clear()
    this.subID = 0
  }

  private clearIntervals (): void {
    if (this.readinessInterval !== undefined) {
      clearInterval(this.readinessInterval)
      this.readinessInterval = undefined
    }
  }

  async close (): Promise<void> {
    this.clearIntervals()
    this.clearHandlers()

    try {
      await this.client.disconnect()
    } catch (e) {
      // Log but don't throw as we're cleaning up
      console.error('Error during disconnect:', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async signOut (): Promise<void> {
    try {
      await this.client.invoke(new Api.auth.LogOut())
    } finally {
      // Always clean up resources even if logout fails
      await this.close()
      this._signInFlow = undefined
    }
  }

  async signIn (): Promise<void> {
    // Clear any existing handlers before starting new sign in
    this.clearHandlers()

    this._signInFlow = new SignInFlow(this.client, this.phone, () => {
      this._signInFlow = undefined
      this.client.session.save()
    })

    await this._signInFlow.init()
  }

  async isReady (): Promise<boolean> {
    if (this._signInFlow !== undefined) {
      return false
    }

    return await this.client.isUserAuthorized()
  }

  get signInFlow (): typeof this._signInFlow {
    return this._signInFlow
  }

  handleSub (): void {
    if (this.handlerAdded) {
      return
    }

    this.handlerAdded = true
    this.client.addEventHandler((update: NewMessageEvent) => {
      void (async () => {
        if (!(update.isPrivate ?? false)) {
          return
        }

        const user = await update.message.getChat()
        if (user === undefined || user.className !== 'User') {
          return
        }

        for (const listener of this.listeners.values()) {
          listener(user, update.message)
        }
      })()
    }, new NewMessage({}))
  }

  sub (l: Listener): () => void {
    this.handleSub()
    const subID = this.subID++
    this.listeners.set(subID, l)

    return () => this.listeners.delete(subID)
  }

  getMsgs (user: EntityLike, from?: number, to?: number, limit?: number): _MessagesIter {
    return this.client.iterMessages(user, {
      minId: to,
      limit,
      maxId: from
    }) as _MessagesIter
  }

  async getUsers (): Promise<Api.User[]> {
    const dialogs = this.client.iterDialogs({})
    const res: Api.User[] = []

    for await (const dialog of dialogs) {
      const tDialog: Dialog = dialog
      if (tDialog.isUser && tDialog.entity?.className === 'User' && tDialog.entity.bot === false) {
        res.push(tDialog.entity)
      }
    }

    return res
  }

  async getUser (value: string): Promise<Api.User | undefined> {
    try {
      const res = await this.client.getEntity(value)
      if (res.className === 'User' && res.bot === false) {
        return res
      }
    } catch (e) {
      console.log(e)
    }
  }

  async sendMsg (
    to: string,
    message: string,
    formattingEntities: Api.TypeMessageEntity[] = [],
    file?: Buffer
  ): Promise<Api.Message> {
    return await this.client.sendMessage(to, {
      message,
      formattingEntities,
      file
    })
  }

  // That means we want to write message to user by phone number
  // when he is no in our contact list. That would lead an error.
  async isContactImportRequired (to: string): Promise<boolean> {
    if (!to.startsWith('+')) {
      return false
    }

    const res = await this.client.invoke(
      new Api.contacts.GetContacts({
        hash: bigInt(0)
      })
    )

    if (res.className === 'contacts.Contacts') {
      const actualNumber = to.slice(1)
      return !res.users.filter((x): x is Api.User => x.className === 'User').some((x) => x.phone === actualNumber)
    }

    return true
  }

  async addContact (contact: { phone: string, firstName: string, lastName: string }): Promise<void> {
    const result = await this.client.invoke(
      new Api.contacts.ImportContacts({
        contacts: [
          new Api.InputPhoneContact({
            ...contact,
            clientId: bigInt(0)
          })
        ]
      })
    )

    if (result.imported.length < 1) {
      throw Error('Failed to add contact')
    }
  }

  getToken (): string | undefined {
    // TODO: Need recheck
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return (this.client.session.save() as never as string) ?? undefined
  }
}

export type TelegramConnectionInterface = InstanceType<typeof TelegramConnection>

// Notice: not really elegant solution, for now have no better idea
// how to reorganize this mess. This helper works like buffer for connections
// that are not yet signed in and unified telegram connection creator.
export const telegram = new (class TelegramHelper {
  readonly conns = new Map<string, TelegramConnection>()
  readonly ttls = new Map<string, NodeJS.Timeout>()

  async auth (phone: string): Promise<SignInState> {
    // Clear any existing TTL timeout for this phone
    this.clearTTL(phone)

    const conn = await this.getOrCreate(phone)

    // Set new TTL timeout
    this.ttls.set(
      phone,
      setTimeout(() => {
        console.log(`TTL expired for connection ${phone}, cleaning up...`)
        this.forgetConnection(phone)
        void conn.close().catch((e) => {
          console.error(`Error during TTL cleanup for ${phone}:`, e instanceof Error ? e.message : 'Unknown error')
        })
      }, config.TelegramAuthTTL)
    )

    if (conn.signInFlow !== undefined) {
      return conn.signInFlow.state
    }

    try {
      await conn.signIn()
    } catch (err) {
      // On error, clean up everything
      this.forgetConnection(phone)
      await conn.close().catch((e) => {
        console.error(`Error during error cleanup for ${phone}:`, e instanceof Error ? e.message : 'Unknown error')
      })

      throw err
    }

    return 'code'
  }

  clearTTL (phone: string): void {
    const existingTTL = this.ttls.get(phone)
    if (existingTTL !== undefined) {
      clearTimeout(existingTTL)
      this.ttls.delete(phone)
    }
  }

  async authCode (phone: string, code: string): Promise<boolean> {
    const conn = this.conns.get(phone)

    if (conn?.signInFlow === undefined) {
      throw Error('Sign in is not initialized')
    }

    try {
      const needsPassword = await conn.signInFlow.code(code)

      if (!needsPassword) {
        // Authentication completed successfully, reset TTL
        this.clearTTL(phone)
      }

      return needsPassword
    } catch (err) {
      // On authentication error, clean up
      this.forgetConnection(phone)
      await conn.close().catch((e) => {
        console.error(`Error during auth code cleanup for ${phone}:`, e instanceof Error ? e.message : 'Unknown error')
      })
      throw err
    }
  }

  async authPass (phone: string, pass: string): Promise<void> {
    const conn = this.conns.get(phone)

    if (conn?.signInFlow === undefined) {
      throw Error('Sign in is not initialized')
    }

    try {
      await conn.signInFlow.pass(pass)
      // Authentication completed successfully, reset TTL
      this.clearTTL(phone)
    } catch (err) {
      // On authentication error, clean up
      this.forgetConnection(phone)
      await conn.close().catch((e) => {
        console.error(`Error during auth pass cleanup for ${phone}:`, e instanceof Error ? e.message : 'Unknown error')
      })
      throw err
    }
  }

  async getOrCreate (phone: string): Promise<TelegramConnection> {
    const existingConn = this.conns.get(phone)

    if (existingConn !== undefined) {
      return existingConn
    }

    const conn = await this.create(phone)
    this.conns.set(phone, conn)

    return conn
  }

  getConnection (phone: string): TelegramConnection | undefined {
    return this.conns.get(phone)
  }

  forgetConnection (phone: string): void {
    this.conns.delete(phone)
    this.clearTTL(phone)
  }

  async create (phone: string, token?: string): Promise<TelegramConnection> {
    const session = new StringSession(token)
    const client = new TelegramClient(session, config.TelegramApiID, config.TelegramApiHash, {
      connectionRetries: 5,
      autoReconnect: true
    })

    await client.connect()

    return new TelegramConnection(client, phone)
  }
})()
