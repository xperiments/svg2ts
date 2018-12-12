export const banner = [
  '\x1b[31m',
  '   ______    __________      ',
  '  / ___/ |  / / ____/ /______',
  '  \\__ \\| | / / / __/ __/ ___/',
  ' ___/ /| |/ / /_/ / /_(__  ) ',
  '/____/ |___/\\____/\\__/____/  ',

  '\x1b[0m'
];

export function playBanner() {
  banner.concat('\x1b[36msvg2ts Installed correctly.\n\n\x1b[0m').forEach((line, index) => {
    setTimeout(() => {
      console.log(line);
    }, index * 100);
  });
}
