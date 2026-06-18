/*  guqin.js  —  琵琶行手势交互
 *  配套  guqin-gesture.html  使用
 */

/* =========  配置  ========= */
var C = {
  strCount: 4,
  flowSpeed: 2.0,
  cooldown: 350,
  mpReady: false
};

/* =========  诗歌库 · 琵琶行  ========= */
var POEMS = [
  "浔阳江头夜送客 枫叶荻花秋瑟瑟",
  "主人下马客在船 举酒欲饮无管弦",
  "醉不成欢惨将别 别时茫茫江浸月",
  "忽闻水上琵琶声 主人忘归客不发",
  "寻声暗问弹者谁 琵琶声停欲语迟",
  "移船相近邀相见 添酒回灯重开宴",
  "千呼万唤始出来 犹抱琵琶半遮面",
  "转轴拨弦三两声 未成曲调先有情",
  "弦弦掩抑声声思 似诉平生不得志",
  "低眉信手续续弹 说尽心中无限事",
  "轻拢慢捻抹复挑 初为霓裳后六幺",
  "大弦嘈嘈如急雨 小弦切切如私语",
  "嘈嘈切切错杂弹 大珠小珠落玉盘",
  "间关莺语花底滑 幽咽泉流冰下难",
  "冰泉冷涩弦凝绝 凝绝不通声暂歇",
  "别有幽愁暗恨生 此时无声胜有声",
  "银瓶乍破水浆迸 铁骑突出刀枪鸣",
  "曲终收拨当心画 四弦一声如裂帛",
  "东船西舫悄无言 唯见江心秋月白",
  "沉吟放拨插弦中 整顿衣裳起敛容",
  "自言本是京城女 家在虾蟆陵下住",
  "十三学得琵琶成 名属教坊第一部",
  "曲罢曾教善才服 妆成每被秋娘妒",
  "五陵年少争缠头 一曲红绡不知数",
  "钿头银篦击节碎 血色罗裙翻酒污",
  "今年欢笑复明年 秋月春风等闲度",
  "弟走从军阿姨死 暮去朝来颜色故",
  "门前冷落鞍马稀 老大嫁作商人妇",
  "商人重利轻别离 前月浮梁买茶去",
  "去来江口守空船 绕船月明江水寒",
  "夜深忽梦少年事 梦啼妆泪红阑干",
  "我闻琵琶已叹息 又闻此语重唧唧",
  "同是天涯沦落人 相逢何必曾相识",
  "我从去年辞帝京 谪居卧病浔阳城",
  "浔阳地僻无音乐 终岁不闻丝竹声",
  "住近湓江地低湿 黄芦苦竹绕宅生",
  "其间旦暮闻何物 杜鹃啼血猿哀鸣",
  "春江花朝秋月夜 往往取酒还独倾",
  "岂无山歌与村笛 呕哑嘲哳难为听",
  "今夜闻君琵琶语 如听仙乐耳暂明",
  "莫辞更坐弹一曲 为君翻作琵琶行",
  "感我此言良久立 却坐促弦弦转急",
  "凄凄不似向前声 满座重闻皆掩泣",
  "座中泣下谁最多 江州司马青衫湿"
];

/* =========  琵琶四弦音高  ========= */
var NOTES = [
  { f: 220.0, n: 'A₃' },   /* 琵琶一弦 · 缠弦 */
  { f: 293.7, n: 'D₄' },   /* 琵琶二弦 · 老弦 */
  { f: 329.6, n: 'E₄' },   /* 琵琶三弦 · 中弦 */
  { f: 440.0, n: 'A₄' }    /* 琵琶四弦 · 子弦 */
];

/* =========  全局状态  ========= */
var S = {
  ac: null,
  lastP: {},
  started: false,
  down: false,
  prevX: null,
  prevY: null,
  lm: null,
  mode: 'mouse',
  hands: null,
  camStream: null,
  lastPoem: 0,
  poemCooldown: 10000
};

/* =========  水墨背景图  ========= */
var bgInkImg = new Image();
bgInkImg.src = 'bg-ink.jpg';
bgInkImg.onload = function() { console.log('[BG] 水墨背景加载完成'); };
bgInkImg.onerror = function() { console.warn('[BG] 水墨背景加载失败'); };

/* =========  画布  ========= */
var cv = document.getElementById('c');
var cx = cv.getContext('2d');
var W, H;

function resizeCanvas() {
  W = cv.width = window.innerWidth;
  H = cv.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* =========  音频  ========= */
function initAudio() {
  if (S.ac) return;
  S.ac = new (window.AudioContext || window.webkitAudioContext)();
  /* 全局混响 */
  if (!S._conv) {
    var len = S.ac.sampleRate * 1.2;
    S._conv = S.ac.createConvolver();
    var buf = S.ac.createBuffer(2, len, S.ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        /* 琵琶需要短而干的混响 — 模拟室内近场 */
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * 0.25;
      }
    }
    S._conv.buffer = buf;
    S._dryGain = S.ac.createGain();
    S._dryGain.gain.value = 0.82;
    S._wetGain = S.ac.createGain();
    S._wetGain.gain.value = 0.18;
    S._conv.connect(S._wetGain);
    S._wetGain.connect(S.ac.destination);
    S._dryGain.connect(S.ac.destination);
    /* 开始页旋律专用增益节点（40%音量，可渐隐） */
    S._introGain = S.ac.createGain();
    S._introGain.gain.value = 0.4;
    S._introGain.connect(S._dryGain);
    S._introGain.connect(S._conv);
  }
}

