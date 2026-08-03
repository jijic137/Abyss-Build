import io
p = 'js/09_ui.js'
src = io.open(p, encoding='utf-8').read()

old = """      // 底部裂隙光柱（中央竖直光带，从下方 vh*0.62 向上收窄，外扩柔和椭圆）
      var cx = vw / 2;
      var beamTop = vh * 0.66;
      var beamBot = vh + 30;
      var beamW = Math.min(vw * 0.35, 460);   // 收窄光柱，让立绘不被淹没
      var beam = c.createLinearGradient(cx, beamTop, cx, beamBot);
      beam.addColorStop(0, 'rgba(130,170,255,0)');
      beam.addColorStop(0.55, 'rgba(130,170,255,.26)');
      beam.addColorStop(1, 'rgba(190,220,255,.38)');
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(cx - beamW / 2, beamBot);
      c.lineTo(cx + beamW / 2, beamBot);
      c.lineTo(cx + beamW * 0.14, beamTop);
      c.lineTo(cx - beamW * 0.14, beamTop);
      c.closePath();
      c.fill();"""

new = """      // 深渊裂隙：从底部向上张开的不规则锯齿光缝（上方顶点锐利，底部宽开）
      var cx = vw / 2;
      var riftTop = vh * 0.56;
      var riftBot = vh + 30;
      var seg = 36;
      var half = 8;
      c.beginPath();
      c.moveTo(cx, riftTop);
      for (var y = riftTop + seg * 0.5; y < riftBot; y += seg) {
        var t = (y - riftTop) / (riftBot - riftTop);
        half = 6 + t * t * 150;          // 越往下越宽（顶部 ~6px，底部 ~156px）
        c.lineTo(cx - half + (Math.random() - 0.5) * 16, y);
      }
      c.lineTo(cx - half - 16, riftBot);
      for (var y2 = riftBot; y2 > riftTop; y2 -= seg) {
        var t2 = (y2 - riftTop) / (riftBot - riftTop);
        var half2 = 6 + t2 * t2 * 150;
        c.lineTo(cx + half2 + (Math.random() - 0.5) * 16, y2);
      }
      c.closePath();
      var beam = c.createLinearGradient(cx, riftTop, cx, riftBot);
      beam.addColorStop(0, 'rgba(235,245,255,1)');          // 尖端亮
      beam.addColorStop(0.35, 'rgba(180,220,255,.85)');
      beam.addColorStop(1, 'rgba(130,180,255,.5)');         // 底部略暗
      c.fillStyle = beam;
      c.fill();

      // 裂隙外圈光晕（向两侧扩散，宽广）
      var bg2 = c.createRadialGradient(cx, vh * 0.72, 0, cx, vh * 0.72, Math.max(vw, vh) * 0.46);
      bg2.addColorStop(0, 'rgba(170,220,255,.45)');
      bg2.addColorStop(1, 'rgba(170,220,255,0)');
      c.fillStyle = bg2;
      c.fillRect(0, 0, vw, vh);"""
assert old in src, 'old not found'
src = src.replace(old, new)

old_halo = """      // 裂隙光顶部扩散（柔和椭圆光晕）
      var halo = c.createRadialGradient(cx, beamTop, 0, cx, beamTop, beamW * 0.7);
      halo.addColorStop(0, 'rgba(170,210,255,.28)');
      halo.addColorStop(1, 'rgba(170,210,255,0)');
      c.fillStyle = halo;
      c.fillRect(0, 0, vw, vh);"""

new_halo = """      // 裂隙顶部扩散光晕（让标题底部像从光中升起）
      var halo = c.createRadialGradient(cx, riftTop, 0, cx, riftTop, vw * 0.34);
      halo.addColorStop(0, 'rgba(200,230,255,.4)');
      halo.addColorStop(1, 'rgba(200,230,255,0)');
      c.fillStyle = halo;
      c.fillRect(0, 0, vw, vh);

      // 裂隙中心高光（白色亮线，让裂隙有「裂开」感）
      c.beginPath();
      c.moveTo(cx, riftTop);
      c.lineTo(cx, riftBot);
      c.strokeStyle = 'rgba(255,255,255,.92)';
      c.lineWidth = 2.5;
      c.shadowColor = 'rgba(200,230,255,1)';
      c.shadowBlur = 16;
      c.stroke();
      c.shadowBlur = 0;"""
assert old_halo in src, 'halo old not found'
src = src.replace(old_halo, new_halo)

io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('RIFT REDESIGNED')
