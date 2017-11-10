import { dotObject } from './core';
import { SVG2TSContext, SVG2TSSourceFile, SVG2TSOutputFile } from '../types';
import { getMetadata, removeDefaultTemplateValues } from './svg';

export function getContextDefinition(content: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const hasDynamicData = content.match(reg);

    if (hasDynamicData) {
        const matches = <RegExpMatchArray>content.match(reg);
        const result = matches.reduce(contextDefinitionReducer, {
            uuid: 'number'
        });
        return result;
    } else {
        return {};
    }
}

export function getContextDefaults(file: string): SVG2TSContext | undefined {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const hasDynamicData = file.match(reg);
    const matches = <RegExpMatchArray>file.match(reg);
    if (hasDynamicData) {
        return matches.reduce(contextDefaultsReducer, {});
    } else {
        return {};
    }
}

export function getTypescriptOutputMetadata(
    fileObj: SVG2TSSourceFile
): SVG2TSOutputFile {
    const { width, height, viewBox } = getMetadata(fileObj);
    const contextInterface = getContextDefinition(fileObj.svg);
    const contextInterfaceCss = getContextDefinition(fileObj.css as string);
    const contextDefaults = getContextDefaults(fileObj.svg);
    const contextDefaultsCss = getContextDefaults(fileObj.css as string);
    const interfaceDef = JSON.stringify(
        Object.assign({}, contextInterface, contextInterfaceCss)
    )
        .replace(/"/g, '')
        .replace(/,/g, ';');
    const defaultsDef = Object.assign({}, contextDefaults, contextDefaultsCss);

    const { path, name } = fileObj;
    let { svg, css } = fileObj;

    svg = removeDefaultTemplateValues(svg).replace(/'/g, "\\'");

    css && (css = removeDefaultTemplateValues(css));

    console.log(interfaceDef === '{}', defaultsDef);
    return {
        ...width ? { width: width } : {},
        ...height ? { height: height } : {},
        ...viewBox && viewBox.width && viewBox.height
            ? { viewBox: viewBox }
            : {},
        path,
        name,
        svg,
        ...css ? { css: css } : {},
        ...interfaceDef !== '{}' ? { contextInterface: interfaceDef } : {},
        ...JSON.stringify(contextDefaults) !== '{}'
            ? { contextDefaults: defaultsDef }
            : {}
    };
}

function contextDefaultsReducer(acc: any, match: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const value = match.replace(reg, '$1');
    dotObject(
        `dot.${match.replace(reg, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? value : parseInt(value, 10)
    );
    return acc;
}

function contextDefinitionReducer(acc: any, match: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const value = match.replace(reg, '$1');
    dotObject(
        `dot.${match.replace(reg, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? 'string' : 'number'
    );
    return acc;
}
