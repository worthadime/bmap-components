/**
 * MapVGL（百度地图大数据可视化库）加载器
 *
 * 自包含策略：脚本文本已打包进组件库（src/vendor/mapvgl.min.txt，约 600KB，
 * 经动态 import 拆为独立 chunk，仅在用到聚合图层时加载），运行时以 Blob URL 注入，
 * 使用方零静态资源配置；也可通过 initBMapSDK({ scriptBaseUrl }) 改为自托管加载。
 */

import { getBMapSDKOptions } from '../init';

let loadPromise: Promise<typeof mapvgl> | null = null;

function getRawWindow(): Window & typeof globalThis {
  return (window.rawWindow as (Window & typeof globalThis) | undefined) ?? window;
}

/** 以原生 <script> 注入脚本地址（微前端沙箱兼容：真实 document + __PURE_ELEMENT__） */
function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = getRawWindow();
    const script = win.document.createElement('script') as HTMLScriptElement & { __PURE_ELEMENT__?: boolean };
    // HACK: micro-app 内部标志，追加时跳过沙箱拦截（micro-app 升级需复核）
    script.__PURE_ELEMENT__ = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`[bmap-components] 脚本加载失败: ${src}`));
    (win.document.head ?? win.document.documentElement).appendChild(script);
  });
}

/** 加载 MapVGL（单例；失败后可重试） */
export function loadMapVGL(): Promise<typeof mapvgl> {
  if (loadPromise) return loadPromise;
  const win = getRawWindow();

  // 宿主已通过 <script> 标签自引入时直接复用
  if (win.mapvgl) {
    loadPromise = Promise.resolve(win.mapvgl);
    return loadPromise;
  }

  const { scriptBaseUrl } = getBMapSDKOptions();

  loadPromise = (async () => {
    if (scriptBaseUrl) {
      await injectScript(`${scriptBaseUrl.replace(/\/?$/, '/')}mapvgl.min.js`);
    } else {
      const { default: scriptText } = await import('../vendor/mapvgl.min.txt');
      const blobUrl = URL.createObjectURL(new Blob([scriptText], { type: 'text/javascript' }));
      try {
        await injectScript(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }
    const ns = getRawWindow().mapvgl;
    if (!ns) {
      throw new Error('[bmap-components] MapVGL 脚本已加载但全局命名空间不可用');
    }
    return ns;
  })().catch((err: unknown) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/** 取 mapvgl 命名空间（未加载时为 undefined） */
export function getMapVGL(): typeof mapvgl | undefined {
  return getRawWindow().mapvgl;
}
