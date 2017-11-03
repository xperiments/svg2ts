import * as fs from 'fs';
import * as path from 'path';

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
