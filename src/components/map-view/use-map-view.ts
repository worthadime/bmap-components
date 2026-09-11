/**
 * useMapView —— 地图容器核心 Hook
 *
 * 采用纯 JSAPI（new BMapGL.Map）而非 react-bmapgl 等组件化封装：
 * 组件化封装在 CSS transform scale（画中画/大屏适配）场景下
 * 地图 DOM 重排会导致缩放失效，直接持有原生实例最稳。
 *
 * 生命周期：挂载时初始化一次；center/zoom 变更走增量设置，不重建实例。
 */

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getBMapSDKOptions } from '../../init';
import { loadBMapGL } from '../../loaders/load-bmapgl';
import { calcAdaptiveZoom, ZOOM_MAX, ZOOM_MIN } from '../../utils/zoom';
import type { ILngLat } from '../../types/map';
import type { IMapViewContext } from './types';

export interface IUseMapViewParams {
  center: ILngLat;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  adaptive?: boolean;
  styleJson?: unknown;
  enableScrollWheelZoom?: boolean;
  enableDoubleClickZoom?: boolean;
  enableMapClick?: boolean;
  onReady?: (ctx: IMapViewContext) => void;
  onError?: (error: Error) => void;
}

export interface IUseMapViewResult {
  /** 地图容器 div ref（挂到组件内部的地图 div 上） */
  containerRef: RefObject<HTMLDivElement>;
  /** 地图上下文（null 表示未就绪） */
  ctx: IMapViewContext | null;
  error: Error | null;
}

export function useMapView(params: IUseMapViewParams): IUseMapViewResult {
  const { center, zoom, minZoom, maxZoom, adaptive = true, styleJson, enableScrollWheelZoom, enableDoubleClickZoom, enableMapClick } = params;

  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<IMapViewContext | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 回调用 ref 持有最新引用：回调变化不应触发地图重建
  const callbackRef = useRef({ onReady: params.onReady, onError: params.onError });
  callbackRef.current = { onReady: params.onReady, onError: params.onError };

  // 初始化（仅挂载时一次；center/zoom 为初始值，后续变更走下方增量 effect）
  useEffect(() => {
    let disposed = false;
    let map: BMapGL.Map | null = null;

    loadBMapGL()
      .then((bmapgl) => {
        const el = containerRef.current;
        if (disposed || !el) return;

        map = new bmapgl.Map(el, {
          enableMapClick: enableMapClick ?? true,
          enableAdaptiveMinZoom: false,
        });
        try {
          const effectiveStyle = styleJson ?? getBMapSDKOptions().styleJson;
          if (effectiveStyle) {
            map.setMapStyleV2({ styleJson: effectiveStyle, version: 'v3' });
          }
        } catch {
          // 样式设置失败不阻塞地图渲染
        }

        // 初始缩放按容器实测宽度自适应，不同屏幕下初始可视区域一致
        const initialZoom = adaptive ? calcAdaptiveZoom(el.clientWidth, zoom) : zoom;
        map.centerAndZoom(new bmapgl.Point(center.lng, center.lat), initialZoom);
        map.setMinZoom(minZoom ?? ZOOM_MIN);
        map.setMaxZoom(maxZoom ?? ZOOM_MAX);
        if (enableScrollWheelZoom !== false) map.enableScrollWheelZoom(true);
        if (enableDoubleClickZoom !== false) map.enableDoubleClickZoom(true);

        const nextCtx = { map, bmapgl };
        setCtx(nextCtx);
        callbackRef.current.onReady?.(nextCtx);
      })
      .catch((err: unknown) => {
        if (disposed) return;
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        callbackRef.current.onError?.(normalized);
      });

    return () => {
      disposed = true;
      try {
        map?.destroy();
      } catch {
        // destroy 失败忽略（百度内部 DOM 已移除时可能抛错）
      }
      setCtx(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // center 增量更新（不重建实例）
  useEffect(() => {
    if (!ctx) return;
    ctx.map.setCenter(new ctx.bmapgl.Point(center.lng, center.lat));
  }, [ctx, center.lng, center.lat]);

  // zoom 增量更新（不重建实例；此处按原值设置，不参与自适应换算）
  useEffect(() => {
    if (!ctx) return;
    ctx.map.setZoom(zoom);
  }, [ctx, zoom]);

  return { containerRef, ctx, error };
}
