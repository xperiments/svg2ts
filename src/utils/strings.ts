export function camelCase(str: string) {
  return str
    .replace(/[\s|_|-](.)/g, function($1) {
      return $1.toUpperCase();
    })
    .replace(/[\s|_|-]/g, '')
    .replace(/^(.)/, function($1) {
      return $1.toLowerCase();
    });
}

export function kebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([^a-zA-Z])/g, '-')
    .toLowerCase();
}

export function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}

export function pascalCase(str: string) {
  return capitalize(camelCase(str));
}
