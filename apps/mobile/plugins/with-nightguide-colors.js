const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const light = {
  nightguide_background: '#F5F6F0',
  nightguide_surface: '#FFFFFF',
  nightguide_elevated: '#E9ECE3',
  nightguide_border: '#D2D6CC',
  nightguide_text: '#171A14',
  nightguide_muted: '#62685E',
  nightguide_accent: '#667900',
  nightguide_accent_strong: '#4F6000',
  nightguide_ink: '#FFFFFF',
};

const dark = {
  nightguide_background: '#09090B',
  nightguide_surface: '#141416',
  nightguide_elevated: '#1D1D20',
  nightguide_border: '#2B2B30',
  nightguide_text: '#F7F7F2',
  nightguide_muted: '#A7A7AE',
  nightguide_accent: '#E2FF54',
  nightguide_accent_strong: '#C7E638',
  nightguide_ink: '#111207',
};

function xml(values) {
  const colors = Object.entries(values).map(([name, value]) => `  <color name="${name}">${value}</color>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${colors}\n</resources>\n`;
}

module.exports = function withNightGuideColors(config) {
  return withDangerousMod(config, ['android', async (nextConfig) => {
    const resourceRoot = path.join(nextConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const lightDir = path.join(resourceRoot, 'values');
    const darkDir = path.join(resourceRoot, 'values-night');
    fs.mkdirSync(lightDir, { recursive: true });
    fs.mkdirSync(darkDir, { recursive: true });
    fs.writeFileSync(path.join(lightDir, 'nightguide-colors.xml'), xml(light));
    fs.writeFileSync(path.join(darkDir, 'nightguide-colors.xml'), xml(dark));
    return nextConfig;
  }]);
};
