import { tsc } from '../utils/core';

export interface AngularDynamicClassTemplate {
  className: string;
  selector: string;
}

export const angularDynamicClassTemplate = tsc<AngularDynamicClassTemplate>(
  `
import {
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
export class @{className}Component implements OnInit {
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

  public getURLBase(value) {
    return \\\`url('\\\${this.baseUrl}#\\\${value}-\\\${this.context.uuid}')\\\`;
  }

  public getXlinkBase(value) {
    return \\\`\\\${ this.baseUrl }#\\\${ value }-\\\${this.context.uuid}\\\`;
  }

  public ngOnInit() {
    this.baseUrl = window.location.href.replace(window.location.hash, '');
    this.context.uuid = @{className}Component.UUID++;
  }

  public updateContext(ctx: any) {
    this._context = Object.assign(
      {},
      this._context ? this._context : @{className}.contextDefaults,
      ctx
    );
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
  `
import { NgModule } from '@angular/core';
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

export interface SvgIconClassTemplate {
  moduleName: string;
  className: string;
  selector: string;
  components: Array<{ component: string; name: string }>;
  assets: Array<string>;
  pascalCase: (str: string) => string;
}
export const svgIconClassTemplate = tsc<SvgIconClassTemplate>(
  `
export interface SVG2TSDimensions {
  height?: number | undefined;
  minx?: number | undefined;
  miny?: number | undefined;
  width?: number | undefined;
}

export interface SVG2TSFile {
  contextDefaults?: { [key: string]: string | number } | undefined;
  css?: string;
  height?: string | undefined;
  name: string;
  svg: string;
  viewBox?: SVG2TSDimensions | undefined;
  width?: string | undefined;
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

import {
  @{assets.join(\',\\n  \')}
} from '../assets';

@{
    components.map((component)=>{
        return \`import { \${component.component}Component } from './\${component.name}.component';\`;
    }).join('\\n')
}

const assetsMap = {
@{
    assets.map((asset)=>{
        return \`[\${asset}.name]: \${asset}\`;
    }).join(',\\n  ')
}
};

const componentsMap = {
@{
    components.map((component)=>{
        return \`[\${component.component}.name]: \${component.component}Component\`;
    }).join(',\\n  ')
}
};


@Component({
  selector: '@{selector}',
  template: \\\`
  <ng-container *ngIf="!iconFile.contextDefaults">
    <svg
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="getViewBox()"
      >
    </svg>
  </ng-container>
  <ng-template #dynSvg></ng-template>\\\`,
  styles: [':host{ display: inline-block; position: relative; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit, AfterViewInit {
  private static SEED = 0;

  @Input() public height: string | number = 0;
  @Input() public viewBox = '';
  @ViewChild('dynSvg', { read: ViewContainerRef }) public viewContainerRef;
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
  private _iconComponent;
  private _isStaticIcon = false;

  constructor(
    private _ref: ChangeDetectorRef,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _elementRef: ElementRef
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
      } else {
        this._createDynamicIcon(icon);
      }
  }

  private _createStaticIcon() {
    const svg =
      this._replaceIds((this._icon.css
        ? \\\`<style>\\\${this._icon.css.replace(
            /.((?!})[\\\\S]+?){{uuid}}/g,
            ''
        )}</style>\\\`
        : '') + \\\`<svg><g>\\\${this._resolveBasePath(this._icon.svg)}</g></svg>\\\`, @{className}Component.SEED++);

    const inline = document.createElement('div');
    inline.innerHTML = svg;

    this._elementRef.nativeElement.querySelector('svg').appendChild(inline.firstChild);
  }

  private _replaceIds(source: string, seed: number) {
    const seedPostFix = '-' + seed;
    let ids: Array<string> = [];
    const foundIds = source.match(/id="(.*?)"/g);
    if (foundIds) {
      ids = foundIds.map(m => {
        const a = m.match(/id="(.*?)"/);
        if (a) {
          return a[1];
        }
        return '';
      });
    }
    const prefixed = \\\`svg2ts-\\\`;
    // content
    let result = ids.reduce((acc, id) => {
      acc = acc
      // prefix document id's
      .replace(new RegExp('["\\\\']' + id + '["\\\\']', 'g'), \\\`"\\\${prefixed}\\\${id}"\\\`)
      // replace document id refs
      .replace(new RegExp('["\\\\']#' + id + '["\\\\']', 'g'), \\\`"#\\\${prefixed}\\\${id}"\\\`)
      // replace document id refs in url's
      .replace(new RegExp('\\\\(#' + id + '\\\\)', 'g'), \\\`(#\\\${prefixed}\\\${id}")\\\`);

      return acc;
    }, source);

    // styles
    const styles = result.match(/(<style(.+?)?>)([\\\\s\\\\S]+?)<\\\\/style>/g);
    if (styles) {
      result = styles.reduce((acc, styleDef) => {
        const styleDefSeedIds = ids.reduce((styleDefSeedAcc, id) => {
          styleDefSeedAcc = styleDefSeedAcc.replace(new RegExp('#' + id + '', 'g'), \\\`#\\\${prefixed}\\\${id}\\\${seedPostFix}\\\`);
          return styleDefSeedAcc;
        }, styleDef);

        return acc.replace(styleDef, styleDefSeedIds);
      }, result);
    }

    return result;
  }

  private _resolveBasePath(svg: string) {
    const baseUrl = window.location.href.replace(window.location.hash, '');

    return svg
      .replace(/xlink:href=["']#(.*?)["']/g, \\\`xlink:href="\\\${baseUrl}#\\\$1"\\\`)
      .replace(/url\\\\([']?#(.*?)[']?\\\\)/g, \\\`url(\\\${baseUrl}#\\\$1)\\\`);
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
