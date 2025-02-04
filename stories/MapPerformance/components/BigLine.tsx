// @ts-nocheck
// @ts-ignore
import { Scene } from '@antv/l7';
import { PointLayer, LineLayer } from '@antv/l7-layers';
import { GaodeMap, Mapbox } from '@antv/l7-maps';
import * as React from 'react';

export default class PointTest extends React.Component {
  private scene: Scene;

  public componentWillUnmount() {
    this.scene.destroy();
  }

  public async componentDidMount() {
    const scene = new Scene({
      id: 'map',
      map: new GaodeMap({
        center: [110.19382669582967, 30.258134],
        pitch: 0,
        zoom: 5,
      }),
    });
    scene.diasbleShaderPick();
    let address =
      'https://gw.alipayobjects.com/os/bmw-prod/3f2f9284-3fb1-4838-8baa-6ffd06738fcd.csv';
    fetch(address)
      .then((res) => res.text())
      .then((data) => {
        const lineLayer = new LineLayer({
          // autoFit: true,
          blend: 'normal',
        })
          .source(data, {
            parser: {
              type: 'csv',
              x: 'f_lon',
              y: 'f_lat',
              x1: 't_lon',
              y1: 't_lat',
            },
          })
          .shape('arcmini')
          .size(2)
          .color('rgb(13,64,140)')
          .style({
            segmentNumber: 30,
          });

        // lineLayer2
        const lineLayer2 = new LineLayer({
          // autoFit: true,
          blend: 'normal',
        })
          .source(data, {
            parser: {
              type: 'csv',
              x: 'f_lon',
              y: 'f_lat',
              x1: 't_lon',
              y1: 't_lat',
            },
          })
          .shape('arc')
          .size(2)
          .color('rgb(13,64,140)')
          .style({
            segmentNumber: 30,
          })
          .select({
            color: '#ff0',
          })
          .active({
            color: '#ff0',
          });
        lineLayer2.hide();
        // scene.addLayer(lineLayer2);

        scene.addLayer(lineLayer);

        window.onmousedown = () => {
          // lineLayer2.hide()
          lineLayer.show();
        };
        window.onmouseup = () => {
          // lineLayer2.show()
          lineLayer.hide();
        };
      });
  }

  public render() {
    return (
      <div
        id="map"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      ></div>
    );
  }
}
