/**
 * SDK 初始化入口 —— 使用任何组件前必须调用一次 initBMapSDK()
 *
 * AK（百度地图开发者密钥）是强业务属性，必须由使用方注入；
 * 组件库不内置任何密钥，这也是包可公开分发的前提。
 */

export interface IBMapSDKOptions {
  /** 百度地图 JSAPI GL 的 AK（lbsyun.baidu.com 申请，应用类型选"浏览器端"） */
  ak: string;
  /** 全局个性化地图样式（setMapStyleV2 的 styleJson）；MapView 的 styleJson prop 可覆盖 */
  styleJson?: unknown;
  /**
   * vendor 脚本（mapvgl.min.js / LuShu.js）的自托管目录地址（以 / 结尾）。
   * 不传（推荐）：使用包内置脚本文本，运行时经 Blob URL 注入，零静态资源配置；
   * 传入：改为从该地址加载（适合有统一 CDN 或 CSP 严格限制 blob: 的团队）。
   */
  scriptBaseUrl?: string;
}

let sdkOptions: IBMapSDKOptions | null = null;

/** 初始化 SDK（应用启动时调用一次，重复调用以最后一次为准） */
export function initBMapSDK(options: IBMapSDKOptions): void {
  if (!options?.ak) {
    throw new Error('[bmap-components] initBMapSDK: ak 不能为空');
  }
  sdkOptions = options;
}

/** 读取初始化配置（内部使用；未初始化时抛错，指引明确） */
export function getBMapSDKOptions(): IBMapSDKOptions {
  if (!sdkOptions) {
    throw new Error('[bmap-components] 请先调用 initBMapSDK({ ak }) 完成初始化');
  }
  return sdkOptions;
}
