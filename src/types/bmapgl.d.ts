/**
 * BMapGL / MapVGL / BMapGLLib 的最小类型声明
 *
 * 百度官方未提供 npm 类型包，此处只声明组件库实际消费的 API 面；
 * 使用方如需更多 API，可在自己的工程中扩展同名 namespace（TS 声明合并）。
 */

declare namespace BMapGL {
  class Point {
    constructor(lng: number, lat: number);
    lng: number;
    lat: number;
  }

  class Map {
    constructor(container: HTMLElement, options?: Record<string, unknown>);
    /** 设置中心点与缩放级别 */
    centerAndZoom(center: Point, zoom: number): void;
    setCenter(center: Point | string): void;
    setZoom(zoom: number): void;
    getZoom(): number;
    setMinZoom(zoom: number): void;
    setMaxZoom(zoom: number): void;
    /** 个性化地图样式 V2（styleJson 结构见百度开放平台"个性化编辑器"导出） */
    setMapStyleV2(options: { styleJson: unknown; version?: string }): void;
    enableScrollWheelZoom(enable?: boolean): void;
    enableDoubleClickZoom(enable?: boolean): void;
    /** 容器尺寸变化后重算（如弹窗/全屏/画中画切换） */
    resize(): void;
    destroy(): void;
    /** 叠加覆盖物（Marker / Polyline 等） */
    addOverlay(overlay: unknown): void;
    removeOverlay(overlay: unknown): void;
    /** 添加/移除普通图层（LineLayer 等） */
    addNormalLayer(layer: unknown): void;
    removeNormalLayer(layer: unknown): void;
    /** 调整视野以包含给定点位 */
    setViewport(points: Point[]): void;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Icon {
    constructor(src: string, size?: Size);
  }

  /** 地图覆盖物公共事件接口 */
  interface IOverlayEventTarget {
    addEventListener(type: string, handler: (e: unknown) => void): void;
  }

  /** 标注（图标点） */
  class Marker implements IOverlayEventTarget {
    constructor(point: Point, options?: Record<string, unknown>);
    addEventListener(type: string, handler: (e: unknown) => void): void;
  }

  /** 折线（计划轨迹等纯展示线） */
  class Polyline {
    constructor(points: Point[], options?: Record<string, unknown>);
  }

  /** 线图层（实际轨迹；options 完整结构见百度开放平台 LineLayer 文档） */
  class LineLayer {
    constructor(options: Record<string, unknown>);
    setData(data: unknown): void;
    addEventListener(type: string, handler: (e: ILineLayerEvent) => void): void;
  }

  /** LineLayer 点击事件（dataIndex 为 -1 表示未命中数据项） */
  interface ILineLayerEvent {
    latLng?: { lng: number; lat: number };
    value?: { dataIndex?: number; dataItem?: unknown };
  }
}

declare namespace mapvgl {
  class View {
    constructor(options: { map: BMapGL.Map });
    addLayer(layer: unknown): void;
    destroy(): void;
  }

  /** 圆形/气泡层（options 完整结构见 MapVGL 官方文档，此处按 unknown 透传） */
  class CircleLayer {
    constructor(options: Record<string, unknown>);
    setData(data: unknown[]): void;
  }

  /** 文本标签层 */
  class LabelLayer {
    constructor(options: Record<string, unknown>);
    setData(data: unknown[]): void;
  }

  /** 点聚合层 */
  class ClusterLayer {
    constructor(options: Record<string, unknown>);
    setData(data: unknown[]): void;
  }
}

declare namespace BMapGLLib {
  /** 路书（轨迹回放）实例，公开 API 面；第二批 TrackPlayer 组件会细化 */
  interface ILuShuInstance {
    start(): void;
    stop(): void;
    pause(): void;
  }

  type TLuShuConstructor = new (
    map: BMapGL.Map,
    path: BMapGL.Point[],
    options?: Record<string, unknown>,
  ) => ILuShuInstance;

  const LuShu: TLuShuConstructor;
}

interface Window {
  /** micro-app 沙箱暴露的真实 window（沙箱环境存在，普通环境为 undefined） */
  rawWindow?: Window & typeof globalThis;
  /** micro-app 官方注入的环境标志 */
  __MICRO_APP_ENVIRONMENT__?: boolean;
  BMapGL?: typeof BMapGL;
  mapvgl?: typeof mapvgl;
  BMapGLLib?: typeof BMapGLLib;
}
