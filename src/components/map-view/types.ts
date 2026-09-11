import type { CSSProperties, ReactNode } from 'react';
import type { ILngLat } from '../../types/map';

/** MapView 就绪上下文（render-prop children 与 onReady 回调的参数） */
export interface IMapViewContext {
  map: BMapGL.Map;
  bmapgl: typeof BMapGL;
}

export interface IMapViewProps {
  /** 初始中心点（后续变更经 setCenter 平滑生效） */
  center: ILngLat;
  /** 初始缩放（adaptive 为 true 时作为 1920 基准屏宽下的基准值） */
  zoom: number;
  /** 最小缩放（默认 3） */
  minZoom?: number;
  /** 最大缩放（默认 20） */
  maxZoom?: number;
  /** 初始缩放是否按容器实测宽度自适应（默认 true，不同屏幕下初始可视范围一致） */
  adaptive?: boolean;
  /** 个性化地图样式（setMapStyleV2 styleJson），优先级高于 initBMapSDK 全局样式 */
  styleJson?: unknown;
  /** 滚轮缩放（默认 true） */
  enableScrollWheelZoom?: boolean;
  /** 双击缩放（默认 true） */
  enableDoubleClickZoom?: boolean;
  /** 地图点击事件开关（默认 true） */
  enableMapClick?: boolean;
  className?: string;
  style?: CSSProperties;
  /** 加载中占位（不传则用内置简易占位） */
  loading?: ReactNode;
  /** 加载失败占位（不传则展示内置错误文案） */
  errorFallback?: (error: Error) => ReactNode;
  /** 地图实例就绪回调（图层类副作用从这里开始） */
  onReady?: (ctx: IMapViewContext) => void;
  onError?: (error: Error) => void;
  /** 子内容：地图就绪后才渲染；支持 render-prop 形式拿到地图上下文 */
  children?: ReactNode | ((ctx: IMapViewContext) => ReactNode);
}
