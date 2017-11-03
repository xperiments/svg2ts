import * as fs from 'fs';
import * as path from 'path';

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
        console.log('->', tagInner, '<-');
        return '<' + tagInner + '>';
    });
    return source.trim();
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
