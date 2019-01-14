export interface SVG2TSCmd {
  output: string;
  input: string;
  blueprint: string;
  module: string;
  config: SVG2TSConfigFile | string;
}

export interface SVG2TSConfigProject {
  name: string;
  files: Array<string>;
  blueprint: string;
  module: string;
  output: string;
}

export interface SVG2TSConfigFile {
  projects: Array<SVG2TSConfigProject>;
}

export interface SVG2TSContext {
  [key: string]: string | number;
}

export interface SVG2TSDimensions {
  minx?: number | undefined;
  miny?: number | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
}

export interface SVG2TSOutputFile extends SVG2TSDimensions, SVG2TSSourceFile {
  viewBox?: SVG2TSDimensions | undefined;
  contextInterface?: string | undefined;
  contextDefaults?: { [key: string]: string | number } | undefined;
}

export interface SVG2TSSourceFile {
  name: string;
  svg: string;
  svgHash?: string;
  path: string;
  css?: string;
}

export interface SVG2TSSVGMetadata {
  width?: number | string | undefined;
  height?: number | string | undefined;
  viewBox?: SVG2TSDimensions | undefined;
}
