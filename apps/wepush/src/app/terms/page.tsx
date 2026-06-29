import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '服务条款',
}

export default function TermsOfServicePage() {
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
            服务条款
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            最后更新：2026 年 6 月 29 日
          </p>
        </header>

        <div className="flex flex-col gap-8 text-[0.9375rem] leading-relaxed text-foreground/90 sm:text-base">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              关于 wepush
            </h2>
            <p>
              wepush 是一个微信公众号模板消息定时推送控制台。本条款约束你对
              wepush
              控制台及其相关功能（账号、接收人与模板管理、定时推送、日志）的使用。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              用户账号
            </h2>
            <p>
              你可以通过 Google 或 GitHub OAuth
              登录创建账号，并应自行妥善保管你的 OAuth
              凭据。对于违反本条款或被用于滥用目的的账号，我们保留暂停或终止的权利。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              合理使用
            </h2>
            <p>
              你同意不将 wepush
              用于发送违法、骚扰、欺诈或垃圾信息，并应确保已获得接收人的同意。你需遵守
              <strong>微信公众平台</strong>
              的相关规则与各数据源服务方的条款。对于我们认为存在滥用的账号或推送行为，我们保留停用的权利。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              第三方服务
            </h2>
            <p>
              wepush 依赖微信公众平台 API
              及天气、一言、每日英语等公共数据源来生成并投递消息。这些服务的可用性、准确性与稳定性由其各自提供方负责，不在我们的保证范围内。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              免责声明
            </h2>
            <p>
              wepush 按<strong>“现状”</strong>与<strong>“现有”</strong>
              提供，不附带任何明示或默示的担保。我们不保证服务无错误、不中断或不存在缺陷。你需自行承担使用本服务的风险。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              责任限制
            </h2>
            <p>
              在法律允许的最大范围内，对于因使用本服务而产生的任何间接、偶然、特殊、后果性或惩罚性损害，wepush
              及其维护者概不负责。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              条款变更
            </h2>
            <p>
              我们保留随时修改本条款的权利。变更将更新本页面的日期并在此页公布。变更公布后继续使用本服务，即视为接受修订后的条款。
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
