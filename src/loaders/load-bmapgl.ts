/**
 * 百度地图 GL（BMapGL）脚本加载器
 *
 * 时序契约：URL 必须带 callback 参数。无 callback 时百度加载器桩依赖 document.write
 * 同步加载子模块，动态插入的脚本中 document.write 不生效，BMapGL 永远不会就绪。
 *
 * 微前端沙箱（micro-app / qiankun 等）兼容：子应用中的外链脚本可能被沙箱拦截
 * 改走 fetch，而百度接口无 CORS 响应头必然失败；故优先经 window.rawWindow 在
 * 真实 document 上原生追加脚本，并打 __PURE_ELEMENT__ 标记跳过沙箱拦截。
 * 普通环境无 rawWindow，回退 window，行为与常规动态加载一致。
 */

import { getBMapSDKOptions } from '../init';

/** 百度 API 完整就绪后调用的全局回调名（callback 参数契约） */
const BAIDU_MAP_CALLBACK_NAME = '__bmapglInitCallback';

/** callback 未触发时的兜底轮询：间隔与超时 */
const POLL_INTERVAL = 200;
const POLL_TIMEOUT = 15000;

type TBMapGLCallbackWindow = Window & { [BAIDU_MAP_CALLBACK_NAME]?: () => void };

let loadPromise: Promise<typeof BMapGL> | null = null;

/** 取脚本挂载目标 window：真实 window 优先（微前端沙箱场景），普通 window 兜底 */
function getRawWindow(): Window & typeof globalThis {
  return (window.rawWindow as Window & typeof globalThis | undefined) ?? window;
}

/** 加载百度地图 GL 脚本（单例；失败后可重试） */
export function loadBMapGL(): Promise<typeof BMapGL> {
  if (loadPromise) return loadPromise;
  const win = getRawWindow();

  // 宿主已引入（如微前端主应用预载）或重复导航场景下无需重复加载
  if (win.BMapGL) {
    loadPromise = Promise.resolve(win.BMapGL);
    return loadPromise;
  }

  const { ak } = getBMapSDKOptions();

  loadPromise = new Promise<typeof BMapGL>((resolve, reject) => {
    const callbackWin = win as TBMapGLCallbackWindow;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      delete callbackWin[BAIDU_MAP_CALLBACK_NAME];
      resolve(getBMapGL() as typeof BMapGL);
    };

    // 回调须注册在真实 window：桩脚本在真实 window 上下文执行，按全局标识符查找
    callbackWin[BAIDU_MAP_CALLBACK_NAME] = settle;

    // 脚本必须在真实 document 上原生加载：沙箱代理 document 创建的元素会被拦截走 fetch
    const script = win.document.createElement('script') as HTMLScriptElement & { __PURE_ELEMENT__?: boolean };
    // HACK: micro-app 内部标志，追加时跳过沙箱拦截（micro-app 升级需复核）
    script.__PURE_ELEMENT__ = true;
    script.src = `//api.map.baidu.com/api?type=webgl&v=1.0&ak=${encodeURIComponent(ak)}&callback=${BAIDU_MAP_CALLBACK_NAME}`;
    script.onload = () => {
      // 兜底：部分版本 callback 不触发时，轮询等待 BMapGL.Map 可用
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += POLL_INTERVAL;
        if (settled) {
          clearInterval(timer);
          return;
        }
        if (getBMapGL()?.Map) {
          clearInterval(timer);
          settle();
          return;
        }
        if (elapsed >= POLL_TIMEOUT) {
          clearInterval(timer);
          delete callbackWin[BAIDU_MAP_CALLBACK_NAME];
          loadPromise = null;
          reject(new Error('[bmap-components] 百度地图脚本加载超时'));
        }
      }, POLL_INTERVAL);
    };
    script.onerror = () => {
      if (settled) return;
      delete callbackWin[BAIDU_MAP_CALLBACK_NAME];
      loadPromise = null;
      reject(new Error('[bmap-components] 百度地图脚本加载失败'));
    };
    (win.document.head ?? win.document.documentElement).appendChild(script);
  });
  return loadPromise;
}

/** 取 BMapGL 命名空间：真实 window 优先（微前端场景），普通 window 兜底 */
export function getBMapGL(): typeof BMapGL | undefined {
  return getRawWindow().BMapGL;
}

/** 百度生态库动态创建脚本的域名（统计/监控/路况/JSONP，无 CORS 头，必须原生 script 加载） */
const BAIDU_SCRIPT_HOST_RE = /baidu\.com/;

function markPureIfBaiduScript(node: Node | string): void {
  if (typeof node === 'string' || !(node instanceof HTMLElement) || node.tagName !== 'SCRIPT') return;
  if (BAIDU_SCRIPT_HOST_RE.test((node as HTMLScriptElement).src)) {
    // HACK: micro-app 内部标志，追加时跳过沙箱拦截（与主加载器同一机制，micro-app 升级需复核）
    (node as HTMLScriptElement & { __PURE_ELEMENT__?: boolean }).__PURE_ELEMENT__ = true;
  }
}

/**
 * 放行百度生态库动态创建的脚本（仅 micro-app 环境启用）
 *
 * BMapGL 引擎 / mapvgl 在沙箱上下文动态创建的 script 会被 micro-app 拦截走 fetch，
 * 而百度统计/监控/路况/JSONP 接口无 CORS 头必然失败；且这些库加载完成后会自移除
 * script 元素（parentNode.removeChild），被抽取替换的原元素 parentNode 为 null，
 * 会抛 "Cannot read properties of null (reading 'removeChild')"。
 * 命中百度域名的 script 补 __PURE_ELEMENT__ 后，沙箱跳过拦截走原生加载。
 */
function patchBaiduScriptBypass(): void {
  const rawAppendChild = Node.prototype.appendChild;
  const rawInsertBefore = Node.prototype.insertBefore;
  const rawAppend = Element.prototype.append;

  (Node.prototype as { appendChild: typeof rawAppendChild }).appendChild = function (
    this: Node,
    child: Node,
  ): Node {
    markPureIfBaiduScript(child);
    return rawAppendChild.call(this, child);
  } as unknown as typeof rawAppendChild;

  (Node.prototype as { insertBefore: typeof rawInsertBefore }).insertBefore = function (
    this: Node,
    child: Node,
    refChild: Node | null,
  ): Node {
    markPureIfBaiduScript(child);
    return rawInsertBefore.call(this, child, refChild);
  } as unknown as typeof rawInsertBefore;

  (Element.prototype as { append: typeof rawAppend }).append = function (
    this: Element,
    ...nodes: (Node | string)[]
  ): void {
    for (const node of nodes) markPureIfBaiduScript(node);
    return rawAppend.apply(this, nodes);
  } as unknown as typeof rawAppend;
}

// 仅 micro-app 环境启用（__MICRO_APP_ENVIRONMENT__ 为 micro-app 官方注入的环境标志）
if (typeof window !== 'undefined' && window.__MICRO_APP_ENVIRONMENT__) {
  patchBaiduScriptBypass();
}
