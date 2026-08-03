import io
p = 'js/09_ui.js'
src = io.open(p, encoding='utf-8').read()

# 1. 裂隙起点上移 + 宽度大幅放大
old1 = '''      var riftTop = vh * 0.50;
      var riftBot = vh + 40;
      var seg = 44;
      var half = 3;
      c.beginPath();
      c.moveTo(cx, riftTop);
      for (var y = riftTop + seg * 0.5; y < riftBot; y += seg) {
        var t = (y - riftTop) / (riftBot - riftTop);
        half = 2 + t * t * 24;
        c.lineTo(cx - half + (Math.random() - 0.5) * 9, y);
      }
      c.lineTo(cx - half - 10, riftBot);
      for (var y2 = riftBot; y2 > riftTop; y2 -= seg) {
        var t2 = (y2 - riftTop) / (riftBot - riftTop);
        var half2 = 2 + t2 * t2 * 24;
        c.lineTo(cx + half2 + (Math.random() - 0.5) * 9, y2);
      }'''
new1 = '''      var riftTop = vh * 0.44;   // 顶端紧贴标题底部
      var riftBot = vh + 40;
      var seg = 38;
      var half = 5;
      c.beginPath();
      c.moveTo(cx, riftTop);
      for (var y = riftTop + seg * 0.5; y < riftBot; y += seg) {
        var t = (y - riftTop) / (riftBot - riftTop);
        half = 4 + t * t * 90;          // 越往下越宽（底部最多 94px）
        c.lineTo(cx - half + (Math.random() - 0.5) * 14, y);
      }
      c.lineTo(cx - half - 14, riftBot);
      for (var y2 = riftBot; y2 > riftTop; y2 -= seg) {
        var t2 = (y2 - riftTop) / (riftBot - riftTop);
        var half2 = 4 + t2 * t2 * 90;
        c.lineTo(cx + half2 + (Math.random() - 0.5) * 14, y2);
      }'''
assert old1 in src, 'old1 not found'
src = src.replace(old1, new1)

# 2. 裂隙渐变更亮
old2 = "      rift.addColorStop(0, 'rgba(225,240,255,.95)');\n      rift.addColorStop(0.4, 'rgba(160,210,255,.65)');\n      rift.addColorStop(1, 'rgba(110,160,255,.4)');"
new2 = "      rift.addColorStop(0, 'rgba(235,245,255,1)');\n      rift.addColorStop(0.4, 'rgba(180,220,255,.8)');\n      rift.addColorStop(1, 'rgba(130,180,255,.45)');"
assert old2 in src, 'old2 not found'
src = src.replace(old2, new2)

# 3. 裂隙外圈光晕更亮更大
old3 = "      var rg = c.createRadialGradient(cx, vh * 0.66, 0, cx, vh * 0.66, Math.max(vw, vh) * 0.34);\n      rg.addColorStop(0, 'rgba(160,210,255,.28)');\n      rg.addColorStop(1, 'rgba(150,200,255,0)');"
new3 = "      var rg = c.createRadialGradient(cx, vh * 0.62, 0, cx, vh * 0.62, Math.max(vw, vh) * 0.42);\n      rg.addColorStop(0, 'rgba(170,220,255,.38)');\n      rg.addColorStop(1, 'rgba(170,220,255,0)');"
assert old3 in src, 'old3 not found'
src = src.replace(old3, new3)

# 4. 裂隙顶部扩散光晕（让标题像从光中升起）
old4 = "      // 顶部一丝暖光（呼应金色 tag）"
new4 = """      // 裂隙顶部扩散光晕（让标题像从光中升起）
      var rgTop = c.createRadialGradient(cx, riftTop, 0, cx, riftTop, vw * 0.28);
      rgTop.addColorStop(0, 'rgba(200,230,255,.32)');
      rgTop.addColorStop(1, 'rgba(200,230,255,0)');
      c.fillStyle = rgTop;
      c.fillRect(0, 0, vw, vh);

      // 顶部一丝暖光（呼应金色 tag）"""
assert old4 in src, 'old4 not found'
src = src.replace(old4, new4)

io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('WIDENED OK')
