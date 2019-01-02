import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSOutputFile, SVG2TSSourceFile } from '../types';
import { HashID } from './hash-id';
import { lineBreaksRegExp } from './regexp';
import { extractSvgInlineStyles, removeSvgInlineStyles } from './svg';

const burnedHashes: Array<string> = [];

export function loadSvgFile(options: SVG2TSCmd) {
  return (fileName: string): SVG2TSSourceFile => {
    const svg = fs.readFileSync(fileName, 'utf8').replace(lineBreaksRegExp, '');
    const svgHash = `ᗢ${HashID.generateUnique(burnedHashes)}`;
    burnedHashes.push(svgHash);
    return {
      path: fileName,
      name: path.basename(fileName).replace('.svg', ''),
      svg: removeSvgInlineStyles(svg),
      svgHash,
      css: extractSvgInlineStyles(svg, svgHash)
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
  var path = directory.replace(/\/$/, '').split('/');

  for (var i = 1; i <= path.length; i++) {
    var segment = path.slice(0, i).join('/');
    !fs.existsSync(segment) ? fs.mkdirSync(segment) : null;
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

export function generateDotFile(options: SVG2TSCmd, files: Array<SVG2TSOutputFile>) {
  const filePath = `${options.output}${path.sep}${options.module}${path.sep}${options.module}.svgts`;

  const exports = files.map(file => file.name);

  fs.writeFileSync(filePath, JSON.stringify({ exports, files, module: options.module }, null, 2), 'utf-8');
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
