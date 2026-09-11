/**
 * LuShu（百度地图路书，轨迹回放库）加载器
 *
 * 加载策略与 load-mapvgl 一致：默认使用包内置脚本文本（Blob URL 注入），
 * initBMapSDK({ scriptBaseUrl }) 可改为自托管加载。
 * 注意：LuShu 依赖 BMapGL，本加载器内部保证 BMapGL 先就绪。
 */

import { getBMapSDKOptions } from '../init';
import { loadBMapGL } from './load-bmapgl';

let loadPromise: Promise<BMapGLLib.TLuShuConstructor> | null = null;

function getRawWindow(): Window & typeof globalThis {
  return (window.rawWindow as (Window & typeof globalThis) | undefined) ?? window;
}

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

/** 加载 LuShu 路书库（单例；失败后可重试）；resolve LuShu 构造函数 */
export function loadLuShu(): Promise<BMapGLLib.TLuShuConstructor> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // LuShu 挂载在 BMapGLLib 下且执行时读取 BMapGL，必须先就绪
    await loadBMapGL();

    const win = getRawWindow();
    if (win.BMapGLLib?.LuShu) {
      return win.BMapGLLib.LuShu;
    }

    const { scriptBaseUrl } = getBMapSDKOptions();
    if (scriptBaseUrl) {
      await injectScript(`${scriptBaseUrl.replace(/\/?$/, '/')}LuShu.js`);
    } else {
      const { default: scriptText } = await import('../vendor/lushu.txt');
      const blobUrl = URL.createObjectURL(new Blob([scriptText], { type: 'text/javascript' }));
      try {
        await injectScript(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }

    const luShu = getRawWindow().BMapGLLib?.LuShu;
    if (!luShu) {
      throw new Error('[bmap-components] LuShu 脚本已加载但 BMapGLLib.LuShu 不可用');
    }
    return luShu;
  })().catch((err: unknown) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/** 取 LuShu 构造函数（未加载时为 undefined） */
export function getLuShu(): BMapGLLib.TLuShuConstructor | undefined {
  return getRawWindow().BMapGLLib?.LuShu;
}
