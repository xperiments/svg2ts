import * as path from "path";

export type Dictionary = { [key: string]: any };

export interface CommandLineToolsOptions {
  aliases: Dictionary;
  help: Dictionary;
  banner: string[];
  version: string;
}

export class CommandLineTools<TypedArgs> {
  args: TypedArgs;
  private arguments: TypedArgs;
  constructor(
    private packageName: string,
    args: string[],
    private options: CommandLineToolsOptions
  ) {
    Object.assign(
      this.options.aliases,
      this.options.aliases,
      CommandLineTools.kvvk(this.options.aliases)
    );
    this.arguments = CommandLineTools.parseArguments<TypedArgs>(args);
    this.args = new Proxy(this.arguments as Object, {
      get: function(target: any, name: PropertyKey) {
        return name in target
          ? target[name]
          : target[options.aliases[name as string]] || null;
      }
    });
  }
  help() {
    if (this.options.banner) {
      this.options.banner.forEach(_ => console.log(_));
    }
    if (this.options.version) {
      console.log("Version: " + this.options.version);
    }
    console.log("");
    console.log("\x1b[35m" + this.packageName + " Usage:\x1b[0m");
    console.log("");
    let keyPad = 0;
    Object.keys(this.options.help).forEach(key => {
      const [description, exampleValue] = this.options.help[key].split("|");
      if (key.length + 5 + exampleValue.length > keyPad)
        keyPad = key.length + 5 + exampleValue.length;
    });
    keyPad += 2;
    Object.keys(this.options.help).forEach(key => {
      const [description, exampleValue] = this.options.help[key].split("|");
      const outputKeyExample = "  --" + key + " " + exampleValue;
      const paddedKey = padEnd(outputKeyExample, keyPad, "");
      const colorDescription = ["\x1b[35m", description, "\x1b[0m"].join("");
      console.log(paddedKey + colorDescription);
    });
    console.log("");
    return false;
  }
  static parseArguments<TypedArgs>(arr: string[]): TypedArgs {
    return <TypedArgs>arr.reduce(
      (
        prevValue: { [key: string]: string | boolean },
        valorActual: string,
        index: number,
        vector: string[]
      ) => {
        const isKey = vector[index].indexOf("-") === 0;
        if (isKey) {
          const next = arr[index + 1];
          const nextIsValue = next && next.indexOf("-") !== 0;
          prevValue[vector[index].replace(/-/gi, "")] = nextIsValue
            ? next
            : true;
        }
        return prevValue;
      },
      {}
    );
  }
  static kvvk(obj: any) {
    return Object.keys(obj).reduce(
      (a, b, c, d) => {
        a[obj[b]] = b;
        return a;
      },
      {} as Dictionary
    );
  }
}

function padEnd(str: string, targetLength: number, padString: string) {
  targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
  padString = String(padString || " ");
  if (str.length > targetLength) {
    return String(str);
  } else {
    targetLength = targetLength - str.length;
    if (targetLength > padString.length) {
      padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
    }
    return String(str) + padString.slice(0, targetLength);
  }
}
