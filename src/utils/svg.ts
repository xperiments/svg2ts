import * as path from 'path';
import * as postcss from 'postcss';
import * as prefixer from 'postcss-prefix-selector';
import { SVG2TSCmd, SVG2TSDimensions, SVG2TSSourceFile, SVG2TSSVGMetadata } from '../types';
import {
  propertyBeginRegExp,
  propertyBeginToggleRegExp,
  propertyEndRegExp,
  propertyEndToggleRegExp,
  propertyValueKeyRegExp,
  singleQuoteRegExp,
  styleExtractRegExp,
  styleTagRegExp,
  svgHeightRegExp,
  svgIsSVG,
  svgRootRegExp,
  svgScriptRegExp,
  svgStyleRegExp,
  svgViewBoxRegExp,
  svgWidthRegExp
} from './regexp';

var crypto = require('crypto');

/**
 * Determines if the provided buffer string is an svg
 *
 * @export
 * @param {string} buffer
 * @returns
 */
export function isSVG(buffer: string) {
  return svgIsSVG.test(buffer);
}

/**
 * Parses a view box string 'x y width height' into an object
 *
 * @export
 * @param {string} viewBox
 * @returns {SVG2TSDimensions}
 */
export function parseViewBox(viewBox: string): SVG2TSDimensions {
  const [minx, miny, width, height] = viewBox.split(' ').map(_ => {
    return parseInt(_, 10);
  });
  return { minx, miny, width, height };
}

/**
 * Returns an object containing the values
 * of the with / height / viewBox svg attributes
 *
 * @export
 * @param {*} root
 * @returns {SVG2TSSVGMetadata}
 */
export function parseSvgAttributes(root: string): SVG2TSSVGMetadata {
  const width = root.match(svgWidthRegExp);
  const height = root.match(svgHeightRegExp);
  const viewBox = root.match(svgViewBoxRegExp);
  return {
    ...(width ? { width: width[2] } : {}),
    ...(height ? { height: height[2] } : {}),
    ...(viewBox ? { viewBox: parseViewBox(viewBox[2]) } : {})
  };
}

/**
 * Retuns the svgFile SVG2TSSVGMetadata
 *
 * @export
 * @param {SVG2TSSourceFile} svgFile
 * @returns {SVG2TSSVGMetadata}
 */
export function getSvgMetadata(svgFile: SVG2TSSourceFile): SVG2TSSVGMetadata {
  const root = svgFile.svg.match(svgRootRegExp);

  // is valid svg?
  if (root) {
    const svgAttributes = parseSvgAttributes(root[0]);
    // if svg width & height attributes are present
    // compute dimensions from the attributes
    if (svgAttributes.width && svgAttributes.height) {
      return getSvgDimensions(svgAttributes);
    }

    // if not attributes are present get the dimensions from
    // the viewVox attribute
    if (svgAttributes.viewBox) {
      return getSvgViewBoxDimensions(svgAttributes);
    }

    console.log(`[svg2ts] \x1b[31mUnable to determine dimensions of: \x1b[33m${svgFile.path}\x1b[0m`);
  }
  console.log(`[svg2ts] \x1b[31mUnable to determine dimensions of: \x1b[33m${svgFile.path}\x1b[0m`);
  return {};
}

/**
 * Returns an SVG2TSSVGMetadata if the width / height attributes are present
 *
 * @export
 * @param {{ [key: string]: any }} attrs
 * @returns {SVG2TSSVGMetadata}
 */
export function getSvgDimensions(attrs: { [key: string]: any }): SVG2TSSVGMetadata {
  const { width, height } = attrs;
  return {
    width,
    height,
    ...(attrs.viewBox ? { viewBox: attrs.viewBox } : {})
  };
}

/**
 * Returns an SVG2TSSVGMetadata if viewBox is present in attributes
 *
 * @export
 * @param {*} attrs
 * @returns {SVG2TSSVGMetadata}
 */
export function getSvgViewBoxDimensions(attrs: { [key: string]: any }): SVG2TSSVGMetadata {
  const ratio = attrs.viewBox.width / attrs.viewBox.height;
  if (attrs.width) {
    return {
      height: Math.floor(attrs.width / ratio),
      ...(attrs.viewBox ? { viewBox: attrs.viewBox } : {}),
      width: attrs.width
    };
  }
  if (attrs.height) {
    return {
      height: attrs.height,
      ...(attrs.viewBox ? { viewBox: attrs.viewBox } : {}),
      width: Math.floor(attrs.height * ratio)
    };
  }

  return {
    height: '100%',
    viewBox: { width: attrs.viewBox.width, height: attrs.viewBox.height },
    width: '100%'
  };
}

/**
 * Returns a string containing the svg inline styles
 *
 * @export
 * @param {string} svg
 * @returns {string}
 */
