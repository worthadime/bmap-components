/**
 * 地图数据契约 —— 组件库与业务方之间的唯一数据约定
 *
 * 设计原则：组件只消费本文件定义的纯数据结构，不认识任何业务接口响应；
 * 业务方负责把后端数据适配为下列结构（适配器模式），实现"数据驱动"。
 */

/** 经纬度坐标 */
export interface ILngLat {
  lng: number;
  lat: number;
}

/** 地图点位（车辆/船舶/设备等一切可标注实体的统一抽象） */
export interface IMapPoint {
  /** 唯一标识（点击回调与数据比对依赖此字段） */
  id: string;
  longitude: number;
  latitude: number;
  /** 状态标识：映射图标/颜色的 key，由 statusMap 解释（如 driving / stopped / offline） */
  status?: string;
  /** 单点图标 URL / base64（优先级高于 statusMap[status].icon） */
  icon?: string;
  /** 标签文本（点位旁的文字，如名称） */
  label?: string;
  /** 速度 km/h（标签格式化等场景使用） */
  speed?: number;
  /** 业务原始数据挂载点：点击回调原样带回，组件本身不消费 */
  payload?: Record<string, unknown>;
}

/** 单状态的视觉映射 */
export interface IPointStatus {
  /** 状态图标 URL / base64 */
  icon?: string;
  /** 状态色（气泡 / 标签底色） */
  color: string;
  /** 状态文案（可选，供图例 / 信息窗使用） */
  text?: string;
}

/** 状态 → 视觉映射表（key 与 IMapPoint.status 对应） */
export type IPointStatusMap = Record<string, IPointStatus>;

/** 轨迹点 */
export interface ITrackPoint {
  lng: number;
  lat: number;
  /** 定位时间（ISO 字符串或后端约定格式，组件只做展示与排序） */
  time?: string;
  /** 速度 km/h */
  speed?: number;
  /** 航向角（0-360，正北为 0，顺时针） */
  direction?: number;
}

/** 轨迹事件（途经/停留/离线/偏航等特殊点） */
export interface ITrackEvent {
  id: string;
  /** 事件类型：内置渲染 park / offline / yaw，其余类型走默认样式 */
  type: 'park' | 'offline' | 'yaw' | (string & {});
  lng: number;
  lat: number;
  startTime?: string;
  endTime?: string;
  /** 持续时长（秒） */
  duration?: number;
  /** 事件描述（信息窗文案） */
  description?: string;
}

/** 轨迹统计摘要 */
export interface ITrackSummary {
  /** 里程 km */
  mileage?: number;
  /** 时长（秒） */
  duration?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  stopCount?: number;
}

/** 轨迹数据（实际轨迹 + 可选计划轨迹 + 事件 + 摘要） */
export interface ITrackData {
  /** 实际轨迹点（按时间升序） */
  points: ITrackPoint[];
  /** 计划轨迹点（虚线对比展示） */
  planPoints?: ITrackPoint[];
  events?: ITrackEvent[];
  summary?: ITrackSummary;
}
