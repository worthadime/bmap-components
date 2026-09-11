/**
 * 内置点位视觉预设 —— 车辆 / 船舶
 *
 * 图标以 dataurl 内联进产物，使用方零静态资源配置；
 * 状态色沿用蓝色科技感主题（行驶/航行绿、静止/停泊黄、异常红、离线灰）。
 */

import iconVehicleDriving from '../../assets/location-ontheway.png';
import iconVehicleStopped from '../../assets/location-stop.png';
import iconVehicleOffline from '../../assets/location-offline.png';
import iconShip from '../../assets/icon-ship.png';
import iconShipOffline from '../../assets/icon-ship-offline.png';
import type { IClusterGradient, IPointLayerPreset } from './types';

/** 聚合点默认渐变（按密度：浅蓝 → 亮蓝 → 深蓝） */
export const DEFAULT_CLUSTER_GRADIENT: IClusterGradient = {
  0: '#69b1ff',
  0.5: '#1677ff',
  1: '#003eb3',
};

/** 车辆预设：driving 行驶 / stopped 静止 / offline 离线 */
export const vehiclePointPreset: IPointLayerPreset = {
  defaultIcon: iconVehicleOffline,
  defaultColor: '#bfbfbf',
  statusMap: {
    driving: { icon: iconVehicleDriving, color: '#52c41a', text: '行驶' },
    stopped: { icon: iconVehicleStopped, color: '#faad14', text: '静止' },
    offline: { icon: iconVehicleOffline, color: '#bfbfbf', text: '离线' },
  },
  bubble: { sizeScale: 2.5, radiusScale: 2, duration: 1.5, trail: 1, trial: 6 },
  // 行驶中标签附带速度，其余状态只显名称
  labelFormatter: (point) =>
    `${point.label ?? ''}${point.status === 'driving' && point.speed != null ? `\n${point.speed}km/h` : ''}`,
};

/** 船舶预设：sailing 航行 / anchored 停泊 / abnormal 异常 / offline 离线（图标统一为船舶，状态由气泡色区分） */
export const shipPointPreset: IPointLayerPreset = {
  defaultIcon: iconShipOffline,
  defaultColor: '#bfbfbf',
  statusMap: {
    sailing: { icon: iconShip, color: '#52c41a', text: '航行' },
    anchored: { icon: iconShip, color: '#faad14', text: '停泊' },
    abnormal: { icon: iconShip, color: '#f5222d', text: '异常' },
    offline: { icon: iconShipOffline, color: '#bfbfbf', text: '离线' },
  },
  bubble: { sizeScale: 3, radiusScale: 1.6, duration: 1, trail: 1, trial: 5 },
};
