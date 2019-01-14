import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSConfigProject, SVG2TSOutputFile } from '../types';
import { mkdirRecursiveSync } from '../utils/core';
import { styleExtractRegExp } from '../utils/regexp';
import { kebabCase, pascalCase } from '../utils/strings';
import { compactSVG } from '../utils/svg';
import {
  angularDynamicClassTemplate,
  angularDynamicModuleTemplate,
  assetsTemplate,
  svgIconClassTemplate
} from './angular.templates';
import { render as renderTS } from './typescript';

/**
 * Renders the final string output of the asset file
 *
 * @export
 * @param {SVG2TSOutputFile} svgFile
 * @param {SVG2TSCmd} options
 * @returns {string}
 */
function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd | SVG2TSConfigProject): string {
  // delete the contextInterface object from the file
  delete svgFile.contextInterface;

  // generate angular component for file
  return angularDynamicClassTemplate({
    className: pascalCase(svgFile.name),
    selector: `${kebabCase(options.module)}-${kebabCase(svgFile.name)}`
  });
}

function getDynamicSvg(svgFile: SVG2TSOutputFile, options: SVG2TSCmd | SVG2TSConfigProject) {
  // start with the fake "svg" definition
  let svgTemplate = `
      <fvg
        [attr.class]="\\'${svgFile.svgHash}-\\'+context.uuid"
        [attr.width]="width"
        [attr.height]="height"
        [attr.viewBox]="viewBox">
        @@@styles@@@${svgFile.svg}
      </fvg>`
    // replace all svg custom variables
    // with the relatted context mapping
    .replace(/ (\S+?)=['"]{{(.+?)}}['"]/g, ` [attr.$1]="context.$2"`)
    .replace(/{{(.+?)}}/g, '{{context.$1}}')
    .replace(
      '@@@styles@@@',
      !svgFile.css ? '' : `<style>${svgFile.css.replace(/{{(.+?)}}/g, '{{context.$1}}')}</style>`
    );

  svgTemplate = replaceIds(svgTemplate, svgFile.svgHash + '-')
    // replace id="xxx-{{context.uuid}}-yyy"
    // width [attr.id]="'xxx-'+context.uuid+'-yyy'"
    .replace(
      / (\S+?)=['"]([a-zA-Z0-9-_@$:ᗢ#\(\)\.]+?){{(.+?)}}([a-zA-Z0-9-_@$:ᗢ#\(\)\.]+?)['"]/g,
      `  [attr.$1]="\\'$2\\'+$3+\\'$4\\'"`
    )
    // replace all "composed" urls with getURLBase method
    .replace(/([\S]*?)="\\'url\((.*?)\)\\'"/g, `$1="getURLBase(\\\'$2\\\')"`)
    // replace all xlinks to computed attribute
    .replace(/xlink:href=["']#(.*?)(-{{context.uuid}})["']/g, `[attr.xlink:href]="getXlinkBase(\\\'$1\\\')"`)
    // replace all "id" url references with getURLBase
    .replace(/([\S]*?)=["']url\(#(.*?)(-{{context.uuid}})\)["']/g, `[attr.$1]="getURLBase('$2')"`)
    // replace all css url references with getURLBase
    .replace(/:[ ]?url\((#.*?)(-{{context.uuid}})\)/g, `:{{getURLBase(\\\'$1\\\')}}`);

  return compactSVG(svgTemplate.replace(/\s/g, ' '))
    .replace('<fvg', '<svg')
    .replace('</fvg>', '</svg>');
}

function getStaticSvg(svgFile: SVG2TSOutputFile, options: SVG2TSCmd | SVG2TSConfigProject) {
  // if css replace the {{uuid}} string coming from postcss
  // with a unique variable one based on the svg file name
  // and a "reemplazable" -svg2tsIndex
  // .replace(/\{\{uuid\}\}/g, `-®®®`) +
  const css = svgFile.css ? '<style>' + svgFile.css + '</style>' : '';

  const svgTemplate = `<fvg>${css}${svgFile.svg}</fvg>`;

  // prefix all id's with svg2ts- and postfix it
  // with a "reemplazable" -svg2tsIndex
  return replaceIds(
    compactSVG(svgTemplate.replace(/\s/g, ' '))
      .replace('<fvg>', '')
      .replace('</fvg>', ''),
    svgFile.svgHash + '-',
    '{{uuid}}-'
  );
}

function replaceIds(source: string, prefix: string = 'svg2ts-', postFix = '{{context.uuid}}-') {
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

  // content
  let result = ids.reduce((acc, id) => {
    acc = acc
      // prefix document id's
      .replace(new RegExp('["\']' + id + '["\']', 'g'), `"${prefix}${postFix}${id}"`)
      // replace document id refs
      .replace(new RegExp('["\']#' + id + '["\']', 'g'), `"#${prefix}${postFix}${id}"`)
      // replace document id refs in url's
      .replace(new RegExp('url\\(#' + id + '\\)', 'g'), `url(#${prefix}${postFix}${id})`);

    return acc;
  }, source);

  // styles
  const styles = result.match(styleExtractRegExp);
  if (styles) {
    result = styles.reduce((acc, styleDef) => {
      const styleDefSeedIds = ids.reduce((acc, id) => {
        acc = acc.replace(new RegExp('#' + id + '', 'g'), `#${prefix}${postFix}${id}`);
        return acc;
      }, styleDef);

      return acc.replace(styleDef, styleDefSeedIds);
    }, result);
  }

  return result;
}

/**
 * Angular blueprint saveFile method
 *
 * @export
 * @param {SVG2TSCmd} options
 * @returns
 */
export function saveFile(options: SVG2TSCmd) {
  const { output, module } = options;
  return (svgFile: SVG2TSOutputFile) => {
    // Typescript Blueprint

    // determine file path
    const filePath = `${output}${path.sep}${module}${path.sep}assets${path.sep}${svgFile.name}.ts`;
    // create directory path if not exist
    const filePathDirectory = path.dirname(filePath);
    if (!fs.existsSync(filePathDirectory)) {
      mkdirRecursiveSync(filePathDirectory);
    }

    // delete path value from final svg output file
    delete svgFile.path;

    // determine what kind of processing the original
    // svg source needs.
    // this is determined by the "static" or "dynamic"
    // nature of the svg source

    svgFile.svg = svgFile.contextDefaults ? getDynamicSvg(svgFile, options) : getStaticSvg(svgFile, options);

    // delete css value from final svg output file
    delete svgFile.css;

    // save typescript asset file to disc
    fs.writeFileSync(filePath, renderTS(svgFile, options));

    // if the final svg is a "dynamic" one
    // also generate the angular corresponding component
    if (svgFile.contextDefaults) {
      // determine angular component file path
      const angularComponentFilePath = `${output}${path.sep}${module}${path.sep}components${path.sep}${
        svgFile.name
      }.component.ts`;

      // create directory path if not exist
      const angularComponentFilePathDirectory = path.dirname(angularComponentFilePath);
      if (!fs.existsSync(angularComponentFilePathDirectory)) {
        mkdirRecursiveSync(angularComponentFilePathDirectory);
      }

      // write angular component to disc
      fs.writeFileSync(angularComponentFilePath, render(svgFile, options));
    }
  };
}

/**
 * Generates the angular blueprint index file
 *
 * @export
 * @param {SVG2TSCmd} options
 * @param {Array<SVG2TSOutputFile>} files
 */
export function generateIndexFile(options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) {
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
      moduleName: options.module,
      className: `${pascalCase(options.module)}`,
      pascalCase: pascalCase,
      selector: `${kebabCase(options.module)}`
    })
  );

  fs.writeFileSync(
    `${options.output}${path.sep}${options.module}${path.sep}components${path.sep}assets.ts`,
    assetsTemplate({ assets: files.map(file => pascalCase(file.name)) })
  );

  // generate types file
  fs.writeFileSync(
    `${options.output}${path.sep}${options.module}${path.sep}types.d.ts`,
    `interface SVG2TSDimensions {
  height?: number | undefined;
  minx?: number | undefined;
  miny?: number | undefined;
  width?: number | undefined;
}

interface SVG2TSFile {
  contextDefaults?: { [key: string]: string | number } | undefined;
  css?: string;
  height?: string | undefined;
  name: string;
  svg: string;
  svgHash: string;
  viewBox?: SVG2TSDimensions | undefined;
  width?: string | undefined;
}
    `
  );
}

export function generateDotFile(options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) {
  const filePath = `${options.output}${path.sep}${options.module}${path.sep}${options.module}.svgts`;

  const exports = files.map(file => file.name);

  fs.writeFileSync(filePath, JSON.stringify({ exports, files, module: options.module }, null, 2), 'utf-8');
}
