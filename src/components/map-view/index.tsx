import type { CSSProperties } from 'react';
import { useMapView } from './use-map-view';
import type { IMapViewProps } from './types';

const containerBaseStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const mapElStyle: CSSProperties = {
  width: '100%',
  height: '100%',
};

const placeholderStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f0f2f5',
  color: '#999',
  fontSize: 13,
};

/**
 * MapView —— 百度地图容器组件
 *
 * 职责单一：加载 BMapGL、创建地图实例、向子内容分发地图上下文。
 * 不依赖任何 UI 组件库，样式全靠内联，使用方零配置接入。
 */
export function MapView(props: IMapViewProps) {
  const { className, style, loading, errorFallback, children } = props;
  const { containerRef, ctx, error } = useMapView(props);

  return (
    <div className={className} style={{ ...containerBaseStyle, ...style }}>
      <div ref={containerRef} style={mapElStyle} />
      {!ctx && !error && (loading ?? <div style={placeholderStyle}>地图加载中…</div>)}
      {error &&
        (errorFallback ? (
          errorFallback(error)
        ) : (
          <div style={placeholderStyle}>地图加载失败：{error.message}</div>
        ))}
      {ctx && (typeof children === 'function' ? children(ctx) : children)}
    </div>
  );
}

export default MapView;
