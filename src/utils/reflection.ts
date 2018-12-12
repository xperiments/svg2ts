import { SVG2TSContext, SVG2TSOutputFile, SVG2TSSourceFile } from '../types';
import { dotObject } from './core';
import { colonRegExp, doubleQuoteRegExp, propertyValueKeyRegExp, singleQuoteRegExp } from './regexp';
import { getSvgMetadata, removeDefaultTemplateValues } from './svg';

export function getContextDefinition(content: string) {
  const hasDynamicData = content.match(propertyValueKeyRegExp);
  return hasDynamicData && !(hasDynamicData.length === 1 && hasDynamicData[0] === '{{0|uuid}}')
    ? hasDynamicData.reduce(contextDefinitionReducer, {})
    : {};
}

export function getContextDefaults(source: string): SVG2TSContext {
  const hasDynamicData = source.match(propertyValueKeyRegExp);
  return hasDynamicData ? hasDynamicData.reduce(contextDefaultsReducer, {}) : {};
}

export function getSVG2TSOutputFile(fileObj: SVG2TSSourceFile): SVG2TSOutputFile {
  const { width, height, viewBox } = getSvgMetadata(fileObj);
  const contextInterfaceSvg = getContextDefinition(fileObj.svg);
  const contextInterfaceCss = getContextDefinition(fileObj.css as string);
  const contextDefaultsSvg = getContextDefaults(fileObj.svg);
  const contextDefaultsCss = getContextDefaults(fileObj.css as string);

  const contextInterfaceObject = Object.assign({}, contextInterfaceSvg, contextInterfaceCss);
  const contextInterface = JSON.stringify(contextInterfaceObject)
    .replace(doubleQuoteRegExp, '')
    .replace(singleQuoteRegExp, ';');

  console.log('contextInterface', contextInterface);
  const contextInterfaceWithUUID = JSON.stringify(
    Object.assign({ uuid: 'number' }, contextInterfaceSvg, contextInterfaceCss)
  )
    .replace(doubleQuoteRegExp, '')
    .replace(singleQuoteRegExp, ';');

  delete contextDefaultsCss.uuid;
  delete contextDefaultsSvg.uuid;

  const isSimpleUUIDInterface =
    Object.keys(contextInterfaceObject).length === 1 && contextInterfaceObject['uuid'] === 'number';
  const contextDefaults = Object.assign({}, contextDefaultsSvg, contextDefaultsCss);

  const { svg, css, svgHash, path, name } = fileObj;

  return {
    ...(css ? { css: removeDefaultTemplateValues(css) } : {}),
    ...(JSON.stringify(contextDefaults) !== '{}' ? { contextDefaults: { ...contextDefaults, uuid: 0 } } : {}),
    ...(contextInterface !== '{}' && !isSimpleUUIDInterface ? { contextInterface: contextInterfaceWithUUID } : {}),
    ...(height ? { height: height } : {}),
    name,
    path,
    svgHash,
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

export function getTypescriptInterfaceDescriptor(obj: any) {
  return obj && obj.toString().replace(colonRegExp, '?:');
}
