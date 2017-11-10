export interface SVG2TSCmd {
    output: string;
    input: string;
    blueprint: string;
    module: string;
}

export interface SVG2TSContext {
    [key: string]: string | number;
}

export interface SVG2TSDimensions {
    minx?: number | undefined;
    miny?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
}

export interface SVG2TSOutputFile extends SVG2TSDimensions, SVG2TSSourceFile {
    viewBox?: SVG2TSDimensions | undefined;
    contextInterface?: string | undefined;
    contextDefaults?: { [key: string]: string | number } | undefined;
}

export interface SVG2TSSourceFile {
    name: string;
    svg: string;
    path: string;
    css?: string;
}

export interface SVG2TSSVGMetadata {
    width?: number | undefined;
    height?: number | undefined;
    viewBox?: SVG2TSDimensions | undefined;
}