/* 连接到总输出（干声+混响） */
function toOut(node) {
  node.connect(S._dryGain);
  node.connect(S._conv);
}

/* =========  开始页循环琵琶旋律  ========= */
var INTRO_MELODY = [
  /* 一段疏朗的「三两声」式起手，~18秒一循环 */
  { idx: 0, tech: 'mo',       gap: 0 },       /* A₃ 抹 — 低回起笔 */
  { idx: 1, tech: 'mo',       gap: 1800 },    /* D₄ 抹 */
  { idx: 2, tech: 'tiao',     gap: 1200 },    /* E₄ 挑 — 微扬 */
  { idx: 3, tech: 'harmonic', gap: 1300 },    /* A₄ 泛音 — 空灵 */
  { idx: 2, tech: 'mo',       gap: 2000 },    /* E₄ 抹 — 下行 */
  { idx: 1, tech: 'lun',      gap: 1000 },    /* D₄ 轮指 */
  { idx: 0, tech: 'tiao',     gap: 1000 },    /* A₃ 挑 — 回根 */
  { idx: 0, tech: 'harmonic', gap: 2200 },    /* A₃ 泛音 — 余韵 */
  { idx: 1, tech: 'tiao',     gap: 1500 },    /* D₄ 挑 */
  { idx: 2, tech: 'lun',      gap: 1000 },    /* E₄ 轮指 */
  { idx: 3, tech: 'mo',       gap: 1200 },    /* A₄ 抹 */
  { idx: 1, tech: 'harmonic', gap: 1400 },    /* D₄ 泛音 — 悬停 */
  { idx: 0, tech: 'mo',       gap: 2000 }     /* A₃ 抹 — 收束 */
];

var _introTimers = [];
var _introLoopTimer = null;
var _pluckCount = 0;

function playIntroNote(idx, tech) {
  if (!S.ac || !S._introGain) return;
  var n = NOTES[idx];
  if (!n) return;
  var t = S.ac.currentTime;
  var f = n.f * (1 + (Math.random() - 0.5) * 0.004);
  var vol = 0.4;  /* 安静背景 40% */

  /* 1. 拨弦攻击 */
  var atkLen = tech === 'lun' ? 0.015 : 0.03;
  var atkBuf = S.ac.createBuffer(1, S.ac.sampleRate * atkLen, S.ac.sampleRate);
  var atkData = atkBuf.getChannelData(0);
  for (var ai = 0; ai < atkData.length; ai++) {
    atkData[ai] = (Math.random() * 2 - 1) * Math.pow(1 - ai / atkData.length, 8);
  }
  var atkSrc = S.ac.createBufferSource();
  atkSrc.buffer = atkBuf;
  var atkLP = S.ac.createBiquadFilter();
  atkLP.type = 'lowpass';
  atkLP.frequency.value = f * 4;
  atkLP.Q.value = 0.5;
  var atkGain = S.ac.createGain();
  atkGain.gain.setValueAtTime(vol * 0.3, t);
  atkGain.gain.exponentialRampToValueAtTime(0.001, t + atkLen);
  atkSrc.connect(atkLP).connect(atkGain);
  atkGain.connect(S._introGain);
  atkSrc.start(t);
  atkSrc.stop(t + atkLen);

  /* 2. 主音 */
  var oMain = S.ac.createOscillator();
  if (tech === 'harmonic') oMain.type = 'sine';
  else if (tech === 'mo') oMain.type = 'triangle';
  else oMain.type = 'sawtooth';
  var pitchBend = tech === 'tiao' ? 1.012 : 1.003;
  oMain.frequency.setValueAtTime(f * pitchBend, t);
  oMain.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  var gMain = S.ac.createGain();
  var peak = vol * (tech === 'tiao' ? 0.6 : tech === 'mo' ? 0.4 : tech === 'lun' ? 0.3 : 0.25);
  gMain.gain.setValueAtTime(0, t);
  gMain.gain.linearRampToValueAtTime(peak, t + 0.003);
  gMain.gain.exponentialRampToValueAtTime(peak * 0.4, t + 0.08);
  gMain.gain.exponentialRampToValueAtTime(peak * 0.15, t + 0.6);
  gMain.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
  var lpMain = S.ac.createBiquadFilter();
  lpMain.type = 'lowpass';
  lpMain.frequency.setValueAtTime(f * 3.5, t);
  lpMain.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.5);
  lpMain.Q.value = 1;
  oMain.connect(lpMain).connect(gMain);
  gMain.connect(S._introGain);
  oMain.start(t);
  oMain.stop(t + 4.0);

  /* 3. 余韵吟音 */
  var oTail = S.ac.createOscillator();
  oTail.type = 'sine';
  oTail.frequency.setValueAtTime(f, t);
  var vibSpeed = tech === 'tiao' ? 0.2 : tech === 'mo' ? 0.5 : 0.35;
  var vibDepth = 0.002;
  var vibT = t;
  for (var vi = 0; vi < 6; vi++) {
    oTail.frequency.linearRampToValueAtTime(f * (1 + vibDepth), vibT + vibSpeed * 0.5);
    oTail.frequency.linearRampToValueAtTime(f * (1 - vibDepth * 0.6), vibT + vibSpeed);
    vibT += vibSpeed;
  }
  var gTail = S.ac.createGain();
  gTail.gain.setValueAtTime(0, t);
  gTail.gain.linearRampToValueAtTime(vol * 0.15, t + 0.15);
  gTail.gain.exponentialRampToValueAtTime(vol * 0.06, t + 1.0);
  gTail.gain.exponentialRampToValueAtTime(0.001, t + 6.0);
  var lpTail = S.ac.createBiquadFilter();
  lpTail.type = 'lowpass';
  lpTail.frequency.value = f * 1.2;
  oTail.connect(lpTail).connect(gTail);
  gTail.connect(S._introGain);
  oTail.start(t);
  oTail.stop(t + 6.0);

  /* 轮指额外弱音 */
  if (tech === 'lun') {
    for (var ri = 1; ri <= 2; ri++) {
      var rDelay = ri * 0.06;
      var rOsc = S.ac.createOscillator();
      rOsc.type = 'sawtooth';
      rOsc.frequency.setValueAtTime(f * 1.005, t + rDelay);
      rOsc.frequency.exponentialRampToValueAtTime(f, t + rDelay + 0.02);
      var rGain = S.ac.createGain();
      rGain.gain.setValueAtTime(0, t + rDelay);
      rGain.gain.linearRampToValueAtTime(vol * 0.15, t + rDelay + 0.002);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + rDelay + 0.3);
      var rLP = S.ac.createBiquadFilter();
      rLP.type = 'lowpass';
      rLP.frequency.value = f * 3;
      rOsc.connect(rLP).connect(rGain);
      rGain.connect(S._introGain);
      rOsc.start(t + rDelay);
      rOsc.stop(t + rDelay + 0.3);
    }
  }
}

