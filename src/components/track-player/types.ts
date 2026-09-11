import type { ILngLat, ITrackData, ITrackPoint } from '../../types/map';

/** 回放状态：初始 / 播放中 / 暂停 / 已播完 */
export type ITrackPlayerStatus = 'INITIAL' | 'PLAYING' | 'PAUSED' | 'FINISHED';

/** 移动标记配置 */
export interface ITrackMarkerOptions {
  /** 移动图标 URL（默认内置车辆行驶图标） */
  icon?: string;
  /** 图标宽度 px（默认 42） */
  width?: number;
  /** 图标高度 px（默认 42） */
  height?: number;
  /** 图标随方向旋转：默认开，优先取 ITrackPoint.direction，缺失时由 LuShu 自动计算 */
  rotation?: boolean;
}

/** 信息窗渲染上下文 */
export interface ITrackPlayerInfoCtx {
  /** 当前轨迹点（当前动画段起点） */
  point: ITrackPoint;
  /** 当前轨迹点索引 */
  index: number;
  /** 动画实时位置（点间插值坐标） */
  pos: ILngLat;
}

/** 进度状态（轨迹点跳变时触发） */
export interface ITrackProgressState {
  index: number;
  /** 进度百分比 0-100 */
  percent: number;
}

export interface IUseTrackPlayerParams {
  /** 地图实例（MapView ctx.map；为 null 时不创建回放） */
  map: BMapGL.Map | null;
  /** 轨迹数据（points 少于 2 个时不创建回放） */
  track: ITrackData | null;
  /** 基础速度 米/秒（默认 1000；倍速在此基础上相乘） */
  speed?: number;
  /** 移动标记配置（变更时整体重建回放） */
  marker?: ITrackMarkerOptions;
  /** 信息窗 HTML 渲染（默认关闭；返回字符串经 LuShu 以 overlay 展示） */
  infoWindow?: false | ((ctx: ITrackPlayerInfoCtx) => string);
  /** 播放中视野跟随（默认开） */
  autoView?: boolean;
  /** 进度变化（轨迹点跳变触发，高频回调内避免 setState 重渲染链） */
  onProgress?: (state: ITrackProgressState) => void;
  /** 播放状态变化 */
  onStatusChange?: (status: ITrackPlayerStatus) => void;
}

export interface IUseTrackPlayerResult {
  /** 播放状态 */
  status: ITrackPlayerStatus;
  /** 当前轨迹点索引 */
  index: number;
  /** 进度百分比 0-100 */
  progress: number;
  /** 当前轨迹点（未创建回放时为 null） */
  currentPoint: ITrackPoint | null;
  /** 倍速（1 = 基础速度） */
  speed: number;
  /** 总时长（秒，1 倍速下） */
  totalDuration: number;
  /** 播放 / 继续（已播完时自动从头重播） */
  play(): void;
  /** 暂停 */
  pause(): void;
  /** 停止并复位到起点 */
  stop(): void;
  /** 跳转到轨迹点索引（跳转后暂停） */
  seekToIndex(index: number): void;
  /** 跳转到坐标（吸附最近轨迹点，跳转后暂停） */
  seekToCoordinate(coord: ILngLat): void;
  /** 设置倍速（如 1 / 5 / 10 / 20） */
  setSpeed(multiplier: number): void;
}
