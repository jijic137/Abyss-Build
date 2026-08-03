// 调试：临时在 renderCoverBg 里加一个白色矩形，看是否显示
const fs = require('fs');
const p = 'js/09_ui.js';
let src = fs.readFileSync(p, 'utf8');
if (src.indexOf('TEST_INSERTED') < 0) {
  src = src.replace(
    '      // 边缘暗角',
    '      // TEST_INSERTED: 画一个纯白矩形在裂隙区域\n      c.fillStyle = "rgba(255,255,255,1)";\n      c.fillRect(cx - 30, 200, 60, 400);\n\n      // 边缘暗角'
  );
  fs.writeFileSync(p, src);
  console.log('TEST INSERTED');
}
