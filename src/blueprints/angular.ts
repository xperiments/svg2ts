import * as fs from 'fs';
import * as path from 'path';

import { SVG2TSCmd, SVG2TSOutputFile } from '../types';
import {
    angularDynamicClassTemplate,
    angularDynamicModuleTemplate,
    svgIconClassTemplate
} from './angular.templates';
import { capitalize, camelCase, kebabCase, pascalCase } from '../utils/strings';
import { compactSVG } from '../utils/svg';
import { mkdirRecursiveSync } from '../utils/core';
import { render as renderTS } from './typescript';

function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd): string {
    delete svgFile.contextInterface;
    return angularDynamicClassTemplate({
        className: pascalCase(svgFile.name),
        selector: `${kebabCase(options.module)}-${kebabCase(svgFile.name)}`
    });
}

function getSvgAOT(svgFile: SVG2TSOutputFile) {
    const svgTemplate = `
      <fvg
        [attr.width]="width"
        [attr.height]="height"
        [attr.viewBox]="viewBox">
        @@@styles@@@${svgFile.svg}
      </fvg>`
        .replace(/ (\S+?)=['"]{{(.+?)}}['"]/g, ` [attr.$1]="context.$2"`)
        .replace(/{{(.+?)}}/g, '{{context.$1}}')
        .replace(
            '@@@styles@@@',
            `<style>${
                svgFile.css
                    ? svgFile.css.replace(/{{(.+?)}}/g, '{{context.$1}}')
                    : ''
            }</style>`
        );
    return compactSVG(svgTemplate.replace(/\s/g, ' '))
        .replace('<fvg', '<svg')
        .replace('</fvg>', '</svg>');
}

export function saveFile(options: SVG2TSCmd, blueprint: string) {
    const { output, module } = options;
    return (svgFile: SVG2TSOutputFile) => {
        // TS
        const filePath = `${output}${path.sep}${module}${path.sep}assets${
            path.sep
        }${svgFile.name}.ts`;
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            mkdirRecursiveSync(destBase);
        }
        delete svgFile.path;
        svgFile.svg = getSvgAOT(svgFile);
        delete svgFile.css;

        fs.writeFileSync(filePath, renderTS(svgFile, options));

        if (svgFile.contextDefaults) {
            const ngFilePath = `${output}${path.sep}${module}${
                path.sep
            }components${path.sep}${svgFile.name}.component.ts`;
            const destBase = path.dirname(ngFilePath);
            if (!fs.existsSync(destBase)) {
                mkdirRecursiveSync(destBase);
            }
            fs.writeFileSync(ngFilePath, render(svgFile, options));
        }
    };
}

export function generateIndexFile(
    options: SVG2TSCmd,
    files: SVG2TSOutputFile[]
) {
    // generate an index.ts of svg's
    const indexFile = files
        .map((file: SVG2TSOutputFile) => {
            const svgObjectName = pascalCase(file.name);
            const context = file.contextDefaults
                ? `, ${svgObjectName}Context`
                : '';
            return `export { ${svgObjectName}${context} } from './${
                file.name
            }';`;
        })
        .join('\n').concat(`
            export function getSVGViewbox(viewBox: any): string {
              return [viewBox.minx, viewBox.miny, viewBox.width, viewBox.height].join(' ');
            }
        `);

    fs.writeFileSync(
        `${options.output}${path.sep}${options.module}${path.sep}assets${
            path.sep
        }index.ts`,
        indexFile
    );

    const components = files.filter(file => file.contextDefaults);
    const namedComponents = components.map(_ => pascalCase(_.name));
    const moduleName = pascalCase(options.module);

    const componentsIndex = components
        .map(component => {
            return `export { ${pascalCase(component.name)}Component } from './${
                component.name
            }.component';`;
        })
        .concat(
            `export {${pascalCase(moduleName)}Component} from './${
                options.module
            }.component'`
        )
        .join('\n');

    // generate an index.ts of components
    fs.writeFileSync(
        `${options.output}${path.sep}${options.module}${path.sep}components${
            path.sep
        }index.ts`,
        componentsIndex
    );

    // generate the module.ts file
    fs.writeFileSync(
        `${options.output}${path.sep}${options.module}${path.sep}${kebabCase(
            options.module
        )}.module.ts`,
        angularDynamicModuleTemplate({
            components: namedComponents.concat(pascalCase(moduleName)),
            moduleName
        })
    );

    fs.writeFileSync(
        `${options.output}${path.sep}${options.module}${path.sep}components${
            path.sep
        }${kebabCase(options.module)}.component.ts`,
        svgIconClassTemplate({
            assets: files.map(file => pascalCase(file.name)),
            components: components.map(component => ({
                component: pascalCase(component.name),
                name: component.name
            })),
            moduleName,
            className: `${pascalCase(options.module)}`,
            pascalCase: pascalCase,
            selector: `${kebabCase(options.module)}-svg`
        })
    );
}
