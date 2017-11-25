import { tsc } from '../utils/core';
import { SVG2TSOutputFile } from '../types';

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
  getSVGViewbox
} from '../assets';

@Component({
  selector: '@{selector}',
  template: @{className}.svg,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit {
  static UUID = 0;
  private _context: @{className}Context = @{className}.contextDefaults;
  @Input() width: number | string = @{className}.width;
  @Input() height: number | string = @{className}.height;
  @Input() viewBox: string = getSVGViewbox(@{className}.viewBox);
  @Input()
  set context(ctx: @{className}Context) {
    this.updateContext(ctx);
  }
  get context() {
      return this._context;
  }
  constructor(private ref: ChangeDetectorRef) {}
  ngOnInit() {
    this.context.uuid = @{className}Component.UUID++;
  }
  updateContext(ctx: any) {
    this._context = Object.assign(
      {},
      this._context ? this._context : @{className}.contextDefaults,
      ctx
    );
    this.ref.markForCheck();
  }
}
`,
    { className: '', selector: '' }
);

export interface AngularDynamicModuleTemplate {
    moduleName: string;
    components: string[];
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
    components: { component: string; name: string }[];
    assets: string[];
    pascalCase: (str: string) => string;
}
export const svgIconClassTemplate = tsc<SvgIconClassTemplate>(
    `
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  Input,
  ViewChild,
  ViewContainerRef,
  OnInit
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  <ng-container *ngIf="!iconAsset.contextDefaults">
    <svg
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="getViewBox()"
      [innerHTML] ="sanitizedFile"
      [attr.class] ="templateClass"
      >
    </svg>
  </ng-container>
  <ng-template #dynSvg></ng-template>\\\`,
  styles: [':host{ display: inline-block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit {
  private _context: any;
  @ViewChild('dynSvg', { read: ViewContainerRef })
  viewContainerRef;
  @Input() width = 0;
  @Input() height = 0;
  @Input() viewBox = '';
  @Input()
  set context(ctx) {
    this._context = ctx;
    if (this._iconComponent) {
      this._iconComponent.instance.context = ctx;
      this.ref.markForCheck();
    }
  }
  @Input()
  set icon(icon: string) {
    this.createIcon(icon);
  }
  get icon() {
    return this.iconAsset;
  }

  sanitizedFile: SafeHtml;
  iconAsset: any;
  private _iconComponent;

  constructor(
    private ref: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  ngOnInit() {
    if (this._context) {
      this.context = this._context;
    }
  }

  getViewBox() {
    return this.viewBox !== ''
      ? this.viewBox
      : this.iconAsset.viewBox
        ? [
            this.iconAsset.viewBox.minx,
            this.iconAsset.viewBox.miny,
            this.iconAsset.viewBox.width,
            this.iconAsset.viewBox.height
          ].join(' ')
        : [0, 0, this.iconAsset.width, this.iconAsset.height].join(' ');
  }

  private createIcon(icon: string) {
      this.iconAsset = assetsMap[icon];
      if (!this.iconAsset) {
        return;
      }
      if (this.iconAsset && !this.iconAsset['contextDefaults']) {
        this.createStaticIcon();
      } else {
        this.createDynamicIcon(icon);
      }
  }

  private createStaticIcon() {
    this.width = this.iconAsset.width;
    this.height = this.iconAsset.height;
    const svg = (
      (this.iconAsset.css
        ? \\\`<style>\\\${this.iconAsset.css.replace(
            /.((?!})[\\\\S]+?){{uuid}}/g,
            ''
        )}</style>\\\`
        : '') + \\\`\\\${this.iconAsset.svg}\\\`
    ).replace(/<svg.+?>([\\\\s\\\\S]+?)<\\\\/svg>/g, '$1');

    this.sanitizedFile = this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private createDynamicIcon(icon: string) {
    const clazz = componentsMap[icon];
    const factory = this.componentFactoryResolver.resolveComponentFactory<any>(
      clazz
    );
    this._iconComponent = this.viewContainerRef.createComponent(factory);
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
