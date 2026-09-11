/**
 * PointInfoWindow —— 点位信息窗组件（React 渲染进 BMapGL InfoWindow）
 *
 * 源业务 useVehicleInfoWindow 以 HTML 字符串渲染信息窗（React 组件化留作优化），
 * 本组件补齐该优化：createPortal 把 React 内容渲染到 InfoWindow 的容器元素。
 *
 * 受控用法：point 为 null 时关闭；用户关闭（按钮/点击地图）经 onClose 通知，
 * 使用方应将 point 置回 null。
 */

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { IMapPoint } from '../../types/map';
import type { IPointInfoWindowProps } from './types';
import { usePointInfoWindow } from './use-point-info-window';

export function PointInfoWindow(props: IPointInfoWindowProps) {
  const { children, ...hookParams } = props;
  const { container } = usePointInfoWindow(hookParams);

  if (!container || !props.point) return null;

  return createPortal(
    typeof children === 'function' ? (children as (point: IMapPoint) => ReactNode)(props.point) : children,
    container,
  );
}
