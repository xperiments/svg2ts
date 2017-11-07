import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSSourceFile, SVG2TSOutputFile } from './types';

export function minifySvg(source: string): string {
    source = source.replace(/<svg.[^>]*>/g, '').replace(/<\/svg>/gi, '');
    const styleRegExp = /(<style(([^>][\s\S])+?)?>)([\s\S]+?)(<\/style>)/g;
    return minifyXML(
        source.replace(styleRegExp, (match, $1, $2, $3, $4, $5) => {
            return `${$1}${minifyCss($4)}${$5}`;
        })
    );
}
function minifyCss(source: string): string {
    return source
        .replace(/\/\*.*\*\/|\/\*[\s\S]*?\*\/|\n|\t|\v|\s{2,}/g, '')
        .replace(/\s*\{\s*/g, '{')
        .replace(/\s*\}\s*/g, '}')
        .replace(/\s*\:\s*/g, ':')
        .replace(/\s*\;\s*/g, ';')
        .replace(/\s*\,\s*/g, ',')
        .replace(/\s*\~\s*/g, '~')
        .replace(/\s*\>\s*/g, '>')
        .replace(/\s*\+\s*/g, '+')
        .replace(/\s*\!\s*/g, '!');
}

function minifyXML(source: string): string {
    source = source
        .replace(/\<\!--\s*?[^\s?\[][\s\S]*?--\>/g, '')
        .replace(/\>\s*\</g, '><');
    source = source.replace(/<([^>]+)>/g, function(str, tagInner) {
        tagInner = tagInner
            .replace(/^ +| +$/g, '') // Not .trim() that removes \f.
            .replace(/(?: *\/ +| +\/ *)/g, '/') // Remove whitespaces in </ p> or <br />
            .replace(/ *= */g, '=')
            .replace(/( +)/g, ' ');
        return '<' + tagInner + '>';
    });
    return source.trim();
}

export function removeDefaultsFromVars(source: string): string {
    return source.replace(/\{{(.+?)\|(.+?)}}/g, '{{$2}}');
}
export function toCamelCase(str: string) {
    return str
        .replace(/[\s|_|-](.)/g, function($1) {
            return $1.toUpperCase();
        })
        .replace(/[\s|_|-]/g, '')
        .replace(/^(.)/, function($1) {
            return $1.toLowerCase();
        });
}
export function toKebabCase(str: string) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([^a-zA-Z])/g, '-')
        .toLowerCase();
}
export function capitalize(str: string) {
    return str[0].toUpperCase() + str.slice(1);
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

export function walkSync(dir: string, filelist: string[] = []): string[] {
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

export function mkdirSyncRecursive(directory: string) {
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
