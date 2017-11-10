export const colonRegExp = /:/g;
export const commaRegExp = /,/g;
export const doubleQuoteRegExp = /"/g;
export const lineBreaksRegExp = /\r?\n|\r/g;
export const propertyBeginRegExp = /{{/g;
export const propertyBeginToggleRegExp = /_oo_/g;
export const propertyEndRegExp = /}}/g;
export const propertyEndToggleRegExp = /_OO_/g;
export const propertyValueKeyRegExp = /\{{(.+?)\|(.+?)}}/g;
export const singleQuoteRegExp = /'/g;

export const svgAttributeRegExp = / (\S+?)=['"]{{(.+?)}}['"]/g;
export const svgHeightRegExp = /\bheight ?= ?(['"])([^%]+?)\1/;
export const svgIsSVG = /<svg[^>]+[^>]*>/;
export const svgRootRegExp = /<svg\s[^>]+>/;
export const svgScriptRegExp = /(<script(([^>][\s\S])+?)?>)([\s\S]+?)(<\/script>)/g;
export const svgStyleRegExp = /(<style(([^>][\s\S])+?)?>)([\s\S]+?)(<\/style>)/g;
export const svgViewBoxRegExp = /\bviewBox ?= ?(['"])(.+?)\1/;
export const svgWidthRegExp = /\bwidth ?= ?(['"])([^%]+?)\1/;

export const styleTagRegExp = /<[\/]?style>/g;
export const styleExtractRegExp = /(<style(.+?)?>)([\s\S]+?)<\/style>/g;
