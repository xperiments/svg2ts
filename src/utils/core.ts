import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSSourceFile } from '../types';
import { HashID } from './hash-id';
import { lineBreaksRegExp } from './regexp';
import { extractSvgInlineStyles, removeSvgInlineStyles } from './svg';

const burnedHashes: Array<string> = [];

export function sanitizeFileName(fileName: string, replacement = '', truncate = 255, prefix = 'svg2ts') {
  // https://github.com/parshap/node-sanitize-filename/blob/master/index.js
  const illegalRe = /[\/\?<>\\:\*\|":]/g;
  const illegalVarNamesRe = /["<>#%\{\}\|\\\^~\[\]`;\?:@=&]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[\. ]+$/;

  return path
    .basename(fileName)
    .replace('.svg', '')
    .replace(illegalRe, replacement)
    .replace(illegalVarNamesRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement)
    .replace(/(^\d)/, `${prefix}-$1`)
    .substring(0, truncate);
}

export function loadSvgFile() {
  return (fileName: string): SVG2TSSourceFile => {
    let svg = fs.readFileSync(fileName, 'utf8').replace(lineBreaksRegExp, '');
    const svgHash = `ᗢ${HashID.generateUnique(burnedHashes)}`;
    burnedHashes.push(svgHash);

    let css = '';
    try {
      css = extractSvgInlineStyles(svg, svgHash);
      svg = removeSvgInlineStyles(svg);
    } catch (e) {
      svg = '';
      console.log(`[svg2ts] \x1b[31mOmitting file: \x1b[33m${fileName}\x1b[31m [Invalid Css Contents] \x1b[0m`);
    }

    return {
      path: fileName,
      name: sanitizeFileName(fileName),
      svg,
      svgHash,
      css
    };
  };
}

export function printObj(obj: any, tab: string = ''): string {
  const isArray = Array.isArray(obj);
  let str = isArray ? tab + '[' : tab + '{';
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      const val1 = obj[prop];
      let val2 = '';
      const type = Object.prototype.toString.call(val1);
      switch (type) {
        case '[object Array]':
        case '[object Object]':
          val2 = printObj(val1);
          break;
        case '[object String]':
          val2 = "'" + val1 + "'";
          break;
        default:
          val2 = val1;
      }
      str += tab + prop + ': ' + val2 + ',';
    }
  }
  // remove extra comma for last property
  str = str.substring(0, str.length - 1);
  return isArray ? str + ']' : str + '}';
}

export function walkSync(dir: string, filelist: Array<string> = []): Array<string> {
  if (dir[dir.length - 1] !== '/') {
    dir = dir.concat('/');
  }
  const files = fs.readdirSync(dir);
  files.forEach((file: string) => {
    if (fs.statSync(dir + file).isDirectory()) {
      filelist = walkSync(dir + file + '/', filelist);
    } else {
      filelist.push(dir + file);
    }
  });
  return filelist;
}

export function mkdirRecursiveSync(directory: string) {
  let absolutePrefix = path.isAbsolute(directory) ? '/' : '';
  const pathSegments: Array<string> = directory.replace(/\/$/, '').split('/');

  for (var i = 1; i <= pathSegments.length; i++) {
    const segment = pathSegments.slice(0, i).join('/');
    !fs.existsSync(absolutePrefix + segment) ? fs.mkdirSync(absolutePrefix + segment) : null;
  }
}

export function dotObject(path: string, obj: any = {}, value: any = null) {
  const result = path
    .split('.')
    .slice(1)
    .reduce((parent, key, index, arr) => {
      parent[key] =
        index === arr.length - 1
          ? typeof value === 'object'
            ? Object.assign(parent[key], value)
            : value
          : parent[key] || {};
      return parent[key];
    }, obj);
  return value ? obj : result;
}

export function tsc<T>(template: string, context: T): (context: T) => string {
  const keys = Object.keys(context),
    replacer = /@{[\s]?([\s\S]*)[\s]?}/;
  while (replacer.test(template)) {
    template = template.replace(replacer, '${$1}');
  }
  const fnTemplate = 'const {' + keys + '}=context; return`' + template + '`';
  return new Function('context', fnTemplate) as (context: T) => string;
}

export function hashCode(s: string) {
  var h = 0,
    l = s.length,
    i = 0;
  if (l > 0) {
    while (i < l) {
      h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    }
  }
  return h;
}

export function deepMerge<Structure extends { [key: string]: any }>(target: Structure, source: Structure): Structure {
  // tslint:disable-next-line:prefer-object-spread
  const output: any = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key: any) => {
      const sourceKey = source[key];
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
