import { tsc } from '../utils/core';

export interface AngularDynamicClassTemplate {
  className: string;
  selector: string;
}

export const angularDynamicClassTemplate = tsc<AngularDynamicClassTemplate>(
  `import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit
} from '@angular/core';

import {
  @{className},
  @{className}Context,
  getSVGViewBox
} from '../assets';

@Component({
  selector: '@{selector}',
  template: @{className}.svg,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements SVG2TSDynamic, OnInit {
  public static UUID = 0;
  public baseUrl: string;
  @Input() public height: number | string = @{className}.height;
  @Input() public viewBox: string = getSVGViewBox(@{className}.viewBox);
  @Input() public width: number | string = @{className}.width;
  @Input()
  public set context(ctx: @{className}Context) {
    this.updateContext(ctx);
  }
  public get context() {
    return this._context;
  }

  private _context: @{className}Context = @{className}.contextDefaults;

  constructor(private _ref: ChangeDetectorRef) {}


  public getURLBase(value: string) {
    return \\\`url('\\\${this.getXlinkBase(value)}')\\\`;
  }

  public getXlinkBase(value: string) {
    return \\\`\\\${this.baseUrl}\\\${value}\\\`;
  }

  public ngOnInit() {
    this.baseUrl = window.location.href.replace(window.location.hash, '');
    this.context.uuid = @{className}Component.UUID++;
  }

  public updateContext(ctx: any) {
    this._context = Object.assign({}, this._context ? this._context : @{className}.contextDefaults, ctx);
    this._ref.markForCheck();
  }
}
`,
  { className: '', selector: '' }
);

export interface AngularDynamicModuleTemplate {
  moduleName: string;
  components: Array<string>;
}

export const angularDynamicModuleTemplate = tsc<AngularDynamicModuleTemplate>(
  `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  @{
    components.map((component)=>{
      return \`@{component}Component\`;
  }).join(',\\n  ')
  }
} from './components'

const comps = [
  @{
    components.map((component)=>{
        return \`@{component}Component\`;
    }).join(',\\n  ')
  }
];

@NgModule({
  declarations: [ ...comps ],
  exports: [ ...comps ],
  imports:[ CommonModule ],
  entryComponents: [ ...comps ]
})
export class @{moduleName}Module { }
`,
  {
    moduleName: '',
    components: []
  }
);

export const assetsTemplate = tsc<any>(
  `import {
  @{assets.join(\',\\n  \')}
} from '../assets';

export const assetsMap = {
  @{
    assets.map((asset)=>{
        return \`[\${asset}.name]: \${asset}\`;
    }).join(',\\n  ')
  }
};
`,
  { assets: [] }
);

export interface SvgIconClassTemplate {
  moduleName: string;
  className: string;
  selector: string;
  components: Array<{ component: string; name: string }>;
  assets: Array<string>;
  pascalCase: (str: string) => string;
}
export const svgIconClassTemplate = tsc<SvgIconClassTemplate>(
  `import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  Input,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef
} from '@angular/core';

import { assetsMap } from './\assets';

@{
    components.map((component)=>{
        return \`import { \${component.component}Component } from './\${component.name}.component';\`;
    }).join('\\n')
}

import {
  @{
    components.map(component=>pascalCase(component.name)).join(',')
  }
} from '../assets';

const componentsMap = {
@{
    components.map((component)=>{
        return \`  [\${component.component}.name]: \${component.component}Component\`;
    }).join(',\\n  ')
}
};


@Component({
  selector: '@{selector}',
  template: \\\`
    <svg
      #staticSvg
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="getViewBox()"
      [attr.hidden]="iconFile.contextDefaults"
    ></svg>

    <div [hidden]="!iconFile.contextDefaults"><ng-template #dynSvg></ng-template></div>\\\`,
  styles: [':host{ display: inline-block; position: relative; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit, AfterViewInit {
  private static SEED = 0;

  @Input() public height: string | number = 0;
  @Input() public viewBox = '';
  @ViewChild('dynSvg', { read: ViewContainerRef }) public viewContainerRef;
  @ViewChild('staticSvg') public staticSvg: ElementRef;
  @Input() public width: string | number = 0;

  @Input() public set context(ctx) {
    this._context = ctx;
    if (this._iconComponent) {
      this._iconComponent.instance.context = ctx;
      this._ref.markForCheck();
    }
  }

  @Input() public set icon(icon: string) {
    this._createIcon(icon);
  }

  public get iconFile(): SVG2TSFile {
    return this._icon;
  }

  private _context: any;
  private _icon: SVG2TSFile;
  private _iconComponent: ComponentRef<SVG2TSDynamic>;
  private _isStaticIcon = false;
  private _initialized = false;

  constructor(
    private _ref: ChangeDetectorRef,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _renderer: Renderer2
  ) {}

  public getViewBox() {
    return this.viewBox !== ''
      ? this.viewBox
      : this._icon.viewBox
        ? [
            this._icon.viewBox.minx,
            this._icon.viewBox.miny,
            this._icon.viewBox.width,
            this._icon.viewBox.height
          ].join(' ')
        : [0, 0, this._icon.width, this._icon.height].join(' ');
  }

  public ngAfterViewInit() {
    if (this._isStaticIcon) {
      this._createStaticIcon();
      this._initialized = true;
    }
  }

  public ngOnInit() {
    if (this._context) {
      this.context = this._context;
    }
  }

  private _createDynamicIcon(icon: string) {
    const clazz = componentsMap[icon];
    const factory = this._componentFactoryResolver.resolveComponentFactory<any>(
      clazz
    );
    this.viewContainerRef.clear();
    this._iconComponent = this.viewContainerRef.createComponent(factory);
  }

  private _createIcon(icon: string) {
      this._icon = assetsMap[icon];
      if (!this._icon) {
        return;
      }
      if (this._icon && !this._icon['contextDefaults']) {
        this._isStaticIcon = true;
        this.width = this._icon.width;
        this.height = this._icon.height;
        if (this._initialized) {
          this._createStaticIcon();
          this._ref.detectChanges();
        }
      } else {
        this._createDynamicIcon(icon);
      }
  }

  private _createStaticIcon() {
    let svg = (this._icon.css
      ? \\\`<style>\\\${this._icon.css.replace(
        /.((?!})[\\\\S]+?){{uuid}}/g,
        ''
      )}</style>\\\`
      : '') + \\\`<svg><g>\\\${this._icon.svg}</g></svg>\\\`;

    const currentSeed = OneSvgCoreComponent.SEED++;
    svg = svg.replace(/{{uuid}}/g, String(currentSeed));
    svg = this._resolveBasePath(svg);

    const inline = this._renderer.createElement('div');
    inline.innerHTML = svg;
    this._renderer.setAttribute(inline.firstChild as SVGElement, 'class', this._icon.svgHash + '-' + currentSeed);

    const myNode = this.staticSvg.nativeElement;
    if (myNode.firstChild) {
      this._renderer.removeChild(myNode.firstChild.parentNode, myNode.firstChild);
    }
    myNode.appendChild(inline.firstChild);
  }

  private _resolveBasePath(svg: string) {
    const baseUrl = window.location.href.replace(window.location.hash, '');

    return svg
      .replace(/xlink:href=["']#(.*?)["']/g, \\\`xlink: href = "\\\${baseUrl}#$1"\\\`)
      .replace(/url\\\\([']?#(.*?)[']?\\\\)/g, \\\`url(\\\${ baseUrl }#$1)\\\`);
  }

}
`,
  {
    moduleName: '',
    className: '',
    selector: '',
    components: [],
    assets: [],
    pascalCase: (str: string): string => ''
  }
);
