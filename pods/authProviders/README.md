# Authentication providers

## OpenID Connect

OpenID Connect is enabled when `OPENID_CLIENT_ID`, `OPENID_CLIENT_SECRET`, and
`OPENID_ISSUER` are set. `OPENID_DISPLAY_NAME` optionally changes the provider
name shown on the login page.

The following optional settings control OpenID Connect access and email
linking:

- `OPENID_ALLOWED_GROUPS` is a comma-separated allowlist matched against the
  `groups` claim of the ID token (for example group names or group object IDs,
  depending on what the identity provider emits). Matching is
  case-insensitive and ignores surrounding whitespace. When unset or empty, no
  group restriction is applied. When set, a missing `groups` ID-token claim, or
  a group overage indication (`_claim_names`, `_claim_sources`, or
  `hasgroups`, as emitted by Microsoft Entra ID for users with many groups),
  denies access. Group overage is fail-closed; resolving it through Microsoft
  Graph is not supported by this provider.
- `OPENID_TRUST_EMAIL=true` treats an ID-token email as verified only when the
  token issuer exactly matches `OPENID_ISSUER` and its `tid` matches the tenant
  in an issuer of the form
  `https://login.microsoftonline.com/<tenant-id>/v2.0`. An `email_verified` or
  `xms_edov` claim also verifies the email without this setting. A verified
  `email` from the userinfo endpoint remains a fallback.
  This trusts tenant administrators, because they can set mail and UPN
  attributes. It never applies to B2B guests or accounts from another
  identity provider (`#EXT#` username, a foreign `idp` claim or `acct=1`),
  whose email is controlled by their home directory. `email_verified` and
  `xms_edov` only verify the `email` claim itself, never a
  `preferred_username` fallback.
- A verified email links the login to an existing Huly account with that
  address. Only use identity providers whose `email_verified` claim is
  trustworthy; some providers let users edit their address and still report
  it as verified.
- `OPENID_SIGNUP_FOR_ALLOWED_GROUPS=true` permits OpenID Connect account
  creation for users who pass a non-empty `OPENID_ALLOWED_GROUPS` allowlist,
  even when signup is globally disabled. It does not enable password signup.
- `OPENID_PROMPT` optionally adds the OIDC `prompt` authorization parameter.
  It accepts `select_account`, `login`, `consent`, or `none`; space-separated
  combinations are allowed except that `none` must be used alone. Invalid
  values are ignored and produce a startup warning.

Example:

```sh
OPENID_ISSUER=https://idp.example.com/realms/example
OPENID_ALLOWED_GROUPS=huly-users,huly-admins
OPENID_SIGNUP_FOR_ALLOWED_GROUPS=true
OPENID_PROMPT=select_account
```

A user who is denied by the group allowlist is redirected to the login page,
which shows a localized "not authorized to sign in" message. No account,
person, or social identity is created for a denied user.

### Email linking

- An existing OIDC identity (`sub`) is authoritative. If its verified email
  already belongs to a different person, the login stays on the OIDC person,
  the conflict is logged (`oidc_email_conflict`), and the other person's email
  identity is neither attached nor confirmed.
- The `admin` token claim derived from `ADMIN_EMAILS` is only issued when the
  email identity belongs to the person that is logging in.
- Deleted social identities are ignored when an OIDC login is matched to an
  existing person.

Only the email and group-related ID-token claims required for these decisions
are retained during the callback. Raw tokens, claim objects, and group values
are not logged; group-access denial events log only the subject and candidate
email.
