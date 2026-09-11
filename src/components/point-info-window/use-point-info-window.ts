/**
 * usePointInfoWindow —— 点位信息窗 Hook（BMapGL InfoWindow + 外部容器）
 *
 * 无 UI 设计：Hook 只管理 InfoWindow 实例生命周期，返回内容容器元素，
 * 由使用方经 createPortal 把 React 内容渲染进去（组件形态见 PointInfoWindow）。
 * 行为语义对齐源业务 useVehicleInfoWindow：
 * - 紧邻上次关闭时 BMapGL 有渲染异常，打开延时 50ms
 * - offset 默认 [0, -24]：配 48px 中心锚定点位图标，箭头上移至图标顶边
 * - 同 id 且同坐标的点位数据刷新不重开信息窗（React 内容经 portal 自动更新）
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getBMapGL } from '../../loaders/load-bmapgl';
import type {
  IUsePointInfoWindowParams,
  IUsePointInfoWindowResult,
} from './types';

/** 信息窗默认宽度 */
const DEFAULT_WIDTH = 320;
/** 打开延时：规避紧邻关闭时 BMapGL 渲染异常（源业务实测） */
const OPEN_DELAY = 50;

export function usePointInfoWindow(params: IUsePointInfoWindowParams): IUsePointInfoWindowResult {
  const {
    map,
    point,
    width = DEFAULT_WIDTH,
    offset,
    enableAutoPan = true,
    enableCloseOnClick = true,
  } = params;

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const iwRef = useRef<BMapGL.InfoWindow | null>(null);
  /** 已打开点位的标识（id + 坐标）：同 key 数据刷新不重开 */
  const lastKeyRef = useRef<string | null>(null);
  const onCloseRef = useRef(params.onClose);
  onCloseRef.current = params.onClose;

  /** 关闭当前信息窗（内部主动关闭：先摘 ref 再 close，用户触发的 close 事件里以此区分） */
  const closeInfoWindow = useCallback(() => {
    const iw = iwRef.current;
    if (!iw) return;
    iwRef.current = null;
    lastKeyRef.current = null;
    try {
      iw.close();
    } catch {
      // 地图实例可能已销毁
    }
  }, []);

  // ---- 实例生命周期：map / point 变化时打开、关闭或保持 ----
  useLayoutEffect(() => {
    if (!map || !point) {
      closeInfoWindow();
      setContainer(null);
      return;
    }

    // 同 id 且同坐标：数据刷新（如轮询更新），React 内容经 portal 自动更新，不重开
    const key = `${point.id}|${point.longitude},${point.latitude}`;
    if (key === lastKeyRef.current) return;

    const BGL = getBMapGL();
    if (!BGL) return;

    closeInfoWindow();

    const div = document.createElement('div');
    const iw = new BGL.InfoWindow(div, {
      width,
      title: '',
      enableAutoPan,
      enableCloseOnClick,
      offset: new BGL.Size(offset?.[0] ?? 0, offset?.[1] ?? -24),
    });
    // 用户关闭（关闭按钮 / 点击地图）：仅非内部主动关闭时回调
    iw.addEventListener('close', () => {
      if (iwRef.current !== iw) return;
      iwRef.current = null;
      lastKeyRef.current = null;
      onCloseRef.current?.();
    });

    iwRef.current = iw;
    lastKeyRef.current = key;
    // 容器先就绪（游离节点），React portal 渲染内容后再由 BMapGL 搬入地图 DOM
    setContainer(div);

    // 延时打开：规避紧邻关闭时 BMapGL 渲染异常
    const timer = window.setTimeout(() => {
      map.openInfoWindow(iw, new BGL.Point(point.longitude, point.latitude));
    }, OPEN_DELAY);

    return () => {
      window.clearTimeout(timer);
      closeInfoWindow();
    };
  }, [map, point, width, offset, enableAutoPan, enableCloseOnClick, closeInfoWindow]);

  // 卸载兜底（地图实例可能先于此 effect 销毁，close 内部已吞异常）
  useEffect(() => closeInfoWindow, [closeInfoWindow]);

  return { container };
}
