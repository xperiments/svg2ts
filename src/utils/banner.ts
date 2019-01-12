export const banner = `\x1b[37m
 .s+.                    -+s     _____   ____ _
 yMMMms:\`            .\/yNMMM\/   \/ __\\ \\ \/ \/ _\` |
\`MMMNNMMNh+-\`    \`:sdMMMNNMMd   \\__ \\\\ V \/ (_| |
\/MMM--+hNMMMmy\/ohNMMNmy\/.\/MMM\`  |___\/ \\_\/ \\__, |
oMMN    \`:odNMMMNmy+-    .MMM-  | |        __\/ |
sMMd        .:s+-\`        MMM\/  | |_ ___  |___\/
sMMy                      NMM\/  | __\/ __|
oMMd                     \`MMM-  | |_\\__ \\
-MMN\`                    \/MMN    \\__|___\/
 mMM+                    dMMs
 :MMN.                  oMMN\`
  oMMm.                oMMN:
   oMMN+             -hMMm:
    :mMMmo-       .\/hNMMy.
     \`\/dMMMNdhhhdNNMMNs.
        \`\/oydmmmdhs+-
\x1b[0m`.split(/\n/);

export function playBanner() {
  banner.concat('\x1b[36msvg2ts Installed correctly.\n\n\x1b[0m').forEach((line, index) => {
    setTimeout(() => {
      console.log(line);
    }, index * 25);
  });
}
