import * as fs from 'fs';
import * as path from 'path';
import * as postcss from 'postcss';
import * as prefixer from 'postcss-prefix-selector';
import { SVG2TSOutputFile } from '../types';
import {
    printObj,
    capitalize,
    toCamelCase,
    minifySvg,
    mkdirSyncRecursive,
    toKebabCase
} from '../utils';
import { Svg2TsCmd } from '../index';

export function render(svgFile: SVG2TSOutputFile, options: Svg2TsCmd) {
    const contextInterface =
        svgFile.contextInterface &&
        svgFile.contextInterface.toString().replace(/:/g, '?:');
    if (contextInterface) {
        delete svgFile.contextInterface;
    }

    svgFile.svg = svgFile.svg
        .replace(
            /(<style(.+?)?>)([\s\S]+?)(<\/style>)/g,
            (match, $1, $2, $3, $4) => {
                const namespacedCss = postcss()
                    .use(
                        prefixer({
                            prefix: `.${toKebabCase(options.module)}-{{uuid}}`
                        })
                    )
                    .process($3.replace(/{{/g, '_oo_').replace(/}}/g, '_OO_'))
                    .css;
                return `${$1}${namespacedCss}${$4}`;
            }
        )
        .replace(/_oo_/g, '{{')
        .replace(/_OO_/g, '}}');

    // prettier-ignore
    const interfaceOutput =
        contextInterface
        ? `export interface ${capitalize(toCamelCase(svgFile.name))}Context ${contextInterface};`
        : '';
    // prettier-ignore
    return `${interfaceOutput}export const ${capitalize(toCamelCase(svgFile.name))} = ${printObj(svgFile)};`;
}
export function saveFile(options: Svg2TsCmd, blueprint: string) {
    const { output } = options;
    return (svgFile: SVG2TSOutputFile) => {
        const filePath = output + path.sep + svgFile.name + '.ts';
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            mkdirSyncRecursive(destBase);
        }
        delete svgFile.path;
        svgFile.svg = minifySvg(svgFile.svg);

        fs.writeFileSync(filePath, render(svgFile, options));
    };
}
export function generateIndexFile(
    options: Svg2TsCmd,
    files: SVG2TSOutputFile[]
) {
    const indexFile = files
        .map((file: SVG2TSOutputFile) => {
            const svgObjectName = capitalize(toCamelCase(file.name));
            const context = file.contextDefaults
                ? `, ${svgObjectName}Context`
                : '';
            return `export { ${svgObjectName}${context} } from './${file.name}';`;
        })
        .join('\n');
    mkdirSyncRecursive(options.output + path.sep);
    fs.writeFileSync(options.output + path.sep + 'index.ts', indexFile);
}