function startIntroMusic() {
  stopIntroMusic(true);  /* 先清理旧定时器 */
  if (!S.ac || !S._introGain) return;
  S._introGain.gain.setValueAtTime(0.4, S.ac.currentTime);

  var totalDelay = 0;
  for (var i = 0; i < INTRO_MELODY.length; i++) {
    var note = INTRO_MELODY[i];
    totalDelay += note.gap;
    _introTimers.push(setTimeout(function(idx2, tech2) {
      playIntroNote(idx2, tech2);
    }, totalDelay, note.idx, note.tech));
  }

  /* 循环：旋律结束 + 3.5秒留白后重新开始 */
  _introLoopTimer = setTimeout(function() {
    startIntroMusic();
  }, totalDelay + 3500);
}

function stopIntroMusic(immediate) {
  for (var i = 0; i < _introTimers.length; i++) {
    clearTimeout(_introTimers[i]);
  }
  _introTimers = [];
  if (_introLoopTimer) {
    clearTimeout(_introLoopTimer);
    _introLoopTimer = null;
  }
  if (S.ac && S._introGain) {
    if (immediate) {
      S._introGain.gain.setValueAtTime(0, S.ac.currentTime);
    } else {
      /* 2秒渐隐 */
      S._introGain.gain.setValueAtTime(S._introGain.gain.value, S.ac.currentTime);
      S._introGain.gain.linearRampToValueAtTime(0, S.ac.currentTime + 2.0);
    }
  }
}

