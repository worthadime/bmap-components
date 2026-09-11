import type { IMapPoint, IPointStatusMap } from '../../types/map';

/** 气泡扩散层参数（MapVGL CircleLayer bubble 模式） */
export interface IBubbleOptions {
  /** 气泡外圈尺寸系数（默认 2.5） */
  sizeScale?: number;
  /** 气泡半径系数（默认 2） */
  radiusScale?: number;
  /** 扩散动画周期（秒，默认 1.5） */
  duration?: number;
  /** 拖尾时长（默认 1） */
  trail?: number;
  /** 扩散份数（默认 6） */
  trial?: number;
}

/** 聚合层参数（MapVGL ClusterLayer） */
export interface IClusterOptions {
  /** 聚合半径 px（默认 175；大屏/全屏场景可调小缓解"点变少"的观感） */
  clusterRadius?: number;
  /** 聚合点最小尺寸（默认 36） */
  minSize?: number;
  /** 聚合点最大尺寸（默认 68） */
  maxSize?: number;
  minZoom?: number;
  maxZoom?: number;
  /** 形成聚合的最少点数（默认 2） */
  minPoints?: number;
  /** 聚合点渐变色（默认蓝色科技感渐变：浅蓝 → 亮蓝 → 深蓝） */
  gradient?: IClusterGradient;
  /** 聚合点（Feature）气泡透明度 0-1（默认 0.25） */
  featureAlpha?: number;
}

/** 聚合点渐变：key 为密度比例 0 / 0.5 / 1 */
export interface IClusterGradient {
  0: string;
  0.5: string;
  1: string;
}

/** 标签层参数（MapVGL LabelLayer） */
export interface ILabelOptions {
  /** 标签文本格式化（默认取预设的 labelFormatter，否则取 IMapPoint.label） */
  formatter?: (point: IMapPoint) => string;
  /** 标签相对点位的偏移（默认 [0, -30]） */
  offset?: [number, number];
  fontSize?: number;
  textColor?: string;
}

/** 点位层视觉预设（内置车辆/船舶两套，业务方可自定义） */
export interface IPointLayerPreset {
  /** 状态 → 图标/颜色映射 */
  statusMap: IPointStatusMap;
  /** 未知状态兜底图标 */
  defaultIcon: string;
  /** 未知状态兜底色 */
  defaultColor: string;
  /** 气泡层参数（可选，缺省用通用默认值） */
  bubble?: IBubbleOptions;
  /** 预设标签格式化（label 未显式配置时生效；label: false 可整体关闭标签） */
  labelFormatter?: (point: IMapPoint) => string;
}

export interface IUsePointLayerParams {
  /** 地图实例（MapView ctx.map；为 null 时不渲染） */
  map: BMapGL.Map | null;
  /** 点位数据（变更时整体重建图层，与 MapVGL ClusterLayer 的更新语义一致） */
  points: IMapPoint[];
  /** 视觉预设（默认 vehiclePointPreset） */
  preset?: IPointLayerPreset;
  /** 状态映射表（传入则覆盖 preset.statusMap） */
  statusMap?: IPointStatusMap;
  cluster?: IClusterOptions;
  /** 标签配置：不传用 preset.labelFormatter；false 关闭标签层；对象自定义 */
  label?: false | ILabelOptions;
  /** 点击单点回调（点击聚合点不触发，交给地图默认放大行为） */
  onPointClick?: (point: IMapPoint) => void;
}
