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
  getNgSvgTemplate,
  getSVGViewbox
} from '../assets';

@Component({
  selector: '@{selector}',
  template: getNgSvgTemplate(@{className}),
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit {
  static UUID = 0;
  private _context:@{className}Context = @{className}.contextDefaults;
  @Input() width:number = @{className}.width;
  @Input() height:number = @{className}.height;
  @Input() viewBox:string = getSVGViewbox(@{className}.viewBox);
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
  updateContext(ctx:any) {
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
import  {
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
  imports:[CommonModule],
  entryComponents: [...comps ]
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
  ViewContainerRef
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
  <ng-container *ngIf="!icon.contextDefaults">
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component {
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
    return this._icon;
  }

  sanitizedFile: SafeHtml;
  private _icon: any;
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
      : this._icon.viewBox
        ? [
            this._icon.viewBox.minx,
            this._icon.viewBox.miny,
            this._icon.viewBox.width,
            this._icon.viewBox.height
          ].join(' ')
        : [0, 0, this._icon.width, this._icon.height].join(' ');
  }

  private createIcon(icon: string) {
    this._icon = assetsMap[icon];
    if (!this._icon['contextDefaults']) {
      this.createStaticIcon();
    } else {
      this.createDynamicIcon(icon);
    }
  }

  private createStaticIcon() {
    this.width = this._icon.width;
    this.height = this._icon.height;
    const svg =
      (this._icon.css
        ? \\\`<style>\\\${this._icon.css.replace(
            /\\\.((?!})[\\\\S]+?){{uuid}}/g,
            ''
        )}</style>\\\`
        : '') + \\\`\\\${this._icon.svg}\\\`;

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
