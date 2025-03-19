import { IntlString, Metadata, plugin, Plugin } from '@hcengineering/platform'

/**
 * @public
 */
export const accountId = 'account' as Plugin

/**
 * @public
 */
export const accountPlugin = plugin(accountId, {
  metadata: {
    FrontURL: '' as Metadata<string>,
    MAIL_URL: '' as Metadata<string>,
    ProductName: '' as Metadata<string>,
    Transactors: '' as Metadata<string>,
    OtpTimeToLiveSec: '' as Metadata<number>,
    OtpRetryDelaySec: '' as Metadata<number>,
    WsLivenessDays: '' as Metadata<number>
  },
  string: {
    ConfirmationText: '' as IntlString,
    ConfirmationHTML: '' as IntlString,
    ConfirmationSubject: '' as IntlString,
    RecoveryText: '' as IntlString,
    RecoveryHTML: '' as IntlString,
    RecoverySubject: '' as IntlString,
    InviteText: '' as IntlString,
    InviteHTML: '' as IntlString,
    InviteSubject: '' as IntlString,
    ResendInviteText: '' as IntlString,
    ResendInviteHTML: '' as IntlString,
    ResendInviteSubject: '' as IntlString,
    OtpText: '' as IntlString,
    OtpHTML: '' as IntlString,
    OtpSubject: '' as IntlString
  }
})
