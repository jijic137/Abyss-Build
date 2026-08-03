const fs = require('fs');
const p = 'js/09_ui.js';
let src = fs.readFileSync(p,'utf8');
src = src.replace(
  "UI.renderCoverBg = function () {\n    var cv = $('coverBg');\n    if (!cv) return;\n    try {",
  "UI.renderCoverBg = function () {\n    var cv = $('coverBg');\n    if (!cv) return;\n    // TRY-REMOVED"
);
src = src.replace(
  "    } catch (e) { /* 无头环境跳过 */ }\n  };",
  "    }\n    // } catch REMOVED\n  };"
);
fs.writeFileSync(p, src);
console.log('TRY CATCH REMOVED');
