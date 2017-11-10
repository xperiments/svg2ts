import * as fs from 'fs';
import * as path from 'path';

import { SVG2TSCmd, SVG2TSOutputFile } from '../types';
import { capitalize, toCamelCase } from '../utils/strings';
import { compactSVG, generateTSInterface } from '../utils/svg';
import { mkdirRecursiveSync, printObj } from '../utils/core';

export function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd) {
    const contextInterface = generateTSInterface(svgFile.contextInterface);

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

export function saveFile(options: SVG2TSCmd, blueprint: string) {
    const { output } = options;
    return (svgFile: SVG2TSOutputFile) => {
        const filePath = output + path.sep + svgFile.name + '.ts';
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            mkdirRecursiveSync(destBase);
        }
        delete svgFile.path;
        svgFile.svg = compactSVG(svgFile.svg);
        fs.writeFileSync(filePath, render(svgFile, options));
    };
}

export function generateIndexFile(
    options: SVG2TSCmd,
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
    mkdirRecursiveSync(options.output + path.sep);
    fs.writeFileSync(options.output + path.sep + 'index.ts', indexFile);
}
