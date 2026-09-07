(() => {
  'use strict';

  const SETTINGS_KEY = 'ricePriceOpenApp.settings.v1';
  const SESSION_KEY_PREFIX = 'ricePriceOpenApp.session.v2';
  const RUBY_KEY = 'ricePriceOpenApp.rubyOff.v1';

  const DEFAULT_SETTINGS = {
    productCount: 3,
    products: [
      {
        id: 'ibaraki-koshihikari',
        name: '茨城県産 コシヒカリ',
        nameReading: 'いばらきけんさん こしひかり',
        origin: '茨城県',
        originReading: 'いばらきけん',
        variety: 'コシヒカリ',
        varietyReading: '',
        weight: '5kg',
        price: 3980,
        distanceLabel: '近い',
        distanceRank: 1
      },
      {
        id: 'niigata-koshihikari',
        name: '新潟県産 コシヒカリ',
        nameReading: 'にいがたけんさん こしひかり',
        origin: '新潟県',
        originReading: 'にいがたけん',
        variety: 'コシヒカリ',
        varietyReading: '',
        weight: '5kg',
        price: 4680,
        distanceLabel: '少し遠い',
        distanceRank: 2
      },
      {
        id: 'hokkaido-yumepirika',
        name: '北海道産 ゆめぴりか',
        nameReading: 'ほっかいどうさん ゆめぴりか',
        origin: '北海道',
        originReading: 'ほっかいどう',
        variety: 'ゆめぴりか',
        varietyReading: '',
        weight: '5kg',
        price: 4380,
        distanceLabel: '遠い',
        distanceRank: 3
      },

    ]
  };

  const initialSettings = loadInitialSettings();
  const state = {
    settings: deepClone(initialSettings),
    committedSettings: deepClone(initialSettings),
    session: loadSession(),
    currentScreen: 'predictScreen',
    distanceAnswer: null
  };

  const screens = [...document.querySelectorAll('.screen')];
  const predictCards = document.getElementById('predictCards');
  const predictProgress = document.getElementById('predictProgress');
  const toRevealButton = document.getElementById('toRevealButton');
  const clearPredictionButton = document.getElementById('clearPredictionButton');
  const revealCards = document.getElementById('revealCards');
  const distanceOrder = document.getElementById('distanceOrder');
  const revealStatus = document.getElementById('revealStatus');
  const toCompareButton = document.getElementById('toCompareButton');
  const compareDistanceList = document.getElementById('compareDistanceList');
  const comparePriceList = document.getElementById('comparePriceList');
  const predictionReview = document.getElementById('predictionReview');
  const choiceMessage = document.getElementById('choiceMessage');
  const teacherDialog = document.getElementById('teacherDialog');
  const teacherProductForms = document.getElementById('teacherProductForms');
  const teacherMessage = document.getElementById('teacherMessage');
  const shareUrlArea = document.getElementById('shareUrlArea');
  const shareUrlOutput = document.getElementById('shareUrlOutput');
  const resetDialog = document.getElementById('resetDialog');
  const rubyToggle = document.getElementById('rubyToggle');

  init();

  function init() {
    normalizeSession();
    bindEvents();
    applyRubyPreference();
    renderAll();
  }

  function bindEvents() {
    document.getElementById('toRevealButton').addEventListener('click', () => showScreen('revealScreen'));
    document.getElementById('backToPredictButton').addEventListener('click', () => showScreen('predictScreen'));
    document.getElementById('toCompareButton').addEventListener('click', () => showScreen('compareScreen'));
    document.getElementById('backToRevealButton').addEventListener('click', () => showScreen('revealScreen'));
    document.getElementById('toQuestionButton').addEventListener('click', () => showScreen('questionScreen'));
    document.getElementById('backToCompareButton').addEventListener('click', () => showScreen('compareScreen'));
    document.getElementById('questionResetButton').addEventListener('click', openResetConfirm);
    document.getElementById('resetButton').addEventListener('click', openResetConfirm);
    document.getElementById('cancelResetButton').addEventListener('click', closeResetConfirm);
    document.getElementById('confirmResetButton').addEventListener('click', resetLesson);
    clearPredictionButton.addEventListener('click', clearPrediction);

    rubyToggle.addEventListener('click', toggleRuby);

    document.getElementById('teacherModeButton').addEventListener('click', openTeacherMode);
    document.getElementById('closeTeacherButton').addEventListener('click', closeTeacherMode);
    document.getElementById('saveTeacherButton').addEventListener('click', saveTeacherSettings);
    document.getElementById('createShareUrlButton').addEventListener('click', createShareUrl);
    document.getElementById('copyShareUrlButton').addEventListener('click', copyShareUrl);
    document.getElementById('restoreDefaultsButton').addEventListener('click', restoreTeacherDefaults);

    document.querySelectorAll('[data-distance-answer]').forEach(button => {
      button.addEventListener('click', () => selectDistanceAnswer(button.dataset.distanceAnswer));
    });

    teacherDialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeTeacherMode();
    });
  }

  function renderAll() {
    renderPrediction();
    renderReveal();
    renderComparison();
  }

  function activeProducts() {
    return state.settings.products.slice(0, 3);
  }

  function renderPrediction() {
    const products = activeProducts();
    predictCards.innerHTML = '';

    products.forEach(product => {
      const rank = state.session.prediction.indexOf(product.id) + 1;
      const card = document.createElement('article');
      card.className = `product-card${rank ? ' selected' : ''}`;
      card.innerHTML = `
        ${rank ? `<div class="card-rank-badge" aria-label="予想 ${rank}位">${rank}<ruby>位<rt>い</rt></ruby></div>` : ''}
        <div class="card-head">
          <h3 class="product-name">${rubyText(product.name, product.nameReading)}</h3>
          <div class="product-meta">
            <div><ruby>産地<rt>さんち</rt></ruby>：<strong>${rubyText(product.origin, product.originReading)}</strong></div>
            <div><ruby>品種<rt>ひんしゅ</rt></ruby>：<strong>${rubyText(product.variety, product.varietyReading)}</strong></div>
            <div><ruby>重<rt>おも</rt></ruby>さ：<strong>${escapeHtml(product.weight)}</strong></div>
          </div>
        </div>
        <div class="price-ticket" aria-label="値段はまだ隠れています">
          <span class="ticket-label"><ruby>値段<rt>ねだん</rt></ruby></span>
          <span class="price-value price-hidden">？？？？<span class="yen">円</span></span>
        </div>
        <div class="card-action-wrap">
          <button class="card-select" type="button" data-predict-id="${escapeAttr(product.id)}" ${rank ? 'disabled' : ''}>
            ${rank ? `よそう ${rank}<ruby>位<rt>い</rt></ruby>` : 'このお<ruby>米<rt>こめ</rt></ruby>を えらぶ'}
          </button>
        </div>
      `;
      predictCards.appendChild(card);
    });

    predictCards.querySelectorAll('[data-predict-id]').forEach(button => {
      button.addEventListener('click', () => addPrediction(button.dataset.predictId));
    });

    renderPredictionProgress(products);
    toRevealButton.disabled = state.session.prediction.length !== products.length;
    clearPredictionButton.disabled = state.session.prediction.length === 0;
  }

  function renderPredictionProgress(products) {
    const slots = products.map((_, index) => {
      const product = getProductById(state.session.prediction[index]);
      return `
        <div class="progress-slot${product ? ' filled' : ''}">
          <span class="rank-number">${index + 1}</span>
          <span>${product ? rubyText(product.origin, product.originReading) : '？'}</span>
        </div>
      `;
    }).join('');

    predictProgress.innerHTML = `
      <div class="progress-slots">${slots}</div>
      <p class="lead short">${state.session.prediction.length === products.length ? 'よそうが できました！' : `あと ${products.length - state.session.prediction.length}つ えらぼう。`}</p>
    `;
  }

  function addPrediction(id) {
    if (state.session.prediction.includes(id)) return;
    if (state.session.prediction.length >= activeProducts().length) return;
    state.session.prediction.push(id);
    saveSession();
    renderPrediction();
  }

  function clearPrediction() {
    state.session.prediction = [];
    saveSession();
    renderPrediction();
  }

  function renderReveal() {
    const products = activeProducts();
    const distanceSorted = [...products].sort((a, b) => a.distanceRank - b.distanceRank);

    distanceOrder.innerHTML = distanceSorted.map((product, index) => `
      <div class="ranking-strip-item">
        <span class="rank-number">${index + 1}</span>
        <span>${rubyText(product.origin, product.originReading)}<br><small>${escapeHtml(product.distanceLabel)}</small></span>
      </div>
    `).join('');

    revealCards.innerHTML = '';
    products.forEach(product => {
      const isOpen = state.session.opened.includes(product.id);
      const predictionRank = state.session.prediction.indexOf(product.id) + 1;
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `
        ${predictionRank ? `<div class="card-rank-badge" aria-label="予想 ${predictionRank}位">予${predictionRank}</div>` : ''}
        <div class="card-head">
          <h3 class="product-name">${rubyText(product.name, product.nameReading)}</h3>
          <div class="product-meta">
            <div><ruby>産地<rt>さんち</rt></ruby>：<strong>${rubyText(product.origin, product.originReading)}</strong></div>
            <div><ruby>品種<rt>ひんしゅ</rt></ruby>：<strong>${rubyText(product.variety, product.varietyReading)}</strong></div>
            <div><ruby>重<rt>おも</rt></ruby>さ：<strong>${escapeHtml(product.weight)}</strong></div>
          </div>
        </div>
        <div class="distance-badge"><ruby>学校<rt>がっこう</rt></ruby>から：${escapeHtml(product.distanceLabel)}</div>
        <div class="price-ticket${isOpen ? ' open' : ''}" aria-label="${isOpen ? `値段 ${formatPrice(product.price)}円` : '値段はまだ隠れています'}">
          <span class="ticket-label"><ruby>値段<rt>ねだん</rt></ruby></span>
          <span class="price-value${isOpen ? '' : ' price-hidden'}">${isOpen ? `${formatPrice(product.price)}円` : '？？？？円'}</span>
        </div>
        <div class="card-action-wrap">
          <button class="open-price-button" type="button" data-open-id="${escapeAttr(product.id)}" ${isOpen ? 'disabled' : ''}>
            ${isOpen ? '<ruby>OPEN済<rt>おーぷんずみ</rt></ruby>' : '<ruby>値札<rt>ねふだ</rt></ruby>を OPEN！'}
          </button>
        </div>
      `;
      revealCards.appendChild(card);
    });

    revealCards.querySelectorAll('[data-open-id]').forEach(button => {
      button.addEventListener('click', () => openPrice(button.dataset.openId));
    });

    const openedCount = state.session.opened.filter(id => products.some(p => p.id === id)).length;
    if (openedCount === 0) {
      revealStatus.textContent = 'まだ値札は開いていません。だれからOPENする？';
    } else if (openedCount < products.length) {
      revealStatus.textContent = `あと ${products.length - openedCount}つ。つぎの値札をOPENしよう。`;
    } else {
      revealStatus.innerHTML = 'ぜんぶ OPEN！　<ruby>近<rt>ちか</rt></ruby>い<ruby>順<rt>じゅん</rt></ruby>と、<ruby>高<rt>たか</rt></ruby>い<ruby>順<rt>じゅん</rt></ruby>をくらべてみよう。';
    }
    toCompareButton.hidden = openedCount !== products.length;
  }

  function openPrice(id) {
    if (!state.session.opened.includes(id)) {
      state.session.opened.push(id);
      saveSession();
      renderReveal();
    }
  }

  function renderComparison() {
    const products = activeProducts();
    const distanceSorted = [...products].sort((a, b) => a.distanceRank - b.distanceRank);
    const priceSorted = [...products].sort((a, b) => b.price - a.price || a.distanceRank - b.distanceRank);

    compareDistanceList.innerHTML = distanceSorted.map((product, index) => rankingListItem(product, index, `${escapeHtml(product.distanceLabel)}`)).join('');
    comparePriceList.innerHTML = priceSorted.map((product, index) => rankingListItem(product, index, `${formatPrice(product.price)}円`)).join('');

    predictionReview.innerHTML = state.session.prediction.map((id, index) => {
      const product = getProductById(id);
      if (!product) return '';
      const actualRank = priceSorted.findIndex(p => p.id === id) + 1;
      return `
        <div class="review-item">
          <span class="rank-number">予${index + 1}</span>
          <span>${rubyText(product.origin, product.originReading)}<br><small>ほんとうは ${actualRank}<ruby>位<rt>い</rt></ruby></small></span>
          <span class="review-price">${formatPrice(product.price)}円</span>
        </div>
      `;
    }).join('');
  }

  function rankingListItem(product, index, subText) {
    return `
      <li>
        <span class="rank-number">${index + 1}</span>
        <div>
          <div class="ranking-main">${rubyText(product.origin, product.originReading)}　${rubyText(product.variety, product.varietyReading)}</div>
          <div class="ranking-sub">${subText}</div>
        </div>
      </li>
    `;
  }

  function selectDistanceAnswer(answer) {
    state.distanceAnswer = answer;
    document.querySelectorAll('[data-distance-answer]').forEach(button => {
      const selected = button.dataset.distanceAnswer === answer;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    if (answer === 'yes') {
      choiceMessage.innerHTML = '<ruby>左右<rt>さゆう</rt></ruby>の<ruby>順番<rt>じゅんばん</rt></ruby>を、もう<ruby>一度<rt>いちど</rt></ruby><ruby>見<rt>み</rt></ruby>くらべてみよう。';
    } else {
      choiceMessage.innerHTML = 'どこが ちがっているかな？　<ruby>気<rt>き</rt></ruby>づいたことを<ruby>話<rt>はな</rt></ruby>してみよう。';
    }
  }

  function showScreen(id) {
    state.currentScreen = id;
    screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
    if (id === 'revealScreen') renderReveal();
    if (id === 'compareScreen') renderComparison();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openResetConfirm() {
    resetDialog.hidden = false;
    document.getElementById('cancelResetButton').focus();
  }

  function closeResetConfirm() {
    resetDialog.hidden = true;
  }

  function resetLesson() {
    state.session = { prediction: [], opened: [] };
    state.distanceAnswer = null;
    saveSession();
    closeResetConfirm();
    document.querySelectorAll('[data-distance-answer]').forEach(button => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    choiceMessage.textContent = '';
    renderAll();
    showScreen('predictScreen');
  }

  function openTeacherMode() {
    renderTeacherForms();
    teacherMessage.textContent = '';
    teacherMessage.className = 'teacher-message';
    shareUrlArea.hidden = true;
    shareUrlOutput.value = '';
    if (typeof teacherDialog.showModal === 'function') {
      teacherDialog.showModal();
    } else {
      teacherDialog.setAttribute('open', '');
    }
  }

  function closeTeacherMode() {
    if (teacherDialog.open && typeof teacherDialog.close === 'function') {
      teacherDialog.close();
    } else {
      teacherDialog.removeAttribute('open');
    }
    // 保存せず閉じた入力内容は破棄し、最後に確定した設定へ戻す。
    state.settings = deepClone(state.committedSettings);
    normalizeSession();
    renderAll();
  }

  function renderTeacherForms() {
    teacherProductForms.innerHTML = '';

    state.settings.products.forEach((product, index) => {
      const section = document.createElement('section');
      section.className = 'teacher-product';
      section.dataset.productIndex = String(index);
      section.innerHTML = `
        <h3><ruby>商品<rt>しょうひん</rt></ruby> ${index + 1}</h3>
        <div class="teacher-fields">
          ${fieldMarkup(index, 'name', '商品名', product.name, true)}
          ${fieldMarkup(index, 'nameReading', '商品名のよみ', product.nameReading)}
          ${fieldMarkup(index, 'origin', '産地', product.origin)}
          ${fieldMarkup(index, 'originReading', '産地のよみ', product.originReading)}
          ${fieldMarkup(index, 'variety', '品種', product.variety)}
          ${fieldMarkup(index, 'varietyReading', '品種のよみ（任意）', product.varietyReading)}
          ${fieldMarkup(index, 'weight', '重さ', product.weight)}
          ${fieldMarkup(index, 'price', '価格（円）', String(product.price), false, 'number', '0')}
          <label class="field">
            <span>学校からの距離表示</span>
            <select data-field="distanceLabel" data-index="${index}">
              ${['近い', '少し遠い', '遠い', 'とても遠い'].map(label => `<option value="${label}"${label === product.distanceLabel ? ' selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>学校から近い順（1〜3）</span>
            <input data-field="distanceRank" data-index="${index}" type="number" min="1" max="3" step="1" value="${product.distanceRank}">
          </label>

        </div>
      `;
      teacherProductForms.appendChild(section);
    });


  }

  function fieldMarkup(index, field, label, value, wide = false, type = 'text', min = '') {
    return `
      <label class="field${wide ? ' field-wide' : ''}">
        <span>${escapeHtml(label)}</span>
        <input data-field="${escapeAttr(field)}" data-index="${index}" type="${type}" ${min !== '' ? `min="${min}"` : ''} value="${escapeAttr(value)}">
      </label>
    `;
  }

  function syncTeacherFieldsToState() {
    state.settings.productCount = 3;
    teacherProductForms.querySelectorAll('[data-field]').forEach(input => {
      const index = Number(input.dataset.index);
      const field = input.dataset.field;
      let value = input.value.trim();
      if (field === 'price' || field === 'distanceRank') value = Number(value);
      state.settings.products[index][field] = value;
    });
  }

  async function saveTeacherSettings() {
    teacherMessage.textContent = '';
    teacherMessage.className = 'teacher-message';

    const draft = collectTeacherDraft();

    const validation = validateSettings(draft);
    if (!validation.ok) {
      teacherMessage.textContent = validation.message;
      teacherMessage.className = 'teacher-message error';
      return;
    }

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(draft));
    } catch (error) {
      teacherMessage.textContent = 'この端末に設定を保存できませんでした。ブラウザの保存設定を確認してください。';
      teacherMessage.className = 'teacher-message error';
      return;
    }

    state.settings = deepClone(draft);
    state.committedSettings = deepClone(draft);
    state.session = { prediction: [], opened: [] };
    saveSession();
    renderAll();
    teacherMessage.textContent = '設定を保存しました。授業の進み具合は最初の状態に戻しました。';
    teacherMessage.className = 'teacher-message success';
  }

  function collectTeacherDraft() {
    const draft = deepClone(state.settings);
    draft.productCount = 3;
    teacherProductForms.querySelectorAll('[data-field]').forEach(input => {
      const index = Number(input.dataset.index);
      const field = input.dataset.field;
      let value = input.value.trim();
      if (field === 'price' || field === 'distanceRank') value = Number(value);
      draft.products[index][field] = value;
    });
    return draft;
  }

  function createShareUrl() {
    const draft = collectTeacherDraft();
    const validation = validateSettings(draft);
    if (!validation.ok) {
      teacherMessage.textContent = validation.message;
      teacherMessage.className = 'teacher-message error';
      return;
    }

    // 配布URLを作る時点の設定を、この端末にも保存する。
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(draft));
    } catch (error) {
      // URL自体は作れるため、保存失敗だけで処理は止めない。
    }

    state.settings = deepClone(draft);
    state.committedSettings = deepClone(draft);
    state.session = { prediction: [], opened: [] };
    saveSession();
    renderAll();

    const url = buildShareUrl(draft);
    shareUrlOutput.value = url;
    shareUrlArea.hidden = false;

    if (window.location.protocol === 'file:') {
      teacherMessage.innerHTML = '配布URLを作りました。ただし、いまは端末内の <strong>file://</strong> で開いているため、このURLは他の端末には配れません。公開したWebアプリ（https://〜）を開いてから、もう一度「配布用URLを作る」を押してください。';
      teacherMessage.className = 'teacher-message error';
    } else {
      teacherMessage.textContent = '設定を保存し、配布用URLを作りました。URLをコピーしてロイロノートで配布できます。';
      teacherMessage.className = 'teacher-message success';
    }
  }

  async function copyShareUrl() {
    const url = shareUrlOutput.value.trim();
    if (!url) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        shareUrlOutput.focus();
        shareUrlOutput.select();
        document.execCommand('copy');
      }
      teacherMessage.textContent = '配布用URLをコピーしました。';
      teacherMessage.className = 'teacher-message success';
    } catch (error) {
      shareUrlOutput.focus();
      shareUrlOutput.select();
      teacherMessage.textContent = '自動コピーできませんでした。表示されたURLを選択してコピーしてください。';
      teacherMessage.className = 'teacher-message error';
    }
  }

  function buildShareUrl(settings) {
    const payload = {
      v: 1,
      p: settings.products.slice(0, 3).map(product => ({
        n: product.name,
        nr: product.nameReading,
        o: product.origin,
        or: product.originReading,
        v: product.variety,
        vr: product.varietyReading,
        w: product.weight,
        p: product.price,
        d: product.distanceLabel,
        dr: product.distanceRank
      }))
    };
    const base = window.location.href.split('#')[0];
    return `${base}#cfg=${encodeBase64Url(JSON.stringify(payload))}`;
  }

  function loadInitialSettings() {
    const shared = readSharedSettingsFromUrl();
    if (shared) return shared;
    return loadSettings();
  }

  function readSharedSettingsFromUrl() {
    const match = window.location.hash.match(/^#cfg=([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    try {
      const payload = JSON.parse(decodeBase64Url(match[1]));
      if (!payload || payload.v !== 1 || !Array.isArray(payload.p) || payload.p.length !== 3) return null;
      const settings = deepClone(DEFAULT_SETTINGS);
      settings.productCount = 3;
      settings.products = settings.products.map((fallback, index) => {
        const item = payload.p[index] || {};
        return {
          ...fallback,
          name: String(item.n ?? fallback.name),
          nameReading: String(item.nr ?? fallback.nameReading),
          origin: String(item.o ?? fallback.origin),
          originReading: String(item.or ?? fallback.originReading),
          variety: String(item.v ?? fallback.variety),
          varietyReading: String(item.vr ?? fallback.varietyReading),
          weight: String(item.w ?? fallback.weight),
          price: Number(item.p),
          distanceLabel: String(item.d ?? fallback.distanceLabel),
          distanceRank: Number(item.dr)
        };
      });
      return validateSettings(settings).ok ? settings : null;
    } catch (error) {
      return null;
    }
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
  }

  function decodeBase64Url(value) {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function validateSettings(settings) {
    const products = settings.products.slice(0, 3);
    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      if (!p.name || !p.origin || !p.variety || !p.weight) {
        return { ok: false, message: `商品 ${i + 1}：商品名・産地・品種・重さを入力してください。` };
      }
      if (!Number.isFinite(p.price) || p.price < 0) {
        return { ok: false, message: `商品 ${i + 1}：価格を0以上の数字で入力してください。` };
      }
      if (!Number.isInteger(p.distanceRank) || p.distanceRank < 1 || p.distanceRank > products.length) {
        return { ok: false, message: `商品 ${i + 1}：「学校から近い順」は1〜${products.length}で入力してください。` };
      }
    }
    const ranks = products.map(p => p.distanceRank);
    if (new Set(ranks).size !== ranks.length) {
      return { ok: false, message: `「学校から近い順」は、1〜${products.length}を重ならないように1回ずつ使ってください。` };
    }
    return { ok: true };
  }

  function restoreTeacherDefaults() {
    const ok = window.confirm('商品設定を初期例に戻しますか？');
    if (!ok) return;
    state.settings = deepClone(DEFAULT_SETTINGS);
    state.committedSettings = deepClone(DEFAULT_SETTINGS);
    state.session = { prediction: [], opened: [] };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {
      // 保存領域が使えない環境でも、現在の授業画面は継続できる。
    }
    saveSession();
    renderTeacherForms();
    renderAll();
    teacherMessage.textContent = '初期例に戻しました。';
    teacherMessage.className = 'teacher-message success';
  }

  function normalizeSession() {
    const ids = new Set(activeProducts().map(p => p.id));
    state.session.prediction = state.session.prediction.filter(id => ids.has(id)).slice(0, activeProducts().length);
    state.session.opened = state.session.opened.filter(id => ids.has(id));
    saveSession();
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!saved || !Array.isArray(saved.products)) return deepClone(DEFAULT_SETTINGS);
      const merged = deepClone(DEFAULT_SETTINGS);
      merged.productCount = 3;
      merged.products = merged.products.map((fallback, index) => ({ ...fallback, ...(saved.products[index] || {}) }));
      return merged;
    } catch (error) {
      return deepClone(DEFAULT_SETTINGS);
    }
  }

  function getSessionKey() {
    const shared = window.location.hash.startsWith('#cfg=') ? window.location.hash.slice(5) : 'local';
    return `${SESSION_KEY_PREFIX}.${simpleHash(shared)}`;
  }

  function simpleHash(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function loadSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(getSessionKey()) || 'null');
      if (!saved) return { prediction: [], opened: [] };
      return {
        prediction: Array.isArray(saved.prediction) ? saved.prediction : [],
        opened: Array.isArray(saved.opened) ? saved.opened : []
      };
    } catch (error) {
      return { prediction: [], opened: [] };
    }
  }

  function saveSession() {
    try {
      sessionStorage.setItem(getSessionKey(), JSON.stringify(state.session));
    } catch (error) {
      // file:// などでストレージが制限されても、メモリ上では授業を続けられる。
    }
  }

  function toggleRuby() {
    const rubyOff = !document.body.classList.contains('ruby-off');
    document.body.classList.toggle('ruby-off', rubyOff);
    try {
      localStorage.setItem(RUBY_KEY, rubyOff ? '1' : '0');
    } catch (error) {
      // 保存できない場合は、この表示中のみ切り替える。
    }
    updateRubyButton(rubyOff);
  }

  function applyRubyPreference() {
    let rubyOff = false;
    try {
      rubyOff = localStorage.getItem(RUBY_KEY) === '1';
    } catch (error) {
      rubyOff = false;
    }
    document.body.classList.toggle('ruby-off', rubyOff);
    updateRubyButton(rubyOff);
  }

  function updateRubyButton(rubyOff) {
    rubyToggle.textContent = rubyOff ? 'ふりがな ON' : 'ふりがな OFF';
    rubyToggle.setAttribute('aria-pressed', rubyOff ? 'true' : 'false');
  }

  function rubyText(text, reading) {
    const safeText = escapeHtml(text || '');
    const safeReading = escapeHtml(reading || '');
    if (!safeReading) return safeText;
    return `<ruby>${safeText}<rt>${safeReading}</rt></ruby>`;
  }

  function getProductById(id) {
    if (!id) return null;
    return state.settings.products.find(product => product.id === id) || null;
  }

  function formatPrice(value) {
    return Number(value).toLocaleString('ja-JP');
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
  }

})();
