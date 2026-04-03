import { Hono } from 'hono'
import type { AppEnv, SDKConfig } from '@/types'

function parseConfig(url: URL, query: Record<string, string>): SDKConfig {
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws'

  return {
    serverUrl: query.serverUrl || `${protocol}://${url.host}/`,
    siteId: query.siteId || 'default-site',
    displayElementId: query.displayElementId || 'liveuser',
    totalCountElementId:
      query.totalCountElementId || 'liveuser_totalvisits',
    reconnectDelay: query.reconnectDelay
      ? Number.parseInt(query.reconnectDelay)
      : 3000,
    debug: query.debug === 'true',
    enableTotalCount: query.enableTotalCount === 'true',
  }
}

const SDK_SCRIPT = `(function(cfg){
  var ws,timer,hbTimer,el,totalEl;
  var cid='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
    var r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);
  });

  function fmt(n){
    if(n>=1e6)return(n/1e6).toFixed(1)+'M';
    if(n>=1e3)return(n/1e3).toFixed(1)+'K';
    return n.toString();
  }

  function log(m){cfg.debug&&console.log('%c LiveUser %c '+m,'padding:2px 1px;border-radius:3px;color:#fff;background:#5584ff;font-weight:bold;','');}

  function send(data){ws&&ws.readyState===1&&ws.send(JSON.stringify(data));}

  function update(count,total){
    if(el){el.textContent=fmt(count);el.setAttribute('data-live-count',count);}
    if(cfg.enableTotalCount&&totalEl&&total!==undefined){
      totalEl.textContent=fmt(total);totalEl.setAttribute('data-total-count',total);
    }
  }

  function connect(){
    if(ws&&ws.readyState===1)return;
    log('Connecting...');
    if(el)el.textContent='Connecting...';
    if(cfg.enableTotalCount&&totalEl)totalEl.textContent='Loading...';

    var u=cfg.serverUrl.replace(/^http/,'ws')+'ws?siteId='+encodeURIComponent(cfg.siteId)
      +'&clientId='+encodeURIComponent(cid);
    if(cfg.enableTotalCount)u+='&enableTotalCount=true';

    ws=new WebSocket(u);
    ws.onopen=function(){
      log('Connected');
      send({type:'join',siteId:cfg.siteId,clientId:cid});
      hbTimer=setInterval(function(){send({type:'heartbeat',clientId:cid});},30000);
    };
    ws.onmessage=function(e){
      try{
        var m=JSON.parse(e.data);
        if(m.type==='update')update(m.count,m.totalCount);
        else if(m.type==='heartbeat'&&m.totalCount!==undefined&&cfg.enableTotalCount&&totalEl){
          totalEl.textContent=fmt(m.totalCount);
        }
      }catch(err){log('Parse error: '+err);}
    };
    ws.onclose=function(){
      log('Disconnected');
      if(el)el.textContent='Reconnecting...';
      clearInterval(hbTimer);
      clearTimeout(timer);
      timer=setTimeout(connect,cfg.reconnectDelay);
    };
    ws.onerror=function(){log('Error');};
  }

  function init(){
    el=document.getElementById(cfg.displayElementId);
    if(!el){log('Element not found: '+cfg.displayElementId);return;}
    if(cfg.enableTotalCount)totalEl=document.getElementById(cfg.totalCountElementId);
    log('Init siteId='+cfg.siteId+' clientId='+cid);
    connect();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  window.addEventListener('beforeunload',function(){
    ws&&ws.close();clearTimeout(timer);clearInterval(hbTimer);
  });
})`

export const sdkRoutes = new Hono<{ Bindings: AppEnv }>()

sdkRoutes.get('/liveuser.js', (c) => {
  const config = parseConfig(new URL(c.req.url), c.req.query())
  const js = `${SDK_SCRIPT}(${JSON.stringify(config)});`

  return c.text(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  })
})
