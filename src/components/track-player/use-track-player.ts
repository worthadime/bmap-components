/**
 * useTrackPlayer —— 轨迹回放受控 Hook（LuShu 路书）
 *
 * 无 UI 设计：本 Hook 只负责 LuShu 实例生命周期与受控状态（播放/暂停/跳转/倍速/进度），
 * 使用方基于返回状态自绘播放控制条。渲染语义对齐源业务 useLuShu：
 * - 进度以 LuShu 内部索引 i 为准（rAF 轮询同步，轨迹点跳变时更新状态）
 * - seek 通过 setPosition + 手动同步 i（vendor 内部按坐标精确匹配，最近点吸附需手动回填）
 * - 倍速经 updateSpeed 以 originSpeed 为基数相乘
 * - 图标旋转优先用 ITrackPoint.direction（覆写 vendor setRotation，左右装饰副本同步）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBMapGL } from '../../loaders/load-bmapgl';
import { loadLuShu } from '../../loaders/load-lushu';
import { findNearestTrackPoint } from '../track-line/use-track-line';
import iconVehicleMoving from '../../assets/location-ontheway.png';
import type { ITrackPoint } from '../../types/map';
import type {
  ITrackPlayerStatus,
  IUseTrackPlayerParams,
  IUseTrackPlayerResult,
} from './types';

/** 基础速度默认值（米/秒，与源业务一致） */
const DEFAULT_BASE_SPEED = 1000;
/** 移动标记默认尺寸 */
const DEFAULT_MARKER_SIZE = 42;
/** calcTotalDuration 返回 0 时的兜底时长（对齐源业务 || 100） */
const FALLBACK_DURATION = 100;

