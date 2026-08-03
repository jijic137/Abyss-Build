import io
p = 'js/09_ui.js'
src = io.open(p, encoding='utf-8').read()

# 裂隙宽度 150 → 78
src = src.replace("half = 4 + t * t * 150;", "half = 4 + t * t * 78;")
src = src.replace("var half2 = 4 + t2 * t2 * 150;", "var half2 = 4 + t2 * t2 * 78;")

# 裂隙顶端从 0.56 → 0.62（让裂隙离标题更远，不抢）
src = src.replace("var riftTop = vh * 0.56;", "var riftTop = vh * 0.62;")

# 顶部扩散光晕从 0.34 → 0.18
src = src.replace("createRadialGradient(cx, riftTop, 0, cx, riftTop, vw * 0.34);\n      halo.addColorStop(0, 'rgba(200,230,255,.4)');",
  "createRadialGradient(cx, riftTop, 0, cx, riftTop, vw * 0.18);\n      halo.addColorStop(0, 'rgba(200,230,255,.22)';")

# 外圈光晕从 0.46 → 0.26, alpha 0.45 → 0.28
src = src.replace("createRadialGradient(cx, vh * 0.72, 0, cx, vh * 0.72, Math.max(vw, vh) * 0.46);\n      bg2.addColorStop(0, 'rgba(170,220,255,.45)');",
  "createRadialGradient(cx, vh * 0.74, 0, cx, vh * 0.74, Math.max(vw, vh) * 0.26);\n      bg2.addColorStop(0, 'rgba(170,220,255,.28)';")

# 顶部暖光减弱（避免背景太亮）
src = src.replace("rgba(255,210,74,.07)');", "rgba(255,210,74,.04)');")

# 中心高光从 0.92 → 0.7, 2.5 → 1.6
src = src.replace("'rgba(255,255,255,.92)';\n      c.lineWidth = 2.5;\n      c.shadowColor = 'rgba(200,230,255,1)';\n      c.shadowBlur = 16;",
  "'rgba(255,255,255,.7)';\n      c.lineWidth = 1.8;\n      c.shadowColor = 'rgba(200,230,255,.8)';\n      c.shadowBlur = 10;")

# 按钮位置：让入口徽章正好悬在裂隙尖端上方
# 之前 cover-entry top:55%，现在让裂隙尖端在 0.62vh，按钮让裂隙尖端在按钮下方
# 按钮保持在 55% 让裂隙尖端在 62% 高于按钮 7%，增加空间

# 背景渐变中心点（让中心略亮但不强）：保持不变

io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('TUNED')
