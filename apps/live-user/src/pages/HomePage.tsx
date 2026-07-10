import type { FC } from 'hono/jsx'
import { Layout } from './Layout'

interface HomePageProps {
  url: string
}

export const HomePage: FC<HomePageProps> = ({ url }) => {
  return (
    <Layout>
      <div class="container">
        <div class="header">
          <h1>LiveUser</h1>
          <p>
            Real-time online user counter. Drop a script tag, see who's here.
          </p>
        </div>

        <main>
          <div class="stats">
            <div class="stat">
              <span class="stat-label">Online now</span>
              <span class="stat-value" id="liveuser">
                --
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Total visits</span>
              <span class="stat-value" id="liveuser_totalvisits">
                --
              </span>
            </div>
          </div>

          <section>
            <h2>Quick start</h2>
            <p>Add this to your HTML:</p>
            <pre>
              {`<div id="liveuser">0</div>\n<script src="${url}/liveuser.js"></script>`}
            </pre>
          </section>

          <section>
            <h2>With options</h2>
            <pre>
              {`<script src="${url}/liveuser.js?siteId=my-site&enableTotalCount=true"></script>`}
            </pre>
          </section>

          <section>
            <h2>Parameters</h2>
            <div class="params">
              <div class="param">
                <span class="param-name">siteId</span>
                <span class="param-desc">Site identifier</span>
                <span class="param-default">default-site</span>
              </div>
              <div class="param">
                <span class="param-name">displayElementId</span>
                <span class="param-desc">Element ID for online count</span>
                <span class="param-default">liveuser</span>
              </div>
              <div class="param">
                <span class="param-name">totalCountElementId</span>
                <span class="param-desc">Element ID for total visits</span>
                <span class="param-default">liveuser_totalvisits</span>
              </div>
              <div class="param">
                <span class="param-name">enableTotalCount</span>
                <span class="param-desc">Track total visit count</span>
                <span class="param-default">false</span>
              </div>
              <div class="param">
                <span class="param-name">reconnectDelay</span>
                <span class="param-desc">Reconnect delay (ms)</span>
                <span class="param-default">3000</span>
              </div>
              <div class="param">
                <span class="param-name">debug</span>
                <span class="param-desc">Enable console logging</span>
                <span class="param-default">false</span>
              </div>
              <div class="param">
                <span class="param-name">serverUrl</span>
                <span class="param-desc">WebSocket server URL</span>
                <span class="param-default">auto-detected</span>
              </div>
            </div>
          </section>
        </main>
      </div>

      <script src="/liveuser.js?siteId=official-website&enableTotalCount=true" />
    </Layout>
  )
}
