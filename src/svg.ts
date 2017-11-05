import { SVG2TSSvgMetadata, SVG2TSDimensions, SVG2TSSourceFile } from './types';

const extractorRegExps = {
    root: /<svg\s[^>]+>/,
    width: /\bwidth ?= ?(['"])([^%]+?)\1/,
    height: /\bheight ?= ?(['"])([^%]+?)\1/,
    viewBox: /\bviewBox ?= ?(['"])(.+?)\1/
};

export function isSVG(buffer: string) {
    return /<svg[^>]+[^>]*>/.test(buffer);
}

export function parseViewbox(viewBox: string): SVG2TSDimensions {
    const [minx, miny, width, height] = viewBox.split(' ').map(_ => {
        return parseInt(_, 10);
    });
    return { minx, miny, width, height };
}

export function parseAttributes(root: any): SVG2TSSvgMetadata {
    const width = root.match(extractorRegExps.width);
    const height = root.match(extractorRegExps.height);
    const viewBox = root.match(extractorRegExps.viewBox);
    return {
        ...width ? { width: parseInt(width[2], 10) } : {},
        ...height ? { height: parseInt(height[2], 10) } : {},
        ...viewBox ? { viewBox: parseViewbox(viewBox[2]) } : {}
    };
}

export function getSvgMetadata(svgFile: SVG2TSSourceFile) {
    const buffer = svgFile.file;
    const root = buffer.match(extractorRegExps.root);
    if (root) {
        const attrs = parseAttributes(root[0]);
        if (attrs.width && attrs.height) {
            return getSvgDimensions(attrs);
        }
        if (attrs.viewBox) {
            return getSvgDimensionsFromViewBox(attrs);
        }
    }
    console.log(
        `[svg2ts] \x1b[31mUnable to determine dimensions of: \x1b[33m${svgFile.path}\x1b[0m`
    );
    return {};
}

export function getSvgDimensions(attrs: any): SVG2TSSvgMetadata {
    const { width, height } = attrs;
    return {
        width,
        height,
        ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
    };
}

export function getSvgDimensionsFromViewBox(attrs: any): SVG2TSSvgMetadata {
    const ratio = attrs.viewBox.width / attrs.viewBox.height;
    if (attrs.width) {
        return {
            width: attrs.width,
            height: Math.floor(attrs.width / ratio),
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
        };
    }
    if (attrs.height) {
        return {
            width: Math.floor(attrs.height * ratio),
            height: attrs.height,
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
        };
    }

    return {
        viewBox: {
            width: attrs.viewBox.width,
            height: attrs.viewBox.height
        }
    };
}
