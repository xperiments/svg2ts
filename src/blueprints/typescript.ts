import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSOutputFile } from '../types';
import {
    printObj,
    capitalize,
    toCamelCase,
    minifySvg,
    mkdirSyncRecursive
} from '../utils';
import { Svg2TsCmd } from '../index';

export function render(svgFile: SVG2TSOutputFile) {
    const contextInterface =
        svgFile.contextInterface &&
        svgFile.contextInterface.toString().replace(/:/g, '?:');
    if (contextInterface) {
        delete svgFile.contextInterface;
    }
    // prettier-ignore
    const interfaceOutput =
        contextInterface
        ? `export interface ${capitalize(toCamelCase(svgFile.name))}Context ${contextInterface};`
        : '';
    // prettier-ignore
    return `${interfaceOutput}export const ${capitalize(toCamelCase(svgFile.name))} = ${printObj(svgFile)};`;
}
export function saveFile(output: string, blueprint: string) {
    return (svgFile: SVG2TSOutputFile) => {
        const filePath = output + path.sep + svgFile.name + '.ts';
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            mkdirSyncRecursive(destBase);
        }
        delete svgFile.path;
        svgFile.file = minifySvg(svgFile.file);

        fs.writeFileSync(filePath, render(svgFile));
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
    fs.writeFileSync(options.output + path.sep + 'index.ts', indexFile);
}
