/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  type Account,
  type AccountDB,
  // changeEmail,
  getAccount,
  // listWorkspacesPure,
  type Workspace
} from '@hcengineering/account'
import core, { type MeasureContext, TxOperations } from '@hcengineering/core'
import contact from '@hcengineering/model-contact'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'

// export async function renameAccount (
//   ctx: MeasureContext,
//   db: AccountDB,
//   accountsUrl: string,
//   oldEmail: string,
//   newEmail: string
// ): Promise<void> {
//   const account = await getAccount(db, oldEmail)
//   if (account == null) {
//     throw new Error("Account does'n exists")
//   }

//   const newAccount = await getAccount(db, newEmail)
//   if (newAccount != null) {
//     throw new Error('New Account email already exists:' + newAccount?.email + ' ' + newAccount?._id?.toString())
//   }

//   await changeEmail(ctx, db, account, newEmail)

//   await fixWorkspaceEmails(account, db, accountsUrl, oldEmail, newEmail)
// }

// export async function fixAccountEmails (
//   ctx: MeasureContext,
//   db: AccountDB,
//   transactorUrl: string,
//   oldEmail: string,
//   newEmail: string
// ): Promise<void> {
//   const account = await getAccount(db, newEmail)
//   if (account == null) {
//     throw new Error("Account does'n exists")
//   }

//   await fixWorkspaceEmails(account, db, transactorUrl, oldEmail, newEmail)
// }
// async function fixWorkspaceEmails (
//   account: Account,
//   db: AccountDB,
//   accountsUrl: string,
//   oldEmail: string,
//   newEmail: string
// ): Promise<void> {
//   const accountWorkspaces = account.workspaces.map((it) => it.toString())
//   // We need to update all workspaces
//   const workspaces = await listWorkspacesPure(db)
//   for (const ws of workspaces) {
//     if (!accountWorkspaces.includes(ws._id.toString())) {
//       continue
//     }
//     console.log('checking workspace', ws.workspaceName, ws.workspace)

//     const wsid = getWorkspaceId(ws.workspace)
//     const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid))

//     // Let's connect and update account information.
//     await fixEmailInWorkspace(endpoint, ws, oldEmail, newEmail)
//   }
// }

// async function fixEmailInWorkspace (
//   transactorUrl: string,
//   ws: Workspace,
//   oldEmail: string,
//   newEmail: string
// ): Promise<void> {
//   const connection = await connect(transactorUrl, { name: ws.workspace }, undefined, {
//     mode: 'backup',
//     model: 'upgrade', // Required for force all clients reload after operation will be complete.
//     admin: 'true'
//   })
//   try {
//     const personAccount = await connection.findOne(contact.class.PersonAccount, { email: oldEmail })

//     if (personAccount !== undefined) {
//       console.log('update account in ', ws.workspace)
//       const ops = new TxOperations(connection, core.account.ConfigUser)
//       await ops.update(personAccount, { email: newEmail })
//     }
//   } catch (err: any) {
//     console.error(err)
//   } finally {
//     await connection.close()
//   }
// }

// interface GithubUserResult {
//   login: string | null
//   code: number
//   rateLimitReset?: number | null
// }

// async function getGithubUser (githubId: string, ghToken?: string): Promise<GithubUserResult> {
//   const options =
//     ghToken !== undefined
//       ? {
//           headers: {
//             Authorization: `Bearer ${ghToken}`,
//             Accept: 'application/vnd.github.v3+json'
//           }
//         }
//       : undefined
//   const res = await fetch(`https://api.github.com/user/${githubId}`, options)

//   if (res.status === 200) {
//     return {
//       login: (await res.json()).login,
//       code: 200
//     }
//   }

//   if (res.status === 403) {
//     const rateLimitReset = res.headers.get('X-RateLimit-Reset')
//     return {
//       login: null,
//       code: res.status,
//       rateLimitReset: rateLimitReset != null ? parseInt(rateLimitReset) * 1000 : null
//     }
//   }

//   return {
//     login: null,
//     code: res.status
//   }
// }

// export async function fillGithubUsers (ctx: MeasureContext, db: AccountDB, ghToken?: string): Promise<void> {
//   const githubAccounts = await db.account.find({ githubId: { $ne: null } })
//   if (githubAccounts.length === 0) {
//     ctx.info('no github accounts found')
//     return
//   }

//   const accountsToProcess = githubAccounts.filter(({ githubId, githubUser }) => githubUser == null && githubId != null)
//   if (accountsToProcess.length === 0) {
//     ctx.info('no github accounts left to fill')
//     return
//   }

//   ctx.info('processing github accounts', { total: accountsToProcess.length })
//   const defaultRetryTimeout = 1000 * 60 * 5 // 5 minutes
//   let processed = 0
//   for (const account of accountsToProcess) {
//     while (true) {
//       try {
//         if (account.githubId == null) break
//         let username: string | undefined
//         if (account.email.startsWith('github:')) {
//           username = account.email.slice(7)
//         } else {
//           const githubUserRes = await getGithubUser(account.githubId, ghToken)
//           if (githubUserRes.code === 200 && githubUserRes.login != null) {
//             username = githubUserRes.login
//           } else if (githubUserRes.code === 404) {
//             ctx.info('github user not found', { githubId: account.githubId })
//             break
//           } else if (githubUserRes.code === 403) {
//             const timeout =
//               githubUserRes.rateLimitReset != null
//                 ? githubUserRes.rateLimitReset - Date.now() + 1000
//                 : defaultRetryTimeout
//             ctx.info('rate limit exceeded. Retrying in ', {
//               githubId: account.githubId,
//               retryTimeoutMin: Math.ceil(timeout / (1000 * 60))
//             })
//             await new Promise((resolve) => setTimeout(resolve, timeout))
//           } else {
//             ctx.error('failed to get github user', { githubId: account.githubId, ...githubUserRes })
//             break
//           }
//         }
//         if (username != null) {
//           await db.account.updateOne({ _id: account._id }, { githubUser: username.toLowerCase() })
//           ctx.info('github user added', { githubId: account.githubId, githubUser: username.toLowerCase() })
//           break
//         }
//       } catch (err: any) {
//         ctx.error('failed to fill github user', { githubId: account.githubId, err })
//         break
//       }
//     }
//     processed++
//     if (processed % 100 === 0) {
//       ctx.info('processing accounts:', { processed, of: accountsToProcess.length })
//     }
//   }
//   ctx.info('finished processing accounts:', { processed, of: accountsToProcess.length })
// }
