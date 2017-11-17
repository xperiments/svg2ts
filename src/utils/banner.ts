export const banner = [
    '\x1b[31m',
    '                 ___  _       ',
    '                |__ \\| |      ',
    '  _____   ____ _   ) | |_ ___ ',
    ' / __\\ \\ / / _` | / /| __/ __|',
    ' \\__ \\\\ V / (_| |/ /_| |_\\__ \\',
    ' |___/ \\_/ \\__, |____|\\__|___/',
    '            __/ |             ',
    '           |___/              ',
    '\x1b[0m'
];

export function playBanner() {
    banner
        .concat('\x1b[36msvg2ts Installed correctly.\n\n\x1b[0m')
        .forEach((line, index) => {
            setTimeout(() => {
                console.log(line);
            }, index * 100);
        });
}
