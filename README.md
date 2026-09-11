# @worthadime/bmap-components

> 基于百度地图 BMapGL（WebGL 版）的数据驱动 React 地图组件包。零 UI 库依赖、脚本资源自包含、支持微前端沙箱环境。

纯数据驱动：传入 `points` 数组即可渲染带状态着色、聚合、气泡动效的点位图层，无需关心 BMapGL / MapVGL 的加载与销毁细节。

## 特性

- **数据驱动**：点位、状态、轨迹均为纯 JSON 契约（`IMapPoint` / `IPointStatusMap` / `ITrackData`），组件负责渲染与生命周期
- **资源自包含**：MapVGL（约 608KB）与 LuShu 内置于包内，按需动态加载（独立 chunk + Blob URL 注入），不污染主包首屏；也可通过 `scriptBaseUrl` 切换为自托管
- **AK 外置**：包内不含任何百度地图 AK，由使用方通过 `initBMapSDK({ ak })` 注入
- **微前端兼容**：内置 micro-app 沙箱绕过逻辑（仅沙箱环境启用），宿主已加载 BMapGL / MapVGL 时自动复用
- **双格式产物**：ESM + CJS + 完整 TypeScript 类型声明
- **React >= 17**：peer 依赖，不捆绑 React

## 安装

```bash
npm install @worthadime/bmap-components
# 或
pnpm add @worthadime/bmap-components
```

## 前置条件：申请百度地图 AK

