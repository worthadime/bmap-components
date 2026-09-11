import type { ReactNode } from 'react';
import type { IMapPoint } from '../../types/map';

/** 信息窗视觉参数 */
export interface IPointInfoWindowOptions {
  /** 信息窗宽度 px（默认 320） */
  width?: number;
  /** 信息窗锚点偏移（默认 [0, -24]：配 48px 中心锚定的点位图标，箭头上移至图标顶边） */
  offset?: [number, number];
  /** 打开后自动平移地图保证信息窗完整可见（默认 true） */
  enableAutoPan?: boolean;
  /** 点击地图任意位置时关闭（默认 true） */
  enableCloseOnClick?: boolean;
}

export interface IUsePointInfoWindowParams extends IPointInfoWindowOptions {
  /** 地图实例（MapView ctx.map；为 null 时不打开） */
  map: BMapGL.Map | null;
  /** 当前点位（受控：null = 关闭） */
  point: IMapPoint | null;
  /** 信息窗关闭回调（用户点关闭按钮 / 点击地图；应在此将 point 置为 null） */
  onClose?: () => void;
}

export interface IUsePointInfoWindowResult {
  /** 信息窗内容容器元素（打开时非 null，作为 createPortal 目标；关闭后置 null） */
  container: HTMLDivElement | null;
}

export interface IPointInfoWindowProps extends IUsePointInfoWindowParams {
  /** 信息窗内容（render-prop 形式拿到当前点位；不传则渲染空信息窗） */
  children?: ReactNode | ((point: IMapPoint) => ReactNode);
}
