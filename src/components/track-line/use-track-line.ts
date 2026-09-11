/**
 * useTrackLine —— 轨迹图层 Hook
 *
 * 渲染结构（对齐源业务实现的三线渲染语义）：
 * - 实际轨迹：LineLayer（红色箭头纹理，支持点击拾取 → 最近轨迹点回调）
 * - 计划轨迹：绿色箭头纹理 Polyline（纯展示，不参与拾取体系，避免纹理/选中异常）
 * - 标记：起点圆点（canvas 动态生成）、终点旗帜、事件点（park / offline / yaw 内置图标，其余类型橙色圆点）
 * - fitView：数据变更后自动 setViewport 包含全部轨迹点
 *
 * 数据契约：只消费 ITrackData 纯数据结构，业务方负责适配（见 types/map.ts）。
 */

import { useEffect, useRef } from 'react';
import { getBMapGL } from '../../loaders/load-bmapgl';
import type { ITrackPoint } from '../../types/map';
import iconTrackEnd from '../../assets/track-end.png';
import iconMarkerParking from '../../assets/marker-parking.png';
import iconMarkerOffline from '../../assets/marker-offline.png';
import iconMarkerDeviate from '../../assets/marker-deviate.png';
import iconRoadGreenArrow from '../../assets/icon-road-green-arrow.png';
import type { IUseTrackLineParams } from './types';

/** 实际轨迹线默认色（红） */
const REAL_LINE_COLOR = '#ce4848';
/** 计划轨迹线默认色（绿） */
const PLAN_LINE_COLOR = '#1dc67c';
/** 起点圆点默认色 */
const START_DOT_COLOR = '#00ba69';
/** 未知类型事件点圆点色 */
const EVENT_DOT_COLOR = '#fa8c16';
/** 线宽默认值 */
const LINE_WEIGHT = 8;

/** 实际轨迹线方向箭头纹理（base64 瓦片，随包分发零外部依赖） */
const REAL_ARROW_TEXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAABACAYAAAATffeWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE7mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDEgNzkuMTQ2Mjg5OSwgMjAyMy8wNi8yNS0yMDowMTo1NSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3RhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wMy0yNlQxNzoxNTo0NCswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDMtMjZUMTc6MTc6MzQrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMDMtMjZUMTc6MTc6MzQrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI0MzdkOGFiLWM1ZDctZDE0NC1hZmVhLTg5ODE4ZWJiNWNhNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyNDM3ZDhhYi1jNWQ3LWQxNDQtYWZlYS04OTgxOGViYjVjYTYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyNDM3ZDhhYi1jNWQ3LWQxNDQtYWZlYS04OTgxOGViYjVjYTYiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjI0MzdkOGFiLWM1ZDctZDE0NC1hZmVhLTg5ODE4ZWJiNWNhNiIgc3RFdnQ6d2hlbj0iMjAyNS0wMy0yNlQxNzoxNTo0NCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI1LjAgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PiJLRKQAAAEGSURBVFjDY/z//z+DduXX/wxkgKvt3IxMDBSCUQNGDRg1YNSAUQNGDRjuBswJ58KpeEkcF34DViVzM1gaMDJszubGULgxk5vBUJORYV06N24Dfv+G1PJKMgwMK5MRCpclcDOoyEHYP3+htgQY0dsHx6u5Gfh4IOyTVxgYfv1mYLA1hPA/f2VgsGj5ir99YNn6FawJBMx1EJr//kXVjDcW0qb+YviH5FIQ06H1G/HRePfVP4YV2/8zwMzYffw/w9ef2GOGBZvgx/9/Geae/MkgLsLOwMnByFCz7TvDz3//iTcA6F2GF7/+MhRu+Mbw9z8FKfHv/9HcOGrAqAGjBowaMGoAnQ0AANL5VVuZMcn1AAAAAElFTkSuQmCC';

/** 终点标记尺寸与偏移（对齐源业务 MARKER_CONFIG / addMarkers） */
const END_MARKER = { w: 40, h: 48, ox: 0, oy: -24 };
/** 内置事件标记：类型 → 图标与偏移 */
const EVENT_MARKERS: Record<string, { icon: string; w: number; h: number; ox: number; oy: number }> = {
  park: { icon: iconMarkerParking, w: 25, h: 32, ox: -2, oy: 2 },
  offline: { icon: iconMarkerOffline, w: 25, h: 32, ox: 2, oy: -2 },
  yaw: { icon: iconMarkerDeviate, w: 25, h: 32, ox: 0, oy: 0 },
};

