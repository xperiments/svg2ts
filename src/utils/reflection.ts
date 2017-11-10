import { dotObject } from './core';
import { SVG2TSContext, SVG2TSSourceFile, SVG2TSOutputFile } from '../types';
import { getMetadata, removeDefaultTemplateValues } from './svg';
import {
    propertyValueKeyRegExp,
    doubleQuoteRegExp,
    singleQuoteRegExp
} from './regexp';

export function getContextDefinition(content: string) {
    const hasDynamicData = content.match(propertyValueKeyRegExp);
    return hasDynamicData
        ? hasDynamicData.reduce(contextDefinitionReducer, {
              uuid: 'number'
          })
        : {};
}

export function getContextDefaults(file: string): SVG2TSContext | undefined {
    const hasDynamicData = file.match(propertyValueKeyRegExp);
    return hasDynamicData
        ? hasDynamicData.reduce(contextDefaultsReducer, {})
        : {};
}

export function getSVG2TSOutputFile(
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
        .replace(doubleQuoteRegExp, '')
        .replace(singleQuoteRegExp, ';');

    const defaultsDef = Object.assign({}, contextDefaults, contextDefaultsCss);

    const { path, name } = fileObj;
    let { svg, css } = fileObj;

    return {
        ...width ? { width: width } : {},
        ...height ? { height: height } : {},
        ...viewBox && viewBox.width && viewBox.height
            ? { viewBox: viewBox }
            : {},
        path,
        name,
        svg: removeDefaultTemplateValues(svg).replace(singleQuoteRegExp, "\\'"),
        ...css ? { css: removeDefaultTemplateValues(css) } : {},
        ...interfaceDef !== '{}' ? { contextInterface: interfaceDef } : {},
        ...JSON.stringify(contextDefaults) !== '{}'
            ? { contextDefaults: defaultsDef }
            : {}
    };
}

function contextDefaultsReducer(acc: any, match: string) {
    const value = match.replace(propertyValueKeyRegExp, '$1');
    dotObject(
        `dot.${match.replace(propertyValueKeyRegExp, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? value : parseInt(value, 10)
    );
    return acc;
}

function contextDefinitionReducer(acc: any, match: string) {
    const value = match.replace(propertyValueKeyRegExp, '$1');
    dotObject(
        `dot.${match.replace(propertyValueKeyRegExp, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? 'string' : 'number'
    );
    return acc;
}
