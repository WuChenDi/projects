// Regenerate with `pnpm cf-typegen` after editing wrangler.jsonc.
declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher
    NEXTJS_ENV: string
    DB_TYPE: string
    LIBSQL_URL: string
    LIBSQL_AUTH_TOKEN: string
    ACCESS_PASSWORD: string
    DB?: D1Database
  }
}

interface CloudflareEnv extends Cloudflare.Env {}

type StringifyValues<EnvType extends Record<string, unknown>> = {
  [Binding in keyof EnvType]: EnvType[Binding] extends string
    ? EnvType[Binding]
    : string
}

declare namespace NodeJS {
  interface ProcessEnv
    extends StringifyValues<
      Pick<
        Cloudflare.Env,
        | 'NEXTJS_ENV'
        | 'DB_TYPE'
        | 'LIBSQL_URL'
        | 'LIBSQL_AUTH_TOKEN'
        | 'ACCESS_PASSWORD'
      >
    > {}
}