function playNote(idx) {
  if (!S.ac) return;
  var n = NOTES[idx];
  if (!n) return;
  var t = S.ac.currentTime;
  var f = n.f;

  /* 随机选指法，影响音色 */
  var techniques = ['tiao', 'mo', 'lun', 'harmonic'];
  var tech = techniques[Math.floor(Math.random() * techniques.length)];
  /* 随机微调音高（±5音分）让每次弹都不完全一样 */
  var detune = 1 + (Math.random() - 0.5) * 0.006;
  f = f * detune;

  /* 弦序性格 */
  var warmByString = [1.0, 0.95, 0.9, 0.85];  /* 低弦暖，高弦亮 */
  var warmth = warmByString[idx];

  /* —— 1. 拨弦攻击 — 根据指法变化 —— */
  var atkLen = tech === 'lun' ? 0.015 : 0.03;
  var atkBuf = S.ac.createBuffer(1, S.ac.sampleRate * atkLen, S.ac.sampleRate);
  var atkData = atkBuf.getChannelData(0);
  for (var ai = 0; ai < atkData.length; ai++) {
    atkData[ai] = (Math.random() * 2 - 1) * Math.pow(1 - ai / atkData.length, 8);
  }
  var atkSrc = S.ac.createBufferSource();
  atkSrc.buffer = atkBuf;
  var atkLP = S.ac.createBiquadFilter();
  atkLP.type = 'lowpass';
  atkLP.frequency.value = f * (tech === 'tiao' ? 6 : tech === 'harmonic' ? 3 : 5) * warmth;
  atkLP.Q.value = 0.5;
  var atkGain = S.ac.createGain();
  atkGain.gain.setValueAtTime(tech === 'lun' ? 0.08 : 0.12, t);
  atkGain.gain.exponentialRampToValueAtTime(0.001, t + atkLen);
  atkSrc.connect(atkLP).connect(atkGain);
  toOut(atkGain);
  atkSrc.start(t);
  atkSrc.stop(t + atkLen);

  /* —— 2. 主音 — 根据指法选波形和包络 —— */
  var oMain = S.ac.createOscillator();
  if (tech === 'harmonic') {
    oMain.type = 'sine';                    /* 泛音：纯净正弦 */
  } else if (tech === 'mo') {
    oMain.type = 'triangle';                /* 抹：柔和三角波 */
  } else {
    oMain.type = 'sawtooth';                /* 挑/轮指：锯齿波有棱角 */
  }
  /* 拨弦音高微升→回落 */
  var pitchBend = tech === 'tiao' ? 1.012 : tech === 'mo' ? 1.005 : 1.003;
  oMain.frequency.setValueAtTime(f * pitchBend, t);
  oMain.frequency.exponentialRampToValueAtTime(f, t + (tech === 'tiao' ? 0.05 : 0.03));

  var gMain = S.ac.createGain();
  var mainPeak, mainDecay, mainTail;
  if (tech === 'tiao') {
    mainPeak = 0.24; mainDecay = 0.10; mainTail = 0.008;   /* 挑：有力起音 */
  } else if (tech === 'mo') {
    mainPeak = 0.16; mainDecay = 0.08; mainTail = 0.006;   /* 抹：柔和 */
  } else if (tech === 'lun') {
    mainPeak = 0.12; mainDecay = 0.06; mainTail = 0.005;   /* 轮指：轻快 */
  } else {
    mainPeak = 0.10; mainDecay = 0.03; mainTail = 0.002;   /* 泛音：飘逸 */
  }
  gMain.gain.setValueAtTime(0, t);
  gMain.gain.linearRampToValueAtTime(mainPeak, t + 0.003);
  gMain.gain.exponentialRampToValueAtTime(mainDecay, t + 0.08);
  gMain.gain.exponentialRampToValueAtTime(mainDecay * 0.3, t + 0.6);
  gMain.gain.exponentialRampToValueAtTime(mainTail, t + 2.5);
  gMain.gain.exponentialRampToValueAtTime(0.001, t + 6.0);

  var lpMain = S.ac.createBiquadFilter();
  lpMain.type = 'lowpass';
  var lpInit = tech === 'tiao' ? f * 5 : tech === 'mo' ? f * 3.5 : tech === 'harmonic' ? f * 2.5 : f * 4;
  lpMain.frequency.setValueAtTime(lpInit, t);
  lpMain.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.5);
  lpMain.frequency.exponentialRampToValueAtTime(f * 1.1, t + 3.0);
  lpMain.Q.value = 1.2;

  var bodyRes = S.ac.createBiquadFilter();
  bodyRes.type = 'peaking';
  bodyRes.frequency.value = 600 + idx * 80;
  bodyRes.Q.value = 2;
  bodyRes.gain.value = tech === 'harmonic' ? 1 : 3;
  oMain.connect(lpMain).connect(bodyRes).connect(gMain);
  toOut(gMain);
  oMain.start(t);
  oMain.stop(t + 6.0);

  /* —— 3. 基音垫底 — 泛音指法跳过此层 —— */
  if (tech !== 'harmonic') {
    var oBase = S.ac.createOscillator();
    oBase.type = 'sine';
    oBase.frequency.setValueAtTime(f, t);
    var gBase = S.ac.createGain();
    gBase.gain.setValueAtTime(0, t);
    gBase.gain.linearRampToValueAtTime(tech === 'mo' ? 0.10 : 0.14, t + 0.005);
    gBase.gain.exponentialRampToValueAtTime(0.04, t + 0.15);
    gBase.gain.exponentialRampToValueAtTime(0.012, t + 1.5);
    gBase.gain.exponentialRampToValueAtTime(0.004, t + 4.0);
    gBase.gain.exponentialRampToValueAtTime(0.001, t + 9.0);
    oBase.connect(gBase);
    toOut(gBase);
    oBase.start(t);
    oBase.stop(t + 9.0);
  }

  /* —— 4. 泛音层 — 指法不同，泛音内容不同 —— */
  if (tech === 'harmonic') {
    /* 泛音指法：高次正弦，空灵 */
    var oH = S.ac.createOscillator();
    oH.type = 'sine';
    oH.frequency.setValueAtTime(f * (3 + Math.floor(Math.random() * 3)), t);  /* 3-5次泛音 */
    var gH = S.ac.createGain();
    gH.gain.setValueAtTime(0, t);
    gH.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gH.gain.exponentialRampToValueAtTime(0.02, t + 0.3);
    gH.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
    oH.connect(gH);
    toOut(gH);
    oH.start(t);
    oH.stop(t + 4.0);
  } else if (tech === 'tiao') {
    /* 挑：二次+三次泛音短闪 */
    var o2 = S.ac.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(f * 2, t);
    var g2 = S.ac.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o2.connect(g2);
    toOut(g2);
    o2.start(t);
    o2.stop(t + 1.5);

    var o3 = S.ac.createOscillator();
    o3.type = 'sine';
    o3.frequency.setValueAtTime(f * 3, t);
    var g3 = S.ac.createGain();
    g3.gain.setValueAtTime(0.03, t);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o3.connect(g3);
    toOut(g3);
    o3.start(t);
    o3.stop(t + 0.4);
  } else {
    /* 抹/轮指：轻柔二次泛音 */
    var o2b = S.ac.createOscillator();
    o2b.type = 'sine';
    o2b.frequency.setValueAtTime(f * 2, t);
    var g2b = S.ac.createGain();
    g2b.gain.setValueAtTime(0, t);
    g2b.gain.linearRampToValueAtTime(0.04, t + 0.005);
    g2b.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    var lp2b = S.ac.createBiquadFilter();
    lp2b.type = 'lowpass';
    lp2b.frequency.value = f * 2.5;
    o2b.connect(lp2b).connect(g2b);
    toOut(g2b);
    o2b.start(t);
    o2b.stop(t + 1.0);
  }

  /* —— 5. 余韵吟音 — 颤音速度随指法变化 —— */
  var oTail = S.ac.createOscillator();
  oTail.type = 'sine';
  oTail.frequency.setValueAtTime(f, t);
  /* 揉弦速度：挑=快颤，抹=慢颤，轮指=中颤，泛音=极慢 */
  var vibSpeed = tech === 'tiao' ? 0.2 : tech === 'mo' ? 0.5 : tech === 'lun' ? 0.35 : 0.8;
  var vibDepth = tech === 'harmonic' ? 0.001 : 0.003;
  var vibT = t;
  for (var vi = 0; vi < 9; vi++) {
    oTail.frequency.linearRampToValueAtTime(f * (1 + vibDepth), vibT + vibSpeed * 0.5);
    oTail.frequency.linearRampToValueAtTime(f * (1 - vibDepth * 0.6), vibT + vibSpeed);
    vibT += vibSpeed;
  }
  var gTail = S.ac.createGain();
  gTail.gain.setValueAtTime(0, t);
  gTail.gain.linearRampToValueAtTime(tech === 'harmonic' ? 0.03 : 0.06, t + 0.15);
  gTail.gain.exponentialRampToValueAtTime(0.02, t + 1.0);
  gTail.gain.exponentialRampToValueAtTime(0.006, t + 4.0);
  gTail.gain.exponentialRampToValueAtTime(0.001, t + 9.0);
  var lpTail = S.ac.createBiquadFilter();
  lpTail.type = 'lowpass';
  lpTail.frequency.value = f * 1.2;
  oTail.connect(lpTail).connect(gTail);
  toOut(gTail);
  oTail.start(t);
  oTail.stop(t + 9.0);

  /* —— 6. 轮指额外：快速重复2-3个弱音 —— */
  if (tech === 'lun') {
    for (var ri = 1; ri <= 2; ri++) {
      var rDelay = ri * 0.06;
      var rOsc = S.ac.createOscillator();
      rOsc.type = 'sawtooth';
      rOsc.frequency.setValueAtTime(f * 1.005, t + rDelay);
      rOsc.frequency.exponentialRampToValueAtTime(f, t + rDelay + 0.02);
      var rGain = S.ac.createGain();
      rGain.gain.setValueAtTime(0, t + rDelay);
      rGain.gain.linearRampToValueAtTime(0.06, t + rDelay + 0.002);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + rDelay + 0.3);
      var rLP = S.ac.createBiquadFilter();
      rLP.type = 'lowpass';
      rLP.frequency.value = f * 3;
      rOsc.connect(rLP).connect(rGain);
      toOut(rGain);
      rOsc.start(t + rDelay);
      rOsc.stop(t + rDelay + 0.3);
    }
  }
}