export function getSvgInlineStyles(svg: string): string {
  // matches all <style ...>(content)</style>
  const matches = svg.match(styleExtractRegExp);
  // remove <style> | </style> tag
  return matches ? matches.join('').replace(styleTagRegExp, '') : '';
}

/**
 * Minifies css string
 *
 * @export
 * @param {string} css
 * @returns {string}
 */
export function compactCSS(css: string): string {
  // https://codepen.io/arlinadesign/pen/KVNBKK
  const c = /@(media|-w|-m|-o|keyframes|page)(.*?)\{([\s\S]+?)?\}\}/gi,
    t = css.length;
  css = css
    .replace(/(\n+)?(\/\*[\w\W]*?\*\/)(\n+)?/gm, '\n$2\n')
    .replace(/([\n\r\t\s ]+)?([\,\:\;\{\}]+?)([\n\r\t\s ]+)?/g, '$2')
    .replace(/\}(?!\})/g, '}\n')
    .replace(c, e => {
      return e.replace(/\n+/g, '');
    })
    .replace(/;\}/g, '}')
    .replace(/\:0(px|em|pt)/gi, ':0')
    .replace(/ 0(px|em|pt)/gi, ' 0')
    .replace(/\s+\!important/gi, '!important')
    .replace(/(^\n+|\n+$)/, '')
    .replace(/\t/g, '')
    .replace(/\n/g, '');
  return css;
}

/**
 * Minifies SVG
 *
 * @export
 * @param {string} source
 * @returns {string}
 */
export function compactSVG(source: string): string {
  source = source
    .replace(/<svg.[^>]*>/g, '')
    .replace(/<\/svg>/gi, '')
    .replace(/\<\!--\s*?[^\s?\[][\s\S]*?--\>/g, '')
    .replace(/\>\s*\</g, '><');
  source = source.replace(/<([^>]+)>/g, function(str, tagInner) {
    tagInner = tagInner
      .replace(/^ +| +$/g, '') // Not .trim() that removes \f.
      .replace(/(?: *\/ +| +\/ *)/g, '/') // Remove whitespaces in </ p> or <br />
      .replace(/ *= */g, '=')
      .replace(/( +)/g, ' ');
    return '<' + tagInner + '>';
  });
  return source.trim();
}

/**
 * Removes the custom svg variables in format
 * {{value|variable}} from the provided string
 * and returns it
 *
 * @export
 * @param {string} source
 * @returns {string}
 */
export function removeDefaultTemplateValues(source: string): string {
  return source.replace(propertyValueKeyRegExp, '{{$2}}');
}

/**
 * Provides a scoped & minified Css
 * from the Svg inline styles
 *
 * @export
 * @param {string} svg
 * @param {SVG2TSCmd} options
 * @returns {string}
 */
export function extractSvgInlineStyles(svg: string, svgHash: string): string {
  const minifiedCss = compactCSS(
    // get inline svg styles
    getSvgInlineStyles(svg)
      // escape single quotes
      .replace(singleQuoteRegExp, "\\'")
    // .replace(svgAttributeRegExp, ` [attr.$1]="context.$2"`)
  )
    // obscure {{
    .replace(propertyBeginRegExp, '_oo_')
    // obscure }}
    .replace(propertyEndRegExp, '_OO_');

  return (
    postcss()
      .use(prefixer({ prefix: `.${svgHash}-_oo_0|uuid_OO_` }))
      .process(minifiedCss)
      .css // de-obscure {{
      .replace(propertyBeginToggleRegExp, '{{')
      // de obscure }}
      .replace(propertyEndToggleRegExp, '}}')
  );
}

/**
 * Removes inline style tags from the string
 *
 * @export
 * @param {string} svg
 * @returns {string}
 */
export function removeSvgInlineStyles(svg: string): string {
  return svg.replace(svgStyleRegExp, '');
}

/**
 * Removes inline script tags from the string
 *
 * @export
 * @param {string} svg
 * @returns {string}
 */
export function removeSvgInlineScripts(svg: string): string {
  return svg.replace(svgScriptRegExp, '');
}

/**
 * Filters svg files by extension
 *
 * @export
 * @param {string} file
 * @returns
 */
export function filterSvg(file: string) {
  return file.includes('svg') && path.extname(file) === '.svg';
}

/**
 * Filters svg files by content
 *
 * @export
 * @param {SVG2TSSourceFile} svgFilePath
 * @returns {boolean}
 */
export function filterSvgContent(svgFilePath: SVG2TSSourceFile): boolean {
  return isSVG(svgFilePath.svg);
}

/**
 * Filter svg files that has valid dimensions
 *
 * @export
 * @param {SVG2TSSourceFile} fileObj
 * @returns
 */
export function filterKnownDimensions(fileObj: SVG2TSSourceFile) {
  const { width, height, viewBox } = getSvgMetadata(fileObj);
  return (width && height) || (viewBox && viewBox.width && viewBox.height);
}
