import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSOutputFile } from '../types';
import { mkdirRecursiveSync } from '../utils/core';
import { styleExtractRegExp } from '../utils/regexp';
import { kebabCase, pascalCase } from '../utils/strings';
import { compactSVG } from '../utils/svg';
import { angularDynamicClassTemplate, angularDynamicModuleTemplate, svgIconClassTemplate } from './angular.templates';
import { render as renderTS } from './typescript';

function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd): string {
  delete svgFile.contextInterface;
  return angularDynamicClassTemplate({
    className: pascalCase(svgFile.name),
    selector: `${kebabCase(options.module)}-${kebabCase(svgFile.name)}`
  });
}

function getSvgAOT(svgFile: SVG2TSOutputFile, options: SVG2TSCmd) {
  let svgTemplate = `
      <fvg
        [attr.class]="\\'${kebabCase(options.module)}-\\'+context.uuid"
        [attr.width]="width"
        [attr.height]="height"
        [attr.viewBox]="viewBox">
        @@@styles@@@${svgFile.svg}
      </fvg>`
    .replace(/ (\S+?)=['"]{{(.+?)}}['"]/g, ` [attr.$1]="context.$2"`)
    .replace(/{{(.+?)}}/g, '{{context.$1}}')
    .replace(
      '@@@styles@@@',
      !svgFile.css ? '' : `<style>${svgFile.css.replace(/{{(.+?)}}/g, '{{context.$1}}')}</style>`
    );

  svgTemplate = replaceIds(svgTemplate)
    .replace(/xlink:href=["']#(.*?)(-{{context.uuid}})["']/g, `[attr.xlink:href]="getXlinkBase(\\\'$1\\\')"`)
    .replace(/([\S]*?)=["']url\(#(.*?)(-{{context.uuid}})\)["']/g, `[attr.$1]="getURLBase(\\\'$2\\\')"`)
    .replace(/:[ ]?url\((#.*?)(-{{context.uuid}})\)/g, `:{{getURLBase(\\\'$1\\\')}}`);

  return compactSVG(svgTemplate.replace(/\s/g, ' '))
    .replace('<fvg', '<svg')
    .replace('</fvg>', '</svg>');
}

function getStaticSvgAOT(svgFile: SVG2TSOutputFile, options: SVG2TSCmd) {
  const svgTemplate = `
      <fvg>@@@styles@@@${svgFile.svg}</fvg>`
    .replace(/ (\S+?)=['"]{{(.+?)}}['"]/g, ` [attr.$1]="context.$2"`)
    .replace(/{{(.+?)}}/g, '{{context.$1}}')
    .replace(
      '@@@styles@@@',
      !svgFile.css ? '' : `<style>${svgFile.css.replace(/{{(.+?)}}/g, '{{context.$1}}')}</style>`
    );
  return compactSVG(svgTemplate.replace(/\s/g, ' '))
    .replace('<fvg>', '')
    .replace('</fvg>', '');
}

export function saveFile(options: SVG2TSCmd, blueprint: string) {
  const { output, module } = options;
  return (svgFile: SVG2TSOutputFile) => {
    // TS
    const filePath = `${output}${path.sep}${module}${path.sep}assets${path.sep}${svgFile.name}.ts`;
    const destBase = path.dirname(filePath);
    if (!fs.existsSync(destBase)) {
      mkdirRecursiveSync(destBase);
    }
    delete svgFile.path;
    svgFile.svg = svgFile.contextDefaults ? getSvgAOT(svgFile, options) : getStaticSvgAOT(svgFile, options);
    delete svgFile.css;

    fs.writeFileSync(filePath, renderTS(svgFile, options));

    if (svgFile.contextDefaults) {
      const ngFilePath = `${output}${path.sep}${module}${path.sep}components${path.sep}${svgFile.name}.component.ts`;
      const destBase = path.dirname(ngFilePath);
      if (!fs.existsSync(destBase)) {
        mkdirRecursiveSync(destBase);
      }
      fs.writeFileSync(ngFilePath, render(svgFile, options));
    }
  };
}

export function generateIndexFile(options: SVG2TSCmd, files: Array<SVG2TSOutputFile>) {
  // generate an index.ts of svg's
  const indexFileExports = files
    .map((file: SVG2TSOutputFile) => {
      const svgObjectName = pascalCase(file.name);
      const context = file.contextDefaults ? `, ${svgObjectName}Context` : '';
      return `export { ${svgObjectName}${context} } from './${file.name}';`;
    })
    .join('\n');

  const indexFileType = `export type ${pascalCase(options.module)}Asset = ${files
    .map((file: SVG2TSOutputFile) => {
      return `'${file.name}'`;
    })
    .join('|')};`;

  const indexFile = indexFileExports.concat(indexFileType).concat(`
    export function getSVGViewBox(viewBox: any): string {
      return [viewBox.minx, viewBox.miny, viewBox.width, viewBox.height].join(' ');
    }
  `);

  fs.writeFileSync(`${options.output}${path.sep}${options.module}${path.sep}assets${path.sep}index.ts`, indexFile);

  const components = files.filter(file => file.contextDefaults);
  const namedComponents = components.map(_ => pascalCase(_.name));
  const moduleName = pascalCase(options.module);

  const componentsIndex = components
    .map(component => {
      return `export { ${pascalCase(component.name)}Component } from './${component.name}.component';`;
    })
    .concat(`export {${pascalCase(moduleName)}Component} from './${options.module}.component'`)
    .join('\n');

  const componentsIndexDir = `${options.output}${path.sep}${options.module}${path.sep}components`;

  if (!fs.existsSync(componentsIndexDir)) {
    mkdirRecursiveSync(componentsIndexDir);
  }
  // generate an index.ts of components
  fs.writeFileSync(`${componentsIndexDir}${path.sep}index.ts`, componentsIndex);

  // generate the module.ts file
  fs.writeFileSync(
    `${options.output}${path.sep}${options.module}${path.sep}${kebabCase(options.module)}.module.ts`,
    angularDynamicModuleTemplate({
      components: namedComponents.concat(pascalCase(moduleName)),
      moduleName
    })
  );

  fs.writeFileSync(
    `${options.output}${path.sep}${options.module}${path.sep}components${path.sep}${kebabCase(
      options.module
    )}.component.ts`,
    svgIconClassTemplate({
      assets: files.map(file => pascalCase(file.name)),
      components: components.map(component => ({
        component: pascalCase(component.name),
        name: component.name
      })),
      moduleName,
      className: `${pascalCase(options.module)}`,
      pascalCase: pascalCase,
      selector: `${kebabCase(options.module)}`
    })
  );
}

function replaceIds(source: string) {
  const seed = '-{{context.uuid}}';
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
  const prefixed = `svg2ts-`;
  // content
  let result = ids.reduce((acc, id) => {
    acc = acc
      // prefix document id's
      .replace(new RegExp('["\']' + id + '["\']', 'g'), `"${prefixed}${id}${seed}"`)
      // replace document id refs
      .replace(new RegExp('["\']#' + id + '["\']', 'g'), `"#${prefixed}${id}${seed}"`)
      // replace document id refs in url's
      .replace(new RegExp('url\\(#' + id + '\\)', 'g'), `url(#${prefixed}${id}${seed})`);

    return acc;
  }, source);

  // styles
  const styles = result.match(styleExtractRegExp);
  if (styles) {
    result = styles.reduce((acc, styleDef) => {
      const styleDefSeedIds = ids.reduce((acc, id) => {
        acc = acc.replace(new RegExp('#' + id + '', 'g'), `#${prefixed}${id}${seed}`);
        return acc;
      }, styleDef);

      return acc.replace(styleDef, styleDefSeedIds);
    }, result);
  }

  return result;
}