/* =========  古琴几何  ========= */
function guqinRect() {
  return { x: 60, y: 30, w: W - 120, h: 100 };
}

function getStringPositions() {
  var r = guqinRect();
  var out = [];
  var i, t, entry;
  for (i = 0; i < C.strCount; i++) {
    t = (i + 0.5) / C.strCount;
    entry = {
      sx: r.x + r.w * 0.09,
      sy: r.y + r.h * 0.15 + r.h * 0.7 * t,
      ex: r.x + r.w * 0.94,
      ey: r.y + r.h * 0.15 + r.h * 0.7 * t,
      mx: r.x + r.w * 0.5,
      my: r.y + r.h * 0.15 + r.h * 0.7 * t - Math.sin(t * Math.PI) * 6,
      index: i
    };
    out.push(entry);
  }
  return out;
}

function hitTest(px, py) {
  var sp = getStringPositions();
  var ci = -1;
  var cd = Infinity;
  var i, dist;
  for (i = 0; i < sp.length; i++) {
    /* 琴弦水平排列，用Y坐标区分弦序 */
    dist = Math.abs(py - sp[i].my);
    if (dist < cd) {
      cd = dist;
      ci = i;
    }
  }
  /* 确保点击在琴区域内 */
  var r = guqinRect();
  if (py < r.y || py > r.y + r.h) return -1;
  return ci;
}

/* =========  触发弹奏  ========= */
function doPluck(idx) {
  if (idx < 0 || idx >= C.strCount) return;
  var key = 's' + idx;
  var now = Date.now();
  if (S.lastP[key] && now - S.lastP[key] < C.cooldown) return;
  S.lastP[key] = now;
  playNote(idx);
  spawnPoem(idx);
  spawnInk(idx);
  showStatus(idx);
  /* 弹3次后渐隐开场旋律，过渡到纯交互音效 */
  _pluckCount++;
  if (_pluckCount >= 3) stopIntroMusic(false);
}

