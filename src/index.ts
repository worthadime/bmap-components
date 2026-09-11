/**
 * bmap-components —— 数据驱动的百度地图（BMapGL）React 组件库
 */

// 初始化
export { initBMapSDK, getBMapSDKOptions } from './init';
export type { IBMapSDKOptions } from './init';

// 脚本加载器（高级用法：自定义图层/路书时直接取用）
export { loadBMapGL, getBMapGL } from './loaders/load-bmapgl';
export { loadMapVGL, getMapVGL } from './loaders/load-mapvgl';
export { loadLuShu, getLuShu } from './loaders/load-lushu';

// 地图容器
export { MapView } from './components/map-view';
export { useMapView } from './components/map-view/use-map-view';
export type { IMapViewProps, IMapViewContext } from './components/map-view/types';
export type { IUseMapViewParams, IUseMapViewResult } from './components/map-view/use-map-view';

// 点位聚合图层
export { usePointLayer } from './components/point-layer/use-point-layer';
export { vehiclePointPreset, shipPointPreset, DEFAULT_CLUSTER_GRADIENT } from './components/point-layer/status-presets';
export type {
  IUsePointLayerParams,
  IPointLayerPreset,
  IBubbleOptions,
  IClusterOptions,
  IClusterGradient,
  ILabelOptions,
} from './components/point-layer/types';

// 轨迹图层
export { useTrackLine } from './components/track-line/use-track-line';
export type {
  IUseTrackLineParams,
  ITrackLineStyle,
  ITrackEndpointsOptions,
} from './components/track-line/types';

// 数据契约
export type {
  ILngLat,
  IMapPoint,
  IPointStatus,
  IPointStatusMap,
  ITrackPoint,
  ITrackEvent,
  ITrackData,
  ITrackSummary,
} from './types/map';

// 工具
export { calcAdaptiveZoom, REFERENCE_SCREEN_WIDTH, ZOOM_MAX, ZOOM_MIN } from './utils/zoom';

export const version = '0.1.0';