1. 登录 [百度地图开放平台控制台](https://lbsyun.baidu.com/apiconsole/key) 创建应用
2. 应用类型选择 **浏览器端（JS API）**，启用服务勾选 **JS API GL v1.0**
3. 配置 Referer 白名单（如 `localhost`、`*.your-domain.com`）
4. 将 AK 交给 `initBMapSDK()`，**不要**写死在可公开访问的代码仓库中

## 快速开始

```tsx
import { useEffect, useState } from 'react';
import {
  initBMapSDK,
  loadBMapGL,
  MapView,
  usePointLayer,
  vehiclePointPreset,
  type IMapPoint,
  type IMapViewContext,
} from '@worthadime/bmap-components';

// 1. 应用入口处初始化一次（传入你的 AK）
initBMapSDK({ ak: 'YOUR_BMAP_AK' });

const points: IMapPoint[] = [
  { id: 'v1', longitude: 116.404, latitude: 39.915, status: 'driving', label: '京A·12345', speed: 62 },
  { id: 'v2', longitude: 116.484, latitude: 39.948, status: 'stopped', label: '京B·67890' },
  { id: 'v3', longitude: 116.324, latitude: 39.882, status: 'offline', label: '京C·00001' },
];

function VehicleLayer({ ctx }: { ctx: IMapViewContext }) {
  // 2. 声明式点位层：数据变更自动重建图层
  usePointLayer({
    map: ctx.map,
    points,
    preset: vehiclePointPreset,
    onPointClick: (point) => console.log('点击点位', point),
  });
  return null;
}

export default function App() {
  const [ctx, setCtx] = useState<IMapViewContext | null>(null);

  return (
    <div style={{ width: '100%', height: 600 }}>
      {/* 3. 地图容器：纯 JSAPI 初始化，自适应缩放 */}
      <MapView center={{ lng: 116.404, lat: 39.915 }} zoom={11} onReady={setCtx}>
        {ctx && <VehicleLayer ctx={ctx} />}
      </MapView>
    </div>
  );
}
```

### 自定义状态映射（不用预设）

```tsx
usePointLayer({
  map: ctx.map,
  points,
  statusMap: {
    normal: { color: '#1677ff', text: '正常' },
    alarm: { color: '#ff4d4f', text: '告警' },
  },
  cluster: { clusterRadius: 120 },
  label: { formatter: (p) => p.label ?? '' },
});
```

### 关闭标签 / 关闭聚合

```tsx
usePointLayer({
  map: ctx.map,
  points,
  preset: shipPointPreset,
  label: false,   // 不渲染 LabelLayer
  cluster: false, // 不渲染 ClusterLayer，全部走单点气泡
});
```

### 轨迹图层（实际 + 计划 + 事件点）

```tsx
import { useTrackLine, type ITrackData } from '@worthadime/bmap-components';

const track: ITrackData = {
  points: [
    { lng: 116.404, lat: 39.915, time: '2026-09-11 08:00:00', speed: 62 },
    { lng: 116.484, lat: 39.948, time: '2026-09-11 08:32:00', speed: 55 },
    { lng: 116.554, lat: 39.982, time: '2026-09-11 09:05:00', speed: 48 },
  ],
  planPoints: [{ lng: 116.404, lat: 39.915 }, { lng: 116.560, lat: 39.990 }],
  events: [
    { id: 'e1', type: 'park', lng: 116.484, lat: 39.948, startTime: '08:32', duration: 600, description: '停留 10 分钟' },
  ],
};

function TrackLayer({ ctx }: { ctx: IMapViewContext }) {
  useTrackLine({
    map: ctx.map,
    track,
    onNodeClick: (point) => console.log('点击轨迹节点', point),
    onEventClick: (event) => console.log('点击事件', event),
  });
  return null;
}
```

- 实际轨迹为红色箭头纹理线（点击返回最近轨迹点）；`line: false` 关闭，`line: { color, weight, texture }` 自定义
- 计划轨迹为绿色箭头纹理线（纯展示不参与拾取）；`planLine: false` 关闭
- 起终点与事件标记默认开启（`endpoints: false` 关闭）；内置 `park`（停车）/ `offline`（离线）/ `yaw`（偏航）图标，其余事件类型渲染橙色圆点
- `fitView`（默认开）在数据变更后自动调整视野包含全部轨迹点

### 轨迹回放（useTrackPlayer + useTrackLine 联动）

```tsx
import { useRef } from 'react';
import { useTrackPlayer } from '@worthadime/bmap-components';

function PlayerBar({ ctx, track }: { ctx: IMapViewContext; track: ITrackData }) {
  const barRef = useRef<HTMLDivElement>(null);
  const player = useTrackPlayer({
    map: ctx.map,
    track,
    onProgress: ({ percent }) => {
      // 高频回调：直接写 DOM，避免 setState 重渲染链
      if (barRef.current) barRef.current.style.width = `${percent}%`;
    },
  });

  return (
    <div className="playback-bar">
      <button onClick={player.stop}>⏮ 复位</button>
      <button onClick={player.play}>▶ 播放</button>
      <button onClick={player.pause}>⏸ 暂停</button>
      <select value={player.speed} onChange={(e) => player.setSpeed(Number(e.target.value))}>
        {[1, 5, 10, 20].map((s) => <option key={s} value={s}>{s}x</option>)}
      </select>
      <button onClick={() => player.seekToIndex(0)}>回到起点</button>
      <div className="track"><div ref={barRef} className="fill" /></div>
    </div>
  );
}

// 与 useTrackLine 联动：点击轨迹节点跳转回放位置
function TrackLayer({ ctx, track }: { ctx: IMapViewContext; track: ITrackData }) {
  const player = useTrackPlayer({ map: ctx.map, track });
  useTrackLine({
    map: ctx.map,
    track,
    onNodeClick: (point) => player.seekToCoordinate({ lng: point.lng, lat: point.lat }),
  });
  return null;
}
```

- 无 UI 设计：Hook 只负责 LuShu 路书实例生命周期与受控状态，播放控制条由使用方自绘
- 进度以 LuShu 内部轨迹点索引为准（rAF 轮询同步），`status` 为 `INITIAL / PLAYING / PAUSED / FINISHED`；已播完时再次 `play()` 自动从头重播
- `seekToIndex(index)` / `seekToCoordinate(coord)`（吸附最近轨迹点）跳转后自动暂停；`onProgress` 高频触发，回调内建议直接写 DOM 或用 ref，避免 setState
- 移动标记默认内置车辆行驶图标并随方向旋转（优先取 `ITrackPoint.direction`）；`marker: { icon, width, height, rotation }` 自定义
- `infoWindow: (ctx) => html` 在标记处展示信息窗（返回 HTML 字符串，`ctx` 含当前轨迹点与实时插值坐标），默认关闭
- 倍速 `setSpeed(multiplier)` 在基础速度 `speed`（默认 1000 米/秒）上相乘；`totalDuration` 为 1 倍速总时长（秒）

### 点位信息窗（React 渲染）

```tsx
import { useState } from 'react';
import { MapView, usePointLayer, PointInfoWindow, vehiclePointPreset, type IMapPoint, type IMapViewContext } from '@worthadime/bmap-components';

function PointLayerWithInfo({ ctx, points }: { ctx: IMapViewContext; points: IMapPoint[] }) {
  const [selected, setSelected] = useState<IMapPoint | null>(null);

  usePointLayer({
    map: ctx.map,
    points,
    preset: vehiclePointPreset,
    onPointClick: setSelected, // 点位 → 信息窗
  });

  return (
    <PointInfoWindow map={ctx.map} point={selected} onClose={() => setSelected(null)}>
      {(p) => (
        <div style={{ padding: 12, fontFamily: 'inherit' }}>
          <strong>{p.label ?? p.id}</strong>
          <div>状态：{p.status ?? '--'}</div>
          <div>速度：{p.speed ?? '--'} km/h</div>
          <button onClick={() => console.log('查看详情', p.payload)}>详情</button>
        </div>
      )}
    </PointInfoWindow>
  );
}
```

- 受控组件：`point` 为 `null` 时关闭；用户关闭（按钮 / 点击地图）经 `onClose` 通知，使用方应将 `point` 置回 `null`
- 内容为 React 渲染（`createPortal` 进 BMapGL InfoWindow 容器），render-prop 形式拿到当前 `IMapPoint`；事件、状态、任意组件库卡片可直接使用
- 同 id 且同坐标的点位数据刷新（如轮询）不重开信息窗，React 内容自动更新；坐标变化则重开
- `width`（默认 320）、`offset`（默认 `[0, -24]` 配 48px 中心锚定图标）、`enableAutoPan`（默认开）、`enableCloseOnClick`（默认开）可调；同一地图同时只显示一个信息窗（BMapGL 限制）
- `usePointInfoWindow` 为其内部 Hook，返回 `container` 元素，高级场景可自建 portal

## API 一览

### 初始化与加载器

| 导出 | 说明 |
|------|------|
| `initBMapSDK(options)` | 全局初始化，必须在首次渲染地图前调用。`options.ak` 必填；`styleJson` 自定义地图样式（v3）；`scriptBaseUrl` 自托管脚本目录（见下文） |
| `getBMapSDKOptions()` | 读取全局配置（未初始化会抛错） |
| `loadBMapGL()` | 加载 BMapGL JSAPI，返回 `Promise<typeof BMapGL>`，单例、失败可重试 |
| `loadMapVGL()` | 加载 MapVGL，宿主已有 `window.mapvgl` 时直接复用 |
| `loadLuShu()` | 加载路书（轨迹回放），内部自动等待 BMapGL 就绪 |
| `getBMapGL()` | 同步获取已加载的 BMapGL 命名空间（未加载返回 `undefined`） |

### 组件与 Hooks

| 导出 | 说明 |
|------|------|
| `<MapView>` | 地图容器。Props：`center`、`zoom`、`minZoom/maxZoom`、`adaptive`（按容器宽度自适应缩放，默认开）、`styleJson`、`enableScrollWheelZoom`、`enableDoubleClickZoom`、`onReady(ctx)`、`onError`、`loading`、`errorFallback`。children 支持 render-prop `(ctx) => ReactNode` |
| `useMapView()` | MapView 内部使用的 Hook，高级场景可直接使用 |
| `usePointLayer(params)` | 点位图层 Hook：`map`、`points`、`preset`、`statusMap`、`cluster`、`label`、`onPointClick` |
| `vehiclePointPreset` | 车辆点位预设：`driving`（绿）/ `stopped`（黄）/ `offline`（灰），行驶点位标签附速度 |
| `shipPointPreset` | 船舶点位预设：`sailing` / `anchored` / `abnormal` / `offline`，默认无标签 |
| `useTrackLine(params)` | 轨迹图层 Hook：`map`、`track`、`line`、`planLine`、`endpoints`、`fitView`、`onNodeClick`、`onEventClick`。实际轨迹（红色箭头纹理，可点击）+ 计划轨迹（绿色箭头纹理，纯展示）+ 起终点与事件标记，数据变更自动重建并自适应视野 |
| `useTrackPlayer(params)` | 轨迹回放 Hook（LuShu 路书）：`map`、`track`、`speed`、`marker`、`infoWindow`、`autoView`、`onProgress`、`onStatusChange`。返回 `status` / `index` / `progress` / `currentPoint` / `speed` / `totalDuration` 与 `play` / `pause` / `stop` / `seekToIndex` / `seekToCoordinate` / `setSpeed` 受控命令 |
| `<PointInfoWindow>` | 点位信息窗组件（React 渲染）：`map`、`point`（受控，null 关闭）、`children`（render-prop 拿当前点位）、`width`、`offset`、`enableAutoPan`、`enableCloseOnClick`、`onClose`。`createPortal` 渲染进 BMapGL InfoWindow |
| `usePointInfoWindow(params)` | PointInfoWindow 内部 Hook，返回 `container` 元素（createPortal 目标），高级场景自建 portal |

### 数据契约（类型）

| 类型 | 说明 |
|------|------|
| `IMapPoint` | 点位：`id`、`longitude`、`latitude`、`status?`、`icon?`、`label?`、`speed?`、`payload?` |
| `IPointStatusMap` | 状态映射：`Record<string, { icon?; color; text? }>`，未命中状态回退到预设默认样式 |
| `ITrackPoint` / `ITrackEvent` / `ITrackData` / `ITrackSummary` | 轨迹数据契约（`useTrackLine` 消费） |
| `IMapViewProps` / `IMapViewContext` / `IUsePointLayerParams` / `IPointLayerPreset` | 组件参数类型 |
| `IUseTrackLineParams` / `ITrackLineStyle` / `ITrackEndpointsOptions` | 轨迹图层参数类型 |
| `IUseTrackPlayerParams` / `IUseTrackPlayerResult` / `ITrackPlayerStatus` / `ITrackMarkerOptions` / `ITrackPlayerInfoCtx` / `ITrackProgressState` | 轨迹回放参数与返回类型 |
| `IPointInfoWindowProps` / `IUsePointInfoWindowParams` / `IUsePointInfoWindowResult` / `IPointInfoWindowOptions` | 点位信息窗参数类型 |
| `calcAdaptiveZoom(width, baseZoom)` | 自适应缩放工具：`baseZoom + log2(width / 1920)`，clamp 到 `[3, 20]` |

## 自托管脚本与 CSP

默认情况下，MapVGL / LuShu 脚本以包内文本形式随包分发，运行时通过 `Blob URL` 注入。两种场景需要额外处理：

**1. 希望脚本走 CDN / 静态服务器（减小包体积、利用浏览器缓存）**

将 `mapvgl.min.txt`、`lushu.txt` 改回 `.js` 后缀放到你的静态服务目录，然后：

```ts
initBMapSDK({
  ak: 'YOUR_BMAP_AK',
  scriptBaseUrl: 'https://static.your-domain.com/vendor/', // 需以 / 结尾
});
```

加载器会请求 `${scriptBaseUrl}mapvgl.min.js` 与 `${scriptBaseUrl}LuShu.js`。

**2. 严格的 CSP 策略（禁止 `blob:` script-src）**

Blob URL 注入要求 CSP 允许 `script-src blob:`。若无法满足，请改用上面的 `scriptBaseUrl` 自托管方案，并将该域名加入 CSP 白名单。

## 微前端说明

- 检测到 `window.__MICRO_APP_ENVIRONMENT__`（micro-app）时，自动对 `Node.prototype.appendChild` 等方法打补丁，放行 `baidu.com` 脚本到真实 document；非沙箱环境零开销。
- 宿主应用若已加载 `window.BMapGL` / `window.mapvgl`，加载器直接复用，不会重复加载。
- 多次调用 `initBMapSDK` 以最后一次为准（建议应用入口处只调一次）。

## 注意事项

- `usePointLayer` 的 `points`、`statusMap`、`cluster`、`label` 变更会**整体重建图层**（与源业务实现语义一致）。高频更新点位时请对数据做节流；`statusMap` / `cluster` / `label` 等 options 对象请用 `useMemo` 保持稳定引用，避免每次渲染都重建。
- `useTrackLine` / `useTrackPlayer` 同理：`track`、`line`、`marker` 等 options 对象请用 `useMemo` 保持稳定引用，变更会整体重建；各类回调（`onNodeClick` / `onEventClick` / `onProgress` / `onStatusChange` / `infoWindow`）以 ref 持有，变化不触发重建。
- `<MapView>` 的 `center` / `zoom` 变更走增量更新（`setCenter` / `setZoom`），不会重建地图实例。
- 包以 `sideEffects: false` 发布，支持 tree-shaking；但 `initBMapSDK()` 是命令式 API，请在入口显式调用。

## 发布

### 公共 npm（路径 A，推荐）

1. 确认 `package.json` 的 `publishConfig.access: "public"`（作用域包默认私有，需显式公开）
2. 本地验证：`pnpm install && pnpm build && npx publint && npm pack --dry-run`
3. 配置 npm Trusted Publishing（OIDC）：npmjs.com 包设置中绑定 GitHub 仓库与 `.github/workflows/release.yml`，无需长效 token
4. 打 tag 触发 CI 发布：`git tag v0.1.0 && git push --tags`（CI 自动 build → publint → `npm publish --provenance`）

### tgz 分发（路径 B，兜底）

```bash
pnpm build && npm pack   # 产出 worthadime-bmap-components-0.1.0.tgz
```

使用方：`npm install /path/to/worthadime-bmap-components-0.1.0.tgz`。注意 tgz 方式无版本解析能力，升级需手动替换文件。

## Roadmap

- [x] MapView 地图容器（纯 JSAPI，自适应缩放）
- [x] PointLayer 点位图层（聚合 / 气泡 / 标签，车辆与船舶预设）
- [x] BMapGL / MapVGL / LuShu 加载器（自包含 + 沙箱兼容）
- [x] TrackLine 轨迹图层（实际轨迹 + 计划轨迹 + 事件点）
- [x] TrackPlayer 轨迹回放（基于 LuShu，受控进度 / 跳转 / 倍速）
- [x] PointInfoWindow 点位信息窗（React 渲染）
- [ ] 更多预设与主题（船舶轨迹、事件图标扩展）

## License

MIT