function showStatus(idx) {
  var names = ['缠弦', '老弦', '中弦', '子弦'];
  var st = document.getElementById('statusBar');
  var ri = Math.floor(Math.random() * POEMS.length);
  st.textContent = String.fromCharCode(55356, 57173) + ' ' + names[idx] + '  ·  ' + POEMS[ri];
  st.style.opacity = '1';
  setTimeout(function() { st.style.opacity = '0'; }, 3000);

  /* 顶部显示古诗词 — 只在诗句冷却通过时更新 */
  var now = Date.now();
  var poemDisplay = document.getElementById('poemDisplay');
  if (poemDisplay && now - S.lastPoem < 100) {
    poemDisplay.textContent = POEMS[ri];
    poemDisplay.style.opacity = '1';
  }
}

/* =========  绘制古琴  ========= */
function drawGuqin() {
  var r = guqinRect();
  var rr = 10;

  /* 阴影 */
  cx.save();
  cx.shadowColor = 'rgba(160,120,60,0.22)';
  cx.shadowBlur = 30;
  cx.shadowOffsetY = 8;

  /* 琴身渐变 */
  var g = cx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  g.addColorStop(0,   '#3c2a18');
  g.addColorStop(0.3, '#2e1e10');
  g.addColorStop(0.7, '#261810');
  g.addColorStop(1,   '#1c0e06');
  cx.fillStyle = g;

  /* 琴身形状 */
  cx.beginPath();
  cx.moveTo(r.x + r.w * 0.04 + rr, r.y);
  cx.arcTo(r.x + r.w * 0.04, r.y, r.x + r.w * 0.04, r.y + rr, rr);
  cx.lineTo(r.x + r.w * 0.04, r.y + r.h - rr);
  cx.arcTo(r.x + r.w * 0.04, r.y + r.h, r.x + r.w * 0.04 + rr, r.y + r.h, rr);
  cx.lineTo(r.x + r.w * 0.96, r.y + r.h);
  cx.arcTo(r.x + r.w * 0.96, r.y + r.h, r.x + r.w * 0.96, r.y + r.h - rr, rr);
  cx.lineTo(r.x + r.w * 0.96, r.y + rr);
  cx.arcTo(r.x + r.w * 0.96, r.y, r.x + r.w * 0.96 - rr, r.y, rr);
  cx.closePath();
  cx.fill();
  cx.restore();

  /* 岳山 */
  cx.fillStyle = 'rgba(180,140,60,0.45)';
  cx.fillRect(r.x + r.w * 0.93, r.y + r.h * 0.08, r.w * 0.018, r.h * 0.84);

  /* 龙龈 */
  cx.fillStyle = 'rgba(180,140,60,0.35)';
  cx.fillRect(r.x + r.w * 0.05, r.y + r.h * 0.08, r.w * 0.018, r.h * 0.84);

  /* 琴徽 */
  var hu = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
  var hi, hx;
  for (hi = 0; hi < hu.length; hi++) {
    hx = r.x + r.w * 0.07 + r.w * 0.86 * hu[hi];
    cx.beginPath();
    cx.arc(hx, r.y + r.h / 2, 3.2, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(210,180,120,0.4)';
    cx.fill();
  }

  /* 琴弦 + 振动 */
  var sp = getStringPositions();
  var si, s, amp, vKey, el, steps, st2, px2, vib, py2, sg;
  for (si = 0; si < sp.length; si++) {
    s = sp[si];
    amp = 0;                                  /* 静止弦不抖 */
    vKey = 's' + si;
    if (S.lastP[vKey]) {
      el = Date.now() - S.lastP[vKey];
      if (el < 3000) {                        /* 振动持续3秒 */
        amp = Math.sin(el * 0.025) * 14 * (1 - el / 3000);  /* 更大振幅，慢衰减 */
      } else {
        delete S.lastP[vKey];
      }
    }
    cx.beginPath();
    steps = 40;
    for (st2 = 0; st2 <= 1; st2 += 1 / steps) {
      px2 = s.sx + (s.ex - s.sx) * st2;
      vib = Math.sin(st2 * Math.PI * 5 + Date.now() * 0.014);
      vib = vib * amp * (1 - Math.abs(st2 - 0.5) * 1.2);
      py2 = s.my + vib;
      if (st2 === 0) {
        cx.moveTo(px2, py2);
      } else {
        cx.lineTo(px2, py2);
      }
    }
    sg = cx.createLinearGradient(s.sx, 0, s.ex, 0);
    sg.addColorStop(0,   'rgba(200,185,140,0.45)');
    sg.addColorStop(0.5, 'rgba(230,215,170,0.7)');
    sg.addColorStop(1,   'rgba(200,185,140,0.45)');
    cx.strokeStyle = sg;
    cx.lineWidth = 1.8 - si * 0.2;
    cx.stroke();
  }
}

/* =========  诗歌粒子  ========= */
var PP = [];
var IP = [];

function spawnPoem(idx) {
  var now = Date.now();
  if (now - S.lastPoem < S.poemCooldown) return;
  S.lastPoem = now;
  PP.length = 0;
  var sp = getStringPositions();
  var s = sp[idx];
  if (!s) return;
  var txt = POEMS[Math.floor(Math.random() * POEMS.length)];
  var chars = txt.split('');
  /* 一个一个掉：每个字从琴弦下方同一点出发，延时逐个出现 */
  var bx = s.mx;
  var startY = s.my + 30;
  var i, ch, p;
  for (i = 0; i < chars.length; i++) {
    ch = chars[i];
    p = {
      char:  ch,
      x:     bx,
      y:     startY,                        /* 都从同一点出发 */
      vy:    C.flowSpeed * 1.0,              /* 稍快掉落 */
      alpha: 0,
      ta:    0.82 + Math.random() * 0.18,
      size:  26 + Math.random() * 8,
      wob:   Math.random() * 6.283,
      ws:    0.008 + Math.random() * 0.012,
      life:  1.0,
      delay: i * 30,                         /* 每字间隔约480ms，明显拉开间距 */
      born:  Date.now()
    };
    PP.push(p);
  }
}

function spawnInk(idx) {
  var sp = getStringPositions();
  var s = sp[idx];
  if (!s) return;
  var i, q;
  for (i = 0; i < 9; i++) {
    q = {
      x:     s.sx + (Math.random() - 0.5) * 30,
      y:     s.my + 10 + Math.random() * 10,  /* 从琴弦下方 */
      vx:    (Math.random() - 0.5) * 1.8,
      vy:    1.2 + Math.random() * 2.5,       /* 向下落 */
      r:     1 + Math.random() * 3.2,
      alpha: 0.55 + Math.random() * 0.35,
      life:  1.0,
      decay: 0.0065 + Math.random() * 0.011
    };
    IP.push(q);
  }
}

function drawParticles() {
  var now = Date.now();
  var i, p;

  /* 诗歌文字 — 从琴向下逐字流淌 */
  for (i = PP.length - 1; i >= 0; i--) {
    p = PP[i];
    if (now - p.born < p.delay * 16) continue;
    p.y += p.vy;
    p.wob += p.ws;
    p.x += Math.sin(p.wob) * 0.5;
    if (p.alpha < p.ta) p.alpha += 0.035;   /* 更快显现 */
    if (p.y > H * 0.78) p.life -= 0.008;
    if (p.life <= 0 || p.y > H + 30) { PP.splice(i, 1); continue; }
    cx.save();
    cx.globalAlpha = Math.max(0, p.alpha * p.life);
    cx.font = p.size + 'px STKaiti, KaiTi, serif';
    cx.textAlign = 'center';
    cx.shadowColor = 'rgba(200,170,100,0.3)';
    cx.shadowBlur = 11;
    cx.fillStyle = 'rgba(220,200,160,' + (p.alpha * p.life) + ')';
    cx.fillText(p.char, p.x, p.y);
    cx.restore();
  }

  /* 墨粒子 */
  var j, q2;
  for (j = IP.length - 1; j >= 0; j--) {
    q2 = IP[j];
    q2.x += q2.vx;
    q2.y += q2.vy;
    q2.vy += 0.05;    /* 向下加速 */
    q2.life -= q2.decay;
    if (q2.life <= 0) { IP.splice(j, 1); continue; }
    cx.beginPath();
    cx.arc(q2.x, q2.y, q2.r * q2.life, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(55,45,35,' + (q2.alpha * q2.life) + ')';
    cx.fill();
  }
}

/* =========  指针事件（鼠标 + 触屏）  ========= */
cv.addEventListener('mousedown', function(e) {
  S.down = true;
  onPointer(e.clientX, e.clientY);
});
cv.addEventListener('mousemove', function(e) {
  if (S.down) onPointer(e.clientX, e.clientY);
});
cv.addEventListener('mouseup', function() { S.down = false; });

cv.addEventListener('touchstart', function(e) {
  e.preventDefault();
  S.down = true;
  onPointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
cv.addEventListener('touchmove', function(e) {
  e.preventDefault();
  onPointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
cv.addEventListener('touchend', function() { S.down = false; });

function onPointer(px, py) {
  var idx = hitTest(px, py);
  if (idx >= 0) doPluck(idx);
}

/* =========  动画循环  ========= */
function animate() {
  /* 清屏 */
  cx.fillStyle = '#0a0a12';
  cx.fillRect(0, 0, W, H);

  /* 水墨背景（20% 透明度） */
  if (bgInkImg.complete && bgInkImg.naturalWidth > 0) {
    cx.save();
    cx.globalAlpha = 0.2;
    cx.drawImage(bgInkImg, 0, 0, W, H);
    cx.restore();
  }

  /* 背景光晕 — 琴的位置在上方 */
  var bg = cx.createRadialGradient(W / 2, 80, 0, W / 2, 80, H * 0.55);
  bg.addColorStop(0,   'rgba(40,30,20,0.12)');
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);

  drawGuqin();
  drawParticles();

  /* 手势模式：画手部骨架 */
  if (S.mode === 'hand' && S.lm) drawHand();

  requestAnimationFrame(animate);
}

/* =========  手部骨架绘制  ========= */
function drawHand() {
  var lm = S.lm;
  if (!lm) return;

  var CONN = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [0,5],[5,9],[9,13],[13,17]
  ];

  cx.strokeStyle = 'rgba(255,200,120,0.28)';
  cx.lineWidth = 1.4;
  var ci, a, b;
  for (ci = 0; ci < CONN.length; ci++) {
    a = lm[CONN[ci][0]];
    b = lm[CONN[ci][1]];
    cx.beginPath();
    cx.moveTo((1 - a.x) * W, a.y * H);
    cx.lineTo((1 - b.x) * W, b.y * H);
    cx.stroke();
  }

  var ki, pt, px, py;
  for (ki = 0; ki < lm.length; ki++) {
    pt = lm[ki];
    px = (1 - pt.x) * W;
    py = pt.y * H;
    cx.beginPath();
    cx.arc(px, py, ki === 8 ? 7 : 3, 0, Math.PI * 2);
    if (ki === 8) {
      cx.fillStyle = 'rgba(255,220,130,0.85)';
    } else if (ki === 4 || ki === 12 || ki === 16 || ki === 20) {
      cx.fillStyle = 'rgba(255,180,100,0.65)';
    } else {
      cx.fillStyle = 'rgba(255,220,170,0.35)';
    }
    cx.fill();
  }
}

/* =========  MediaPipe 手势追踪  ========= */
function loadJS(url, cb) {
  console.log('[MP] 加载脚本:', url);
  var s = document.createElement('script');
  s.src = url;
  s.crossOrigin = 'anonymous';
  s.onload = function() { console.log('[MP] 加载成功:', url); cb(true); };
  s.onerror = function() { console.error('[MP] 加载失败:', url); cb(false); };
  document.head.appendChild(s);
}

function initMP() {
  var st = document.getElementById('loadingMsg');
  st.textContent = '正在加载 MediaPipe Hands…';

  loadJS('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js', function(ok1) {
    if (!ok1) { st.textContent = 'Hands 加载失败'; return; }
    st.textContent = '正在加载 Camera 工具…';
    loadJS('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js', function(ok2) {
      if (!ok2) { st.textContent = 'Camera 工具加载失败'; return; }
      C.mpReady = true;
      st.textContent = '模型就绪 ✓  正在开启摄像头…';
      startCamera();
    });
  });
}

function startCamera() {
  var vid = document.getElementById('cam');
  var st = document.getElementById('loadingMsg');

  navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: 'user' }
  })
  .then(function(stream) {
    S.camStream = stream;
    vid.srcObject = stream;
    vid.style.display = 'block';
    return vid.play();
  })
  .then(function() {
    st.textContent = '';
    S.mode = 'hand';
    document.getElementById('modeInfo').textContent = '手势模式';
    document.getElementById('camGuide').style.display = 'block';
    console.log('[MP] 摄像头已启动');

    var hands = new window.Hands({
      locateFile: function(f) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/' + f;
      }
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });
    hands.onResults(onHandResults);
    S.hands = hands;

    /* 手动发送视频帧给 MediaPipe（不用 Camera 工具，更稳定）*/
    console.log('[MP] 开始手动帧循环');
    S._mpTimer = setInterval(function() {
      if (S.hands && vid.readyState >= 2) {
        S.hands.send({ image: vid })
          .catch(function(e) { /* 静默忽略发送错误 */ });
      }
    }, 50);  // ~20fps，够用

    console.log('[MP] 手势追踪已启动');
  })
  .catch(function(err) {
    st.textContent = '摄像头错误：' + err.message;
    console.error('[MP]', err);
  });
}

