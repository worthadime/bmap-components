/**
 * 地图初始缩放自适应工具
 *
 * 百度地图（Web Mercator）下 zoom 级别决定"每像素代表多少度"，
 * 可视经度跨度 = 容器宽 W × 360 / (256 × 2^zoom)，与容器像素宽度成正比。
 * 固定 zoom 时屏幕越宽看得越多，故按容器实测宽度对基准 zoom 做 log2 线性校正：
 *   z = baseZoom + log2(W / referenceWidth)
 * 使不同尺寸屏幕下初始可视区域（经度跨度）大体一致。
 */

/** 参考屏幕宽度：基准 zoom 调优时的基准屏宽 */
export const REFERENCE_SCREEN_WIDTH = 1920;

/** 缩放上下限（与 MapView 默认 minZoom/maxZoom 一致） */
export const ZOOM_MIN = 3;
export const ZOOM_MAX = 20;

/**
 * 按容器实测宽度计算自适应初始缩放
 *
 * @param containerWidth 地图容器实测宽度（CSS px；地图内部按 devicePixelRatio 渲染，无需乘 DPR）
 * @param baseZoom 基准 zoom（referenceWidth 屏宽下的调优值）
 * @param referenceWidth 基准屏宽
 * @returns 自适应 zoom；容器未布局（宽度 ≤ 0）时回退 baseZoom
 */
export function calcAdaptiveZoom(
  containerWidth: number,
  baseZoom: number,
  referenceWidth: number = REFERENCE_SCREEN_WIDTH,
): number {
  if (containerWidth <= 0) return baseZoom;
  const zoom = baseZoom + Math.log2(containerWidth / referenceWidth);
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}
