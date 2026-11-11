# Auth provider session cookies

`@hcengineering/auth-providers` uses `koa-session` to retain OIDC state,
nonce, and PKCE information while an authentication request is redirected to
an identity provider and back.

By default it keeps koa-session's existing host-scoped `koa.sess` cookie and
its existing `Secure` and `SameSite` defaults.

## Cross-subdomain OIDC

Set `SESSION_COOKIE_DOMAIN` only when the authentication request begins on one
subdomain and the callback returns to another:

```sh
SESSION_COOKIE_DOMAIN=.example.com
```

For example, this is correct when a flow starts at `dev.example.com` and the
identity provider redirects to `app.example.com`. It is not a URL: do not use
`https://example.com`, a port, or a path. It must be a parent domain of every
participating host; `.app.example.com` does not cover `dev.example.com`.

The service validates only the domain syntax. Do not use a public suffix such
as `co.uk`; browsers reject public suffixes and domains unrelated to the
request host. A valid domain-scoped configuration uses `huly.sess` instead of
the default `koa.sess`, preventing collisions with another koa-session
application on a sibling subdomain. Deployments without this setting retain
the existing `koa.sess` name.

Enabling `SESSION_COOKIE_DOMAIN` is a one-time cookie-name transition: the
session middleware reads `huly.sess` and does not migrate or read an existing
`koa.sess` session. Users must sign in again after the change. An OIDC flow
started before the deployment loses its stored state, nonce, and PKCE values;
restart that login flow. Schedule the change with that short-lived interruption
in mind.

`SESSION_COOKIE_DOMAIN` changes only the cookie scope. In particular, it does
not assert anything about TLS and does not add `Secure` or `SameSite`.

## Secure cookies behind TLS termination

Set `SESSION_COOKIE_SECURE=true` when the browser reaches the service through
HTTPS but TLS terminates at a proxy in front of this plain-HTTP process:

```sh
SESSION_COOKIE_DOMAIN=.example.com
SESSION_COOKIE_SECURE=true
```

The accepted boolean values are `true`/`false`, `1`/`0`, and `yes`/`no`.
When unset, the existing koa-session Secure behaviour is preserved. `true`
marks only this session cookie Secure; it neither trusts forwarded headers nor
changes the Secure default of other cookies written by the service. Use
`false` only when an explicitly non-Secure session cookie is required for a
plain-HTTP development deployment.

Neither setting changes `SameSite`. This preserves compatibility with identity
providers that return using `response_mode=form_post`, for which a forced
`SameSite=Lax` cookie would not be sent on the cross-site POST.
