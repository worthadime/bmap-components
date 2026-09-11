import type { ITrackData, ITrackEvent, ITrackPoint } from '../../types/map';

/** 轨迹线样式（实际线 / 计划线通用） */
export interface ITrackLineStyle {
  /** 线颜色（实际线默认 '#ce4848' 红 / 计划线默认 '#1dc67c' 绿） */
  color?: string;
  /** 线宽 px（默认 8） */
  weight?: number;
  /** 方向箭头纹理 URL：实际线默认内置红色箭头瓦片，计划线默认内置绿色箭头瓦片；false 关闭纹理改纯色线 */
  texture?: string | false;
}

/** 起终点标记参数 */
export interface ITrackEndpointsOptions {
  /** 起点圆点颜色（默认 '#00ba69'） */
  startColor?: string;
  /** 终点图标 URL（默认内置终点旗帜） */
  endIcon?: string;
}

export interface IUseTrackLineParams {
  /** 地图实例（MapView ctx.map；为 null 时不渲染） */
  map: BMapGL.Map | null;
  /** 轨迹数据（null 时不渲染） */
  track: ITrackData | null;
  /** 实际轨迹线样式：默认渲染；false 关闭 */
  line?: ITrackLineStyle | false;
  /** 计划轨迹线样式：planPoints 存在时默认渲染；false 关闭 */
  planLine?: ITrackLineStyle | false;
  /** 起终点标记（默认开；实际轨迹少于 2 点时不渲染） */
  endpoints?: ITrackEndpointsOptions | false;
  /** 数据变更后自动调整视野包含全部轨迹点（默认 true） */
  fitView?: boolean;
  /** 点击实际轨迹线：返回点击位置最近的轨迹点 */
  onNodeClick?: (point: ITrackPoint) => void;
  /** 点击事件标记（park / offline / yaw 及自定义类型） */
  onEventClick?: (event: ITrackEvent) => void;
}
