import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { ILayer } from '../..';
import { TYPES } from '../../types';
import Clock from '../../utils/clock';
import { IGlobalConfigService } from '../config/IConfigService';
import { IRendererService } from '../renderer/IRendererService';
import { ILayerModel, ILayerService } from './ILayerService';

@injectable()
export default class LayerService implements ILayerService {
  public clock = new Clock();

  public alreadyInRendering: boolean = false;

  private layers: ILayer[] = [];

  private layerRenderID: number;

  private sceneInited: boolean = false;

  private animateInstanceCount: number = 0;

  private lastRenderType: string;

  // ---
  private stats: any;
  // ---

  @inject(TYPES.IRendererService)
  private readonly renderService: IRendererService;

  @inject(TYPES.IGlobalConfigService)
  private readonly configService: IGlobalConfigService;

  public add(layer: ILayer) {
    if (this.sceneInited) {
      layer.init();
    }
    this.layers.push(layer);
  }

  public initLayers() {
    this.sceneInited = true;
    this.layers.forEach((layer) => {
      if (!layer.inited) {
        layer.init();
      }
    });
  }

  public getLayers(): ILayer[] {
    return this.layers;
  }

  public getLayer(id: string): ILayer | undefined {
    return this.layers.find((layer) => layer.id === id);
  }

  public getLayerByName(name: string): ILayer | undefined {
    return this.layers.find((layer) => layer.name === name);
  }

  public remove(layer: ILayer): void {
    const layerIndex = this.layers.indexOf(layer);
    if (layerIndex > -1) {
      this.layers.splice(layerIndex, 1);
    }
    layer.emit('remove', null);
    layer.destroy();
    this.renderLayers();
  }

  public removeAllLayers() {
    this.destroy();
  }

  public renderLayers(renderType?: string) {
    // TODO: 每次渲染的时候都需要进行渲染判断，判断是否进行渲染
    // 没有传递 type 参数时默认触发的是地图事件，优先级最高，直接渲染
    if (!this.renderTest(renderType)) {
      return;
    }

    if (this.alreadyInRendering) {
      return;
    }
    this.alreadyInRendering = true;
    this.clear();
    this.updateRenderOrder();
    this.layers
      .filter((layer) => layer.inited)
      .filter((layer) => layer.isVisible())
      .forEach((layer) => {
        // trigger hooks
        layer.hooks.beforeRenderData.call();
        layer.hooks.beforeRender.call();
        layer.render();
        layer.hooks.afterRender.call();
      });
    this.alreadyInRendering = false;
  }

  public updateRenderOrder() {
    this.layers.sort((pre: ILayer, next: ILayer) => {
      return pre.zIndex - next.zIndex;
    });
  }

  public destroy() {
    this.layers.forEach((layer) => layer.destroy());
    this.layers = [];
    this.renderLayers();
  }

  public startAnimate() {
    if (this.animateInstanceCount++ === 0) {
      this.clock.start();
      this.runRender();
    }
  }

  // @ts-ignore
  public startAnimate2(stats) {
    // @ts-ignore
    this.stats = stats;
    if (this.animateInstanceCount++ === 0) {
      this.clock.start();
      this.runRender();
    }
  }

  public stopAnimate() {
    if (--this.animateInstanceCount === 0) {
      this.stopRender();
      this.clock.stop();
    }
  }

  public getOESTextureFloat() {
    return this.renderService.extensionObject.OES_texture_float;
  }

  // private runRender() {
  //   this.renderLayers();
  //   this.layerRenderID = requestAnimationFrame(this.runRender.bind(this));
  // }

  public runRender() {
    // @ts-ignore
    this?.stats?.update();
    // this.renderLayers();
    this.renderLayers('animate');
    this.layerRenderID = requestAnimationFrame(this.runRender.bind(this));
  }

  // 渲染检测
  private renderTest(renderType: string | undefined): boolean {
    // 继续渲染事件
    if (renderType) {
      switch (renderType) {
        case 'picking':
          // return false;
          //  TODO: picking 类型的渲染事件
          //  若是上次触发为地图触发的渲染，则认为是地图事件与拾取事件在同时触发，放弃此次渲染
          if (this.lastRenderType === 'mapRender' || this.lastRenderType === 'animate') {
            this.lastRenderType = 'picking';
            return false;
          } else {
            this.lastRenderType = 'picking';
            return true;
          }
        case 'animate':
          // return false;
          if (this.lastRenderType === 'mapRender') {
            this.lastRenderType = 'animate';
            return false;
          } else {
            this.lastRenderType = 'animate';
            return true;
          }
        case 'mapRender':
          this.lastRenderType = 'mapRender';
          return true;
        default:
          return true;
      }
    }
    return true;
  }

  private clear() {
    this.renderService.clear({
      color: [0, 0, 0, 0],
      depth: 1,
      stencil: 0,
      framebuffer: null,
    });
  }

  private stopRender() {
    cancelAnimationFrame(this.layerRenderID);
  }
}
