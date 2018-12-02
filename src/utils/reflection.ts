import { SVG2TSContext, SVG2TSOutputFile, SVG2TSSourceFile } from '../types';
import { dotObject } from './core';
import { doubleQuoteRegExp, propertyValueKeyRegExp, singleQuoteRegExp } from './regexp';
import { getMetadata, removeDefaultTemplateValues } from './svg';

export function getContextDefinition(content: string) {
  const hasDynamicData = content.match(propertyValueKeyRegExp);
  return hasDynamicData
    ? hasDynamicData.reduce(contextDefinitionReducer, {
        uuid: 'number'
      })
    : {};
}

export function getContextDefaults(file: string): SVG2TSContext {
  const hasDynamicData = file.match(propertyValueKeyRegExp);
  return hasDynamicData ? hasDynamicData.reduce(contextDefaultsReducer, {}) : {};
}

export function getSVG2TSOutputFile(fileObj: SVG2TSSourceFile): SVG2TSOutputFile {
  const { width, height, viewBox } = getMetadata(fileObj);
  const contextInterfaceSvg = getContextDefinition(fileObj.svg);
  const contextInterfaceCss = getContextDefinition(fileObj.css as string);
  const contextDefaultsSvg = getContextDefaults(fileObj.svg);
  const contextDefaultsCss = getContextDefaults(fileObj.css as string);
  const contextInterface = JSON.stringify(Object.assign({}, contextInterfaceSvg, contextInterfaceCss))
    .replace(doubleQuoteRegExp, '')
    .replace(singleQuoteRegExp, ';');

  const contextDefaults = Object.assign({}, contextDefaultsSvg, contextDefaultsCss);

  const { path, name } = fileObj;
  const { svg, css } = fileObj;

  return {
    ...(css ? { css: removeDefaultTemplateValues(css) } : {}),
    ...(JSON.stringify(contextDefaultsSvg) !== '{}' ? { contextDefaults } : {}),
    ...(contextInterface !== '{}' ? { contextInterface } : {}),
    ...(height ? { height: height } : {}),
    name,
    path,
    svg: removeDefaultTemplateValues(svg).replace(singleQuoteRegExp, "\\'"),
    ...(viewBox && viewBox.width && viewBox.height ? { viewBox: viewBox } : {}),
    ...(width ? { width: width } : {})
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