/* 手势检测结果回调 */
function onHandResults(results) {
  var dbg = document.getElementById('dbg');
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    S.lm = null;
    dbg.style.display = 'none';
    S._lastIdx = -1;
    return;
  }
  dbg.style.display = 'block';
  var lm = results.multiHandLandmarks[0];
  S.lm = lm;

  /* 食指指尖（关键点 8）*/
  var tip = lm[8];
  var tx = (1 - tip.x) * W;
  var ty = tip.y * H;

  dbg.textContent =
    '手部追踪: ✓\n' +
    '指尖 X: ' + Math.round(tx) + '\n' +
    '指尖 Y: ' + Math.round(ty) + '\n' +
    '琴区: 0 ~ ' + Math.round(H * 0.25);

  /* 手指在上方琴区就触发 */
  var idx = hitTest(tx, ty);
  if (idx >= 0) {
    var moved = false;
    if (S.prevX !== null) {
      var dx = Math.abs(tx - S.prevX);
      var dy = Math.abs(ty - S.prevY);
      if (dx > 8 || dy > 8) moved = true;
    } else {
      moved = true;  /* 第一次检测到手，允许触发 */
    }
    /* 切换到不同弦时也触发 */
    if (moved || idx !== S._lastIdx) {
      doPluck(idx);
      S._lastIdx = idx;
    }
  }
  S.prevX = tx;
  S.prevY = ty;
}

/* =========  启动  ========= */
document.getElementById('startBtn').addEventListener('click', function() {
  var ov = document.getElementById('startOverlay');
  ov.classList.add('hidden');
  setTimeout(function() {
    var el = document.getElementById('startOverlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, 900);

  initAudio();
  startIntroMusic();

  if (!S.started) {
    S.started = true;
    animate();
  }

  /* 加载 MediaPipe 并开启摄像头 */
  initMP();
});
