/**
 * usePointLayer —— 点位聚合图层 Hook（MapVGL）
 *
 * 三层渲染结构：CircleLayer（气泡扩散动效）+ LabelLayer（文本标签，可关）+ ClusterLayer（聚合）。
 * beforeRender 拦截聚合层默认渲染，手动向气泡层/标签层灌数据，
 * 从而支持"聚合点半透明气泡 + 单点状态色气泡 + 状态底色标签"的组合视觉。
 */

import { useEffect, useRef } from 'react';
import { loadMapVGL } from '../../loaders/load-mapvgl';
import type { IMapPoint } from '../../types/map';
import { DEFAULT_CLUSTER_GRADIENT, vehiclePointPreset } from './status-presets';
import type { IUsePointLayerParams } from './types';

/** 写入 ClusterLayer 的单点数据结构 */
interface IClusterItem {
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { icon: string; width: number; height: number };
  color: string;
  status: string;
  /** 原始点位引用：点击回调原样带回 */
  point: IMapPoint;
}

/** MapVGL beforeRender / onClick 回调中的数据项（聚合库内部结构，只声明消费字段） */
interface IClusterRenderItem {
  geometry: { type: string; coordinates: [number, number] };
  /** 'Feature' 表示聚合点；单点无此字段 */
  type?: string;
  status?: string;
  point?: IMapPoint;
  properties?: { color?: string };
}

/** 修改 rgba 颜色透明度（Feature 聚合点气泡用；非 rgba 格式原样返回） */
function modifyAlpha(rgba: string, alpha: number): string {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (!match) return rgba;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${Math.min(1, Math.max(0, alpha)).toFixed(2)})`;
}

export function usePointLayer(params: IUsePointLayerParams): void {
  const { map, points, preset = vehiclePointPreset, statusMap, cluster, label, onPointClick } = params;

  // 回调用 ref 持有最新引用：回调变化不应触发图层重建
  const clickRef = useRef(onPointClick);
  clickRef.current = onPointClick;

  useEffect(() => {
    if (!map) return;
    let disposed = false;
    let view: mapvgl.View | null = null;

    const resolvedStatusMap = statusMap ?? preset.statusMap;
    const clusterOpts = {
      clusterRadius: 175,
      minSize: 36,
      maxSize: 68,
      minZoom: 1,
      maxZoom: 20,
      minPoints: 2,
      gradient: DEFAULT_CLUSTER_GRADIENT,
      featureAlpha: 0.25,
      ...cluster,
    };
    const bubbleOpts = {
      sizeScale: 2.5,
      radiusScale: 2,
      duration: 1.5,
      trail: 1,
      trial: 6,
      ...preset.bubble,
    };
    const labelOpts =
      label === false
        ? null
        : {
            offset: [0, -30] as [number, number],
            fontSize: 13,
            textColor: '#fff',
            formatter: preset.labelFormatter ?? ((p: IMapPoint) => p.label ?? ''),
            ...label,
          };

    loadMapVGL()
      .then((mapvgl) => {
        if (disposed) return;

        view = new mapvgl.View({ map });

        // ① 气泡扩散层（科技感动效）
        const bubbleLayer = new mapvgl.CircleLayer({
          type: 'bubble',
          size: (size: number) => bubbleOpts.sizeScale * size,
          radius: (size: number) => bubbleOpts.radiusScale * size,
          duration: bubbleOpts.duration,
          trail: bubbleOpts.trail,
          trial: bubbleOpts.trial,
          random: false,
        });
        view.addLayer(bubbleLayer);

        // ② 标签层（可关）
        let labelLayer: mapvgl.LabelLayer | null = null;
        if (labelOpts) {
          labelLayer = new mapvgl.LabelLayer({
            textAlign: 'center',
            textColor: labelOpts.textColor,
            overflow: 'hidden',
            borderWidth: 0,
            offset: labelOpts.offset,
            padding: [5, 8],
            borderRadius: 5,
            fontSize: labelOpts.fontSize,
            lineHeight: 22,
            collides: true,
            enablePicked: true,
            autoSelect: true,
          });
          view.addLayer(labelLayer);
        }

        // ③ 聚合数据：IMapPoint → MapVGL 内部结构
        const clusterData: IClusterItem[] = points.map((p) => {
          const status = p.status ?? '';
          const statusVisual = resolvedStatusMap[status];
          return {
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
            properties: {
              icon: p.icon ?? statusVisual?.icon ?? preset.defaultIcon,
              width: 48,
              height: 48,
            },
            color: clusterOpts.gradient[0.5],
            status,
            point: p,
          };
        });

        // ④ 聚合层
        const clusterLayer = new mapvgl.ClusterLayer({
          minSize: clusterOpts.minSize,
          maxSize: clusterOpts.maxSize,
          clusterRadius: clusterOpts.clusterRadius,
          maxZoom: clusterOpts.maxZoom,
          minZoom: clusterOpts.minZoom,
          gradient: {
            0.0: clusterOpts.gradient[0],
            0.5: clusterOpts.gradient[0.5],
            1.0: clusterOpts.gradient[1],
          },
          useItemColor: true,
          showText: true,
          minPoints: clusterOpts.minPoints,
          averageCenter: false,
          textOptions: { fontSize: 13, color: 'white', fontWeight: 'bold' },
          enablePicked: true,
          onClick: (e: { dataItem?: IClusterRenderItem }) => {
            const item = e.dataItem;
            // 仅响应单点点击；Feature 为聚合点，交给地图默认放大行为
            if (item && item.type !== 'Feature' && item.point) {
              clickRef.current?.(item.point);
            }
          },
          beforeRender: (pData: IClusterRenderItem[]) => {
            // 气泡层：Feature 用半透明主题色，单点用状态色
            bubbleLayer.setData(
              pData.map((item) => ({
                geometry: item.geometry,
                color:
                  item.type === 'Feature'
                    ? modifyAlpha(item.properties?.color ?? clusterOpts.gradient[0.5], clusterOpts.featureAlpha)
                    : (resolvedStatusMap[item.status ?? '']?.color ?? preset.defaultColor),
                size: 22,
              })),
            );

            // 标签层：仅单点，底色取状态色
            if (labelLayer && labelOpts) {
              labelLayer.setData(
                pData
                  .filter((item) => item.type !== 'Feature' && item.point)
                  .map((item) => ({
                    ...item,
                    properties: {
                      backgroundColor: resolvedStatusMap[item.status ?? '']?.color ?? preset.defaultColor,
                      text: labelOpts.formatter(item.point as IMapPoint),
                    },
                  })),
              );
            }

            // 返回 true 阻止默认渲染，使用上面的手动渲染逻辑
            return true;
          },
        });
        view.addLayer(clusterLayer);
        clusterLayer.setData(clusterData);
      })
      .catch((err: unknown) => {
        console.error('[bmap-components] PointLayer 初始化失败', err);
      });

    return () => {
      disposed = true;
      try {
        view?.destroy();
      } catch {
        // destroy 失败忽略（地图已销毁时可能抛错）
      }
    };
  }, [map, points, preset, statusMap, cluster, label]);
}
