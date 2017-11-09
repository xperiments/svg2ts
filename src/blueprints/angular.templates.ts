import { tsc } from '../utils';
import { SVG2TSOutputFile } from '../types';

export interface AngularDynamicClassTemplate {
    className: string;
    selector: string;
}
export const angularDynamicClassTemplate = tsc<
    AngularDynamicClassTemplate
>(
    `import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { @{className}, @{className}Context, getNgSvgTemplate, getSVGViewbox } from '../assets';

@Component({
  selector: '@{selector}',
  template: getNgSvgTemplate(@{className}),
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class @{className}Component implements OnInit{
  static UUID = 0;
  private _context:@{className}Context = @{className}.contextDefaults;
  @Input() width:number = @{className}.width;
  @Input() height:number = @{className}.height;
  @Input() viewBox:string = getSVGViewbox(@{className}.viewBox);
  @Input()
  set context(ctx: @{className}Context) {
    this._context = Object.assign(
      {},
      this._context ? this._context : @{className}.contextDefaults,
      ctx
    );
  }
  get context() {
      return this._context;
  }
  ngOnInit() {
    this.context.uuid = @{className}Component.UUID++;
  }
}
`,
    { className: '', selector: '' }
);

export interface AngularDynamicModuleTemplate {
    moduleName: string;
    components: string[];
}
export const angularDynamicModuleTemplate = tsc<
    AngularDynamicModuleTemplate
>(
    `import { NgModule } from '@angular/core';

import  {
    @{
        components.map((component)=>{
            return \`@{component}Component\`;
        }).join(', ')
    }
} from './components'

const comps = [
    @{
        components.map((component)=>{
            return \`@{component}Component\`;
        }).join(', ')
    }
];

@NgModule({
  declarations: [ ...comps ],
  exports: [ ...comps ]
})
export class @{moduleName}Module { }
`,
    {
        moduleName: '',
        components: []
    }
);
