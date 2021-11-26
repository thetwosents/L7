import {
  AttributeType,
  gl,
  IEncodeFeature,
  IFramebuffer,
  IModel,
  IModelUniform,
  ITexture2D,
} from '@antv/l7-core';
import { generateColorRamp, IColorRamp } from '@antv/l7-utils';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import BaseModel from '../../core/BaseModel';
import { HeatmapTriangulation } from '../../core/triangulation';
import heatmapColorFrag from '../shaders/heatmap_frag.glsl';
import heatmapFrag from '../shaders/heatmap_framebuffer_frag.glsl';
import heatmapVert from '../shaders/heatmap_framebuffer_vert.glsl';
import heatmapColorVert from '../shaders/heatmap_vert.glsl';

interface IHeatMapLayerStyleOptions {
  opacity: number;
  intensity: number;
  radius: number;
  angle: number;
  rampColors: IColorRamp;
}
@injectable()
export default class HeatMapModel extends BaseModel {
  protected texture: ITexture2D;
  protected colorTexture: ITexture2D;
  protected heatmapFramerBuffer: IFramebuffer;
  private intensityModel: IModel;
  private colorModel: IModel;

  public render() {
    const { clear, useFramebuffer } = this.rendererService;
    useFramebuffer(this.heatmapFramerBuffer, () => {
      clear({
        color: [0, 0, 0, 0],
        depth: 1,
        stencil: 0,
        framebuffer: this.heatmapFramerBuffer,
      });
      this.drawIntensityMode();
    });
    if (this.layer.styleNeedUpdate) {
      this.updateColorTexture();
    }
    this.drawColorMode();
  }

  public getUninforms(): IModelUniform {
    throw new Error('Method not implemented.');
  }

  public initModels(): IModel[] {
    const {
      createFramebuffer,
      clear,
      getViewportSize,
      createTexture2D,
      useFramebuffer,
    } = this.rendererService;
    const shapeAttr = this.styleAttributeService.getLayerStyleAttribute(
      'shape',
    );

    // 生成热力图密度图
    this.intensityModel = this.buildHeatMapIntensity();
    // 渲染到屏幕
    this.colorModel = this.buildHeatmapColor();

    const { width, height } = getViewportSize();

    // 初始化密度图纹理
    this.heatmapFramerBuffer = createFramebuffer({
      color: createTexture2D({
        width: Math.floor(width / 4),
        height: Math.floor(height / 4),
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        min: gl.LINEAR,
        mag: gl.LINEAR,
      }),
      depth: false,
    });

    this.updateColorTexture();

    return [this.intensityModel, this.colorModel];
  }

  public buildModels(): IModel[] {
    return this.initModels();
  }

  protected registerBuiltinAttributes() {
    this.styleAttributeService.registerStyleAttribute({
      name: 'dir',
      type: AttributeType.Attribute,
      descriptor: {
        name: 'a_Dir',
        buffer: {
          // give the WebGL driver a hint that this buffer may change
          usage: gl.DYNAMIC_DRAW,
          data: [],
          type: gl.FLOAT,
        },
        size: 2,
        update: (
          feature: IEncodeFeature,
          featureIdx: number,
          vertex: number[],
          attributeIdx: number,
        ) => {
          return [vertex[3], vertex[4]];
        },
      },
    });

    // point layer size;
    this.styleAttributeService.registerStyleAttribute({
      name: 'size',
      type: AttributeType.Attribute,
      descriptor: {
        name: 'a_Size',
        buffer: {
          // give the WebGL driver a hint that this buffer may change
          usage: gl.DYNAMIC_DRAW,
          data: [],
          type: gl.FLOAT,
        },
        size: 1,
        update: (
          feature: IEncodeFeature,
          featureIdx: number,
          vertex: number[],
          attributeIdx: number,
        ) => {
          const { size = 1 } = feature;
          return [size as number];
        },
      },
    });
  }
  private buildHeatMapIntensity(): IModel {
    return this.layer.buildLayerModel({
      moduleName: 'heatmapintensity',
      vertexShader: heatmapVert,
      fragmentShader: heatmapFrag,
      triangulation: HeatmapTriangulation,
      depth: {
        enable: false,
      },
      blend: {
        enable: true,
        func: {
          srcRGB: gl.ONE,
          srcAlpha: 1,
          dstRGB: gl.ONE,
          dstAlpha: 1,
        },
      },
    });
  }

  private buildHeatmapColor(): IModel {
    this.shaderModuleService.registerModule('heatmapColor', {
      vs: heatmapColorVert,
      fs: heatmapColorFrag,
    });

    const { vs, fs, uniforms } = this.shaderModuleService.getModule(
      'heatmapColor',
    );
    const {
      createAttribute,
      createElements,
      createBuffer,
      createModel,
    } = this.rendererService;
    return createModel({
      vs,
      fs,
      attributes: {
        a_Position: createAttribute({
          buffer: createBuffer({
            data: [-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0],
            type: gl.FLOAT,
          }),
          size: 3,
        }),
        a_Uv: createAttribute({
          buffer: createBuffer({
            data: [0, 1, 1, 1, 0, 0, 1, 0],
            type: gl.FLOAT,
          }),
          size: 2,
        }),
      },
      uniforms: {
        ...uniforms,
      },
      depth: {
        enable: false,
      },
      blend: this.getBlend(),
      count: 6,
      elements: createElements({
        data: [0, 2, 1, 2, 3, 1],
        type: gl.UNSIGNED_INT,
        count: 6,
      }),
    });
  }

  private drawIntensityMode() {
    const {
      opacity,
      intensity = 10,
      radius = 5,
    } = this.layer.getLayerConfig() as IHeatMapLayerStyleOptions;
    this.intensityModel.draw({
      uniforms: {
        u_opacity: opacity || 1.0,
        u_radius: radius,
        u_intensity: intensity,
      },
    });
  }

  private drawColorMode() {
    const {
      opacity,
    } = this.layer.getLayerConfig() as IHeatMapLayerStyleOptions;
    this.colorModel.draw({
      uniforms: {
        u_opacity: opacity || 1.0,
        u_colorTexture: this.colorTexture,
        u_texture: this.heatmapFramerBuffer,
      },
    });
  }

  private updateColorTexture() {
    const { createTexture2D } = this.rendererService;
    if (this.texture) {
      this.texture.destroy();
    }

    const {
      rampColors,
    } = this.layer.getLayerConfig() as IHeatMapLayerStyleOptions;
    const imageData = generateColorRamp(rampColors as IColorRamp);
    this.colorTexture = createTexture2D({
      data: new Uint8Array(imageData.data),
      width: imageData.width,
      height: imageData.height,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      min: gl.NEAREST,
      mag: gl.NEAREST,
      flipY: false,
    });
  }
}
