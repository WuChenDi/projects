import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隐私政策',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-12 sm:px-5 sm:py-16 md:px-6">
      <article className="mx-auto w-full max-w-3xl">
        <header className="mb-10">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← 返回登录
          </Link>
          <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
            隐私政策
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            最后更新：2026 年 6 月 29 日
          </p>
        </header>

        <div className="flex flex-col gap-8 text-[0.9375rem] leading-relaxed text-foreground/90 sm:text-base">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              概述
            </h2>
            <p>
              wepush
              是一个微信公众号模板消息定时推送控制台。我们只收集运行该服务所必需的数据。本政策说明我们收集哪些数据、如何使用，以及你享有的权利。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              账号数据
            </h2>
            <p>
              当你通过 Google 或 GitHub OAuth 登录时，我们会接收并存储你的
              <strong>昵称</strong>、<strong>邮箱地址</strong>与
              <strong>头像 URL</strong>
              。这些信息仅用于标识你的账号、控制控制台访问权限，并作为数据隔离的依据（你的数据只归属于你的账号，其他账号不可见）。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              会话数据
            </h2>
            <p>
              为维持登录会话及基本安全，我们会在你登录时记录
              <strong>IP 地址</strong>与<strong>浏览器 User-Agent</strong>
              。该数据仅与你的会话关联，不用于追踪或画像。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              你录入的业务数据
            </h2>
            <p>
              为提供推送服务，我们会存储你在控制台中录入的内容：微信测试号的
              <strong>AppID / AppSecret</strong>、接收人信息（微信
              OpenID、城市、纪念日等）、消息模板，以及每次推送的日志。所有业务数据均按账号隔离。AppSecret
              等敏感项在接口返回时会自动脱敏。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              第三方服务
            </h2>
            <p>
              推送时，我们会按接收人的配置向公共数据源发起请求以生成消息内容，包括天气、一言、每日英语等服务；并通过
              <strong>微信公众平台 API</strong> 获取 access_token、向接收人的
              OpenID
              发送模板消息。这些请求受相应服务方各自的条款与隐私政策约束。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              数据存储
            </h2>
            <p>
              应用数据（账号、会话、配置、接收人、模板、日志）存储在
              <strong>Cloudflare D1</strong> 或 <strong>Turso</strong> 的 SQLite
              数据库中。除本政策所述外，数据不会被复制到其他第三方服务。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              数据共享
            </h2>
            <p>
              我们不会出售、交易或以其他方式向第三方转让你的个人信息。数据仅与上述基础设施提供方（Cloudflare、Turso）以及为完成推送所必需的微信公众平台与数据源服务交互。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              你的权利
            </h2>
            <p>
              你可以随时请求删除你的账号及关联数据。由于登录通过 OAuth
              完成，你也可以在 Google 或 GitHub 的账号设置中撤销对本应用的授权。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              政策变更
            </h2>
            <p>
              我们可能会不时更新本隐私政策，变更将更新本页面的日期并在此页公布。
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
