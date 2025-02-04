---
title: Control 控件
order: 3
---

`markdown:docs/common/style.md`

地图组件用于控制地图的状态如果平移，缩放，或者展示地图一些的辅助信息如图例、比例尺

L7 目前支持 Control

- Zoom 放大缩小
- Scale 比例尺
- Layers 图层列表

## 构造函数

#### option

position: `string` 控件位置支持 8 个方位

- bottomright
- topright
- bottomleft
- topleft
- topcenter
- bottomcenter
- leftcenter
- rightcenter

### 组件介绍

```
import { Scale, Layers, Zoom } from '@antv/l7';

```

#### Zoom

放大缩小组件 默认左上角

```javascript
const zoomControl = new Zoom({
  position: 'topleft',
});

scene.addControl(zoomControl);
```

#### Scale

比例尺组件 默认左下角

```javascript
const scaleControl = new Scale({
  position: 'bottomleft',
});

scene.addControl(scaleControl);
```

#### Layers

图层列表目前支持可视化的图层控制

配置项

option 控件配置项
overlayers 将一组图层添加到图层列表，
overlayers Object
key: 列表显示的图层名字可以自定义
layer: 图层对象
overlayers 示例

```javascript
const layer = {
  图层一: layer1,
  图层二: layer2,
};
```

```javascript
const overlayers = {
  点图层: layer,
};
const layersControl = new Layers({
  overlayers,
});
scene.addControl(layersControl);
```

## 方法

#### setPosition

设置组件位置

```javascript
control.setPosition('bottomright');
```

#### remove

移除地图组件

```javascript
control.remove();
```