export function useTrackPlayer(params: IUseTrackPlayerParams): IUseTrackPlayerResult {
  const { map, track, speed = DEFAULT_BASE_SPEED, marker, autoView = true } = params;

  const [status, setStatus] = useState<ITrackPlayerStatus>('INITIAL');
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState<ITrackPoint[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [totalDuration, setTotalDuration] = useState(0);

  const lushuRef = useRef<BMapGLLib.ILuShuInstance | null>(null);
  // 轨迹点列表镜像：rAF 轮询与控制回调闭包读取最新值（避免以 points 为依赖重建）
  const pointsRef = useRef<ITrackPoint[]>([]);
  // 状态/倍速镜像：供 rAF 与异步闭包读取最新值
  const statusRef = useRef<ITrackPlayerStatus>('INITIAL');
  const speedMultiplierRef = useRef(1);
  // 回调用 ref 持有最新引用：回调变化不应触发回放重建
  const onProgressRef = useRef(params.onProgress);
  onProgressRef.current = params.onProgress;
  const onStatusRef = useRef(params.onStatusChange);
  onStatusRef.current = params.onStatusChange;
  const infoWindowRef = useRef(params.infoWindow);
  infoWindowRef.current = params.infoWindow;

  const updateStatus = useCallback((s: ITrackPlayerStatus) => {
    statusRef.current = s;
    setStatus(s);
    onStatusRef.current?.(s);
  }, []);

  /** 销毁当前实例（含 marker 移除；地图已销毁时忽略异常） */
  const destroyInstance = useCallback(() => {
    const l = lushuRef.current;
    if (l) {
      try {
        l.stop();
        l.removeMarker();
      } catch {
        // 地图实例可能已销毁
      }
    }
    lushuRef.current = null;
  }, []);

  // ---- 实例生命周期：map / track / 基础速度 / 标记配置 / 视野跟随 变化时整体重建 ----
  useEffect(() => {
    if (!map || !track || track.points.length < 2) {
      destroyInstance();
      pointsRef.current = [];
      setPoints([]);
      setIndex(0);
      setTotalDuration(0);
      updateStatus('INITIAL');
      return;
    }

    let disposed = false;

    loadLuShu()
      .then((LuShu) => {
        if (disposed) return;
        const BGL = getBMapGL();
        if (!BGL) return;

        destroyInstance();

        const trackPoints = track.points;
        pointsRef.current = trackPoints;
        setPoints(trackPoints);
        const path = trackPoints.map((p) => new BGL.Point(p.lng, p.lat));

        // 信息窗：未提供时传空字符串（vendor start() 会自动隐藏）
        let instance: BMapGLLib.ILuShuInstance;
        const infoRender = infoWindowRef.current;
        const defaultContent: string | ((pos: BMapGL.Point, realPos: BMapGL.Point) => string) = infoRender
          ? (pos: BMapGL.Point) =>
              infoRender({
                point: trackPoints[Math.max(0, instance.i)] ?? trackPoints[0],
                index: Math.max(0, instance.i),
                pos: { lng: pos.lng, lat: pos.lat },
              })
          : '';

        const markerOpts = marker ?? {};
        const rotationEnabled = markerOpts.rotation !== false;
        instance = new LuShu(map, path, {
          defaultContent,
          autoView,
          icon: new BGL.Icon(
            markerOpts.icon ?? iconVehicleMoving,
            new BGL.Size(markerOpts.width ?? DEFAULT_MARKER_SIZE, markerOpts.height ?? DEFAULT_MARKER_SIZE),
          ),
          speed,
          enableRotation: rotationEnabled,
          landmarkPois: [],
        });
        lushuRef.current = instance;

        // 图标旋转优先用轨迹点 direction（覆写 vendor 基于像素方向的计算，左右副本同步）
        if (rotationEnabled) {
          const originalSetRotation = instance.setRotation.bind(instance);
          instance.setRotation = (
            prePos: BMapGL.Point,
            curPos: BMapGL.Point,
            targetPos: BMapGL.Point,
            direction: string | null,
          ) => {
            const p = trackPoints[instance.i];
            const rotation = p?.direction != null && !isNaN(Number(p.direction)) ? Number(p.direction) : null;
            if (rotation !== null) {
              instance._marker?.setRotation(rotation);
              instance._markerL?.setRotation(rotation);
              instance._markerR?.setRotation(rotation);
              return;
            }
            originalSetRotation(prePos, curPos, targetPos, direction);
          };
        }

        // 重建后恢复倍速（vendor 倍速以 originSpeed 为基数）
        if (speedMultiplierRef.current !== 1) {
          instance.updateSpeed(speedMultiplierRef.current);
        }

        setTotalDuration(instance.calcTotalDuration(0) || FALLBACK_DURATION);
        setIndex(0);
        updateStatus('INITIAL');
      })
      .catch((err: unknown) => {
        console.error('[bmap-components] TrackPlayer 初始化失败', err);
      });

    return () => {
      disposed = true;
      destroyInstance();
    };
  }, [map, track, speed, marker, autoView, destroyInstance, updateStatus]);
  // ---- rAF 进度轮询：读 LuShu 内部索引 i，跳变时更新状态；到达终点转 FINISHED ----
  useEffect(() => {
    let raf = 0;
    let lastIndex = -1;
    const tick = () => {
      const l = lushuRef.current;
      if (l) {
        const total = pointsRef.current.length;
        const i = l.i;
        if (total && i >= 0 && i !== lastIndex) {
          lastIndex = i;
          setIndex(i);
          onProgressRef.current?.({ index: i, percent: Math.min(((i + 1) / total) * 100, 100) });
        }
        if (total && statusRef.current === 'PLAYING' && i >= total - 1) {
          updateStatus('FINISHED');
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [updateStatus]);

  const play = useCallback(() => {
    const l = lushuRef.current;
    if (!l) return;
    const total = pointsRef.current.length;
    // 已在终点（播放完或 seek 至末点）：stop 复位 → 200ms 后从头重播（对齐源业务）
    if (total && l.i >= total - 1) {
      l.stop();
      setIndex(0);
      setTimeout(() => {
        l.start();
        updateStatus('PLAYING');
      }, 200);
      return;
    }
    l.start();
    updateStatus('PLAYING');
  }, [updateStatus]);

  const pause = useCallback(() => {
    if (!lushuRef.current) return;
    lushuRef.current.pause();
    updateStatus('PAUSED');
  }, [updateStatus]);

  const stop = useCallback(() => {
    const l = lushuRef.current;
    if (!l) return;
    l.stop();
    setIndex(0);
    updateStatus('INITIAL');
  }, [updateStatus]);

  const seekToIndex = useCallback(
    (target: number) => {
      const l = lushuRef.current;
      const BGL = getBMapGL();
      const trackPoints = pointsRef.current;
      if (!l || !BGL) return;
      if (target < 0 || target >= trackPoints.length) return;
      const p = trackPoints[target];
      const point = new BGL.Point(p.lng, p.lat);
      l.setPosition(point);
      // 双保险同步索引（对齐源业务：vendor setPosition 内部按坐标精确匹配）
      l.i = target;
      setIndex(target);
      // 跳转后暂停（运行中的动画链与新位置不一致，需停住）
      if (statusRef.current === 'PLAYING') {
        l.pause();
        updateStatus('PAUSED');
      }
    },
    [updateStatus],
  );

  const seekToCoordinate = useCallback(
    (coord: { lng: number; lat: number }) => {
      const trackPoints = pointsRef.current;
      const nearest = findNearestTrackPoint(coord.lng, coord.lat, trackPoints);
      if (!nearest) return;
      seekToIndex(trackPoints.indexOf(nearest));
    },
    [seekToIndex],
  );

  const setSpeed = useCallback((multiplier: number) => {
    speedMultiplierRef.current = multiplier;
    setSpeedMultiplier(multiplier);
    lushuRef.current?.updateSpeed(multiplier);
  }, []);

  const progress = points.length ? Math.min(((index + 1) / points.length) * 100, 100) : 0;

  return {
    status,
    index,
    progress,
    currentPoint: points[index] ?? null,
    speed: speedMultiplier,
    totalDuration,
    play,
    pause,
    stop,
    seekToIndex,
    seekToCoordinate,
    setSpeed,
  };
}
