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

### 数据契约（类型）

| 类型 | 说明 |
|------|------|
| `IMapPoint` | 点位：`id`、`longitude`、`latitude`、`status?`、`icon?`、`label?`、`speed?`、`payload?` |
| `IPointStatusMap` | 状态映射：`Record<string, { icon?; color; text? }>`，未命中状态回退到预设默认样式 |
| `ITrackPoint` / `ITrackEvent` / `ITrackData` / `ITrackSummary` | 轨迹数据契约（轨迹组件将在后续版本发布） |
| `IMapViewProps` / `IMapViewContext` / `IUsePointLayerParams` / `IPointLayerPreset` | 组件参数类型 |
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
- [ ] TrackLine 轨迹图层（实际轨迹 + 计划轨迹 + 事件点）
- [ ] TrackPlayer 轨迹回放（基于 LuShu，受控进度）
- [ ] PointInfoWindow 点位信息窗（React 渲染）

## License

MIT
