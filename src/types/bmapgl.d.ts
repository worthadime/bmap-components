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
    /** 打开信息窗（同一地图同时只显示一个） */
    openInfoWindow(infoWindow: InfoWindow, point: Point): void;
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
    setIcon(icon: Icon): void;
    setPosition(point: Point): void;
    setRotation(rotation: number): void;
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

  /** 信息窗（content 支持 HTML 字符串或 DOM 元素；同一地图同时只显示一个） */
  class InfoWindow {
    constructor(
      content: string | HTMLElement,
      options?: {
        width?: number;
        height?: number;
        title?: string;
        enableAutoPan?: boolean;
        enableCloseOnClick?: boolean;
        offset?: Size;
      },
    );
    close(): void;
    addEventListener(type: string, handler: (e: unknown) => void): void;
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
  /** 路书（轨迹回放）实例公开 API 面（含轨迹回放消费的内部成员） */
  interface ILuShuInstance {
    start(): void;
    stop(): void;
    pause(): void;
    /** 当前轨迹点索引（可读写：seek 后需手动同步，vendor 内部经 setPosition 精确匹配回填） */
    i: number;
    /** 定位到指定坐标（内部按坐标精确匹配回填索引） */
    setPosition(targetPos: BMapGL.Point): void;
    /** 倍速：speed = originSpeed × times */
    updateSpeed(speedTimes: number): void;
    /** 播放总时长（秒，含 expPointLen 附加时长） */
    calcTotalDuration(expPointLen: number): number;
    /** 方向旋转钩子（可覆写为使用 ITrackPoint.direction） */
    setRotation(prePos: BMapGL.Point, curPos: BMapGL.Point, targetPos: BMapGL.Point, direction: string | null): void;
    /** 从地图移除全部 marker（主 marker + 左右装饰副本） */
    removeMarker(): void;
    /** 主体 marker 与左右装饰副本（rotation 同步需要） */
    _marker?: { setRotation(rotation: number): void };
    _markerL?: { setRotation(rotation: number): void };
    _markerR?: { setRotation(rotation: number): void };
  }

  type TLuShuConstructor = new (
    map: BMapGL.Map,
    path: BMapGL.Point[],
    options?: {
      /** 信息窗内容：字符串，或 (pos, realPos, address) => HTML 字符串；空字符串隐藏信息窗 */
      defaultContent?: string | ((pos: BMapGL.Point, realPos: BMapGL.Point, address: string) => string);
      autoView?: boolean;
      icon?: BMapGL.Icon;
      /** 基础速度 米/秒 */
      speed?: number;
      enableRotation?: boolean;
      landmarkPois?: Array<{ lng: number; lat: number; html: string; pauseTime: number; bShow?: boolean }>;
    },
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