/** canvas 绘制带白描边的实心圆点（起点 / 未知事件类型的默认标记） */
function makeCircleDataUrl(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.beginPath();
  ctx.arc(10, 10, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toDataURL();
}

/** 最近轨迹点查找（Haversine 球面距离） */
export function findNearestTrackPoint(lng: number, lat: number, points: ITrackPoint[]): ITrackPoint | null {
  let nearest: ITrackPoint | null = null;
  let minDist = Infinity;
  for (const p of points) {
    const dLat = ((lat - p.lat) * Math.PI) / 180;
    const dLng = ((lng - p.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const dist = 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}

export function useTrackLine(params: IUseTrackLineParams): void {
  const { map, track, line, planLine, endpoints, fitView = true } = params;

  // 回调用 ref 持有最新引用：回调变化不应触发图层重建
  const nodeClickRef = useRef(params.onNodeClick);
  nodeClickRef.current = params.onNodeClick;
  const eventClickRef = useRef(params.onEventClick);
  eventClickRef.current = params.onEventClick;

  useEffect(() => {
    if (!map || !track) return;
    const BGL = getBMapGL();
    if (!BGL) return;

    const layers: BMapGL.LineLayer[] = [];
    const overlays: unknown[] = [];

    /** 添加图标标记（含点击回调注册） */
    const addMarker = (
      lng: number,
      lat: number,
      iconUrl: string,
      w: number,
      h: number,
      ox: number,
      oy: number,
      onClick?: () => void,
    ) => {
      if (!iconUrl) return;
      const marker = new BGL.Marker(new BGL.Point(lng, lat), {
        icon: new BGL.Icon(iconUrl, new BGL.Size(w, h)),
        offset: new BGL.Size(ox, oy),
        zIndex: 99,
      });
      if (onClick) marker.addEventListener('click', onClick);
      map.addOverlay(marker);
      overlays.push(marker);
    };

    const realPts = track.points;
    const planPts = track.planPoints ?? [];

    // ① 实际轨迹线（LineLayer：箭头纹理 + 点击拾取）
    if (line !== false && realPts.length >= 2) {
      const lineStyle = line ?? {};
      const texture = lineStyle.texture === undefined ? REAL_ARROW_TEXTURE : lineStyle.texture;
      const style: Record<string, unknown> = {
        linksLine: true,
        sequence: false,
        marginLength: 40,
        borderMask: false,
        borderWeight: 1,
        strokeWeight: lineStyle.weight ?? LINE_WEIGHT,
        strokeStyle: 'solid',
        strokeColor: lineStyle.color ?? REAL_LINE_COLOR,
        strokeLineJoin: 'bevel',
        strokeLineCap: 'square',
      };
      if (texture !== false) {
        style.strokeTextureUrl = texture;
        style.strokeTextureWidth = 24;
        style.strokeTextureHeight = 80;
      }
      const layer = new BGL.LineLayer({
        enablePicked: true,
        // 单线不启用 autoSelect：避免自动选中首条线显示蓝色高亮
        autoSelect: false,
        autoUpdate: true,
        pickWidth: 100,
        pickHeight: 100,
        isLinear: false,
        isFlat: false,
        selectedColor: 'blue',
        opacity: 1,
        zIndex: 999,
        style,
      });
      layer.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: realPts.map((p) => [p.lng, p.lat]) },
            properties: { name: 'real' },
          },
        ],
      });
      map.addNormalLayer(layer);
      layers.push(layer);
      layer.addEventListener('click', (e) => {
        if (e.value?.dataIndex !== -1 && e.value?.dataItem && e.latLng) {
          const nearest = findNearestTrackPoint(e.latLng.lng, e.latLng.lat, realPts);
          if (nearest) nodeClickRef.current?.(nearest);
        }
      });
    }

    // ② 计划轨迹线（绿色箭头纹理 Polyline：纯展示，不参与拾取体系）
    if (planLine !== false && planPts.length >= 2) {
      const planStyle = planLine ?? {};
      const texture = planStyle.texture === undefined ? iconRoadGreenArrow : planStyle.texture;
      const opts: Record<string, unknown> = {
        strokeColor: planStyle.color ?? PLAN_LINE_COLOR,
        strokeWeight: planStyle.weight ?? LINE_WEIGHT,
        strokeOpacity: 1,
      };
      if (texture !== false) {
        opts.strokeTexture = { url: texture, height: 100 };
      }
      const polyline = new BGL.Polyline(
        planPts.map((p) => new BGL.Point(p.lng, p.lat)),
        opts,
      );
      map.addOverlay(polyline);
      overlays.push(polyline);
    }

    // ③ 起终点标记（实际轨迹存在时才有起终点）
    if (endpoints !== false && realPts.length >= 2) {
      const first = realPts[0];
      const last = realPts[realPts.length - 1];
      addMarker(first.lng, first.lat, makeCircleDataUrl(endpoints?.startColor ?? START_DOT_COLOR), 20, 20, 0, 0);
      addMarker(last.lng, last.lat, endpoints?.endIcon ?? iconTrackEnd, END_MARKER.w, END_MARKER.h, END_MARKER.ox, END_MARKER.oy);
    }

    // ④ 事件标记（内置 park / offline / yaw 图标，其余类型橙色圆点兜底）
    for (const ev of track.events ?? []) {
      const cfg = EVENT_MARKERS[ev.type];
      if (cfg) {
        addMarker(ev.lng, ev.lat, cfg.icon, cfg.w, cfg.h, cfg.ox, cfg.oy, () => eventClickRef.current?.(ev));
      } else {
        addMarker(ev.lng, ev.lat, makeCircleDataUrl(EVENT_DOT_COLOR), 20, 20, 0, 0, () => eventClickRef.current?.(ev));
      }
    }

    // ⑤ 自适应视野（含实际与计划轨迹全部点位）
    if (fitView) {
      const all = [...realPts, ...planPts];
      if (all.length >= 1) {
        map.setViewport(all.map((p) => new BGL.Point(p.lng, p.lat)));
      }
    }

    return () => {
      layers.forEach((l) => {
        try {
          map.removeNormalLayer(l);
        } catch {
          // 图层可能已随地图销毁
        }
      });
      overlays.forEach((o) => {
        try {
          map.removeOverlay(o);
        } catch {
          // 覆盖物可能已随地图销毁
        }
      });
    };
  }, [map, track, line, planLine, endpoints, fitView]);
}
