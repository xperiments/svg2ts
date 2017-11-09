import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSOutputFile } from '../types';
import {
    capitalize,
    toCamelCase,
    minifySvg,
    mkdirSyncRecursive,
    toKebabCase
} from '../utils';
import {
    angularDynamicClassTemplate,
    angularDynamicModuleTemplate
} from './angular.templates';
import { render as renderTS } from './typescript';
import { Svg2TsCmd } from '../index';

const separator = path.sep;

function render(svgFile: SVG2TSOutputFile): string {
    const contextInterface = svgFile.contextInterface;
    if (contextInterface) {
        delete svgFile.contextInterface;
    }
    return angularDynamicClassTemplate({
        className: capitalize(toCamelCase(svgFile.name)),
        selector: 'svg-x--' + toKebabCase(svgFile.name)
    });
}
export function saveFile(options: Svg2TsCmd, blueprint: string) {
    const { output, module } = options;
    return (svgFile: SVG2TSOutputFile) => {
        // TS
        const filePath = `${output}${separator}${module}${separator}assets${separator}${svgFile.name}.ts`;
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            mkdirSyncRecursive(destBase);
        }
        delete svgFile.path;
        svgFile.svg = minifySvg(svgFile.svg);

        fs.writeFileSync(filePath, renderTS(svgFile, options));

        if (svgFile.contextDefaults) {
            const ngFilePath = `${output}${separator}${module}${separator}components${separator}${svgFile.name}.component.ts`;
            const destBase = path.dirname(ngFilePath);
            if (!fs.existsSync(destBase)) {
                mkdirSyncRecursive(destBase);
            }
            fs.writeFileSync(ngFilePath, render(svgFile));
        }
    };
}

export function generateIndexFile(
    options: Svg2TsCmd,
    files: SVG2TSOutputFile[]
) {
    const tpls = '`';

    // generate an index.ts og svg's
    const indexFile = files
        .map((file: SVG2TSOutputFile) => {
            const svgObjectName = capitalize(toCamelCase(file.name));
            const context = file.contextDefaults
                ? `, ${svgObjectName}Context`
                : '';
            return `export { ${svgObjectName}${context} } from './${file.name}';`;
        })
        .join('\n').concat(`
            export function getNgSvgTemplate(svg: any, context: string = 'context') {
              return \`<svg [attr.class]="'${options.module}-'+context.uuid" [attr.width]="width" [attr.height]="height" [attr.viewBox]="viewBox">\${svg.svg}</svg>\`
                .replace(/ (\\S+?)=['"]{{(.+?)}}['"]/g, \` [attr.$1]="\${context}.$2"\`)
                .replace(/{{(.+?)}}/g, '{{context.$1}}')
            }
            export function getSVGViewbox(viewBox: any): string {
              return [viewBox.minx, viewBox.miny, viewBox.width, viewBox.height].join(' ');
            }
        `);
    fs.writeFileSync(
        `${options.output}${separator}${options.module}${separator}assets${separator}index.ts`,
        indexFile
    );

    const components = files.filter(file => file.contextDefaults);

    const namedComponents = components.map(_ =>
        capitalize(toCamelCase(_.name))
    );
    const componentsIndex = components
        .map(component => {
            return `export { ${capitalize(
                toCamelCase(component.name)
            )}Component } from './${component.name}.component';`;
        })
        .join('\n');

    // generate an index.ts of components
    fs.writeFileSync(
        `${options.output}${separator}${options.module}${separator}components${separator}index.ts`,
        componentsIndex
    );

    // generate the module file
    fs.writeFileSync(
        `${options.output}${separator}${options.module}${separator}${toKebabCase(
            options.module
        )}.module.ts`,
        angularDynamicModuleTemplate({
            components: namedComponents,
            moduleName: capitalize(toCamelCase(options.module))
        })
    );
}
