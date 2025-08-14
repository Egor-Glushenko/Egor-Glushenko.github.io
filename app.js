(function () {
	const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
	if (tg) {
		tg.ready();
		tg.expand();
	}

	const state = {
		entries: [],
		premium: false,
		activeTab: 'today',
		filters: new Set(),
		chart: null,
		theme: 'dark'
	};

	const els = {
		app: document.getElementById('app'),
		tabs: Array.from(document.querySelectorAll('.tab')),
		views: {
			today: document.getElementById('view-today'),
			history: document.getElementById('view-history'),
			analytics: document.getElementById('view-analytics'),
			premium: document.getElementById('view-premium')
		},
		entry: document.getElementById('entry'),
		moodBtns: Array.from(document.querySelectorAll('.mood-btn')),
		saveBtn: document.getElementById('saveBtn'),
		exportBtn: document.getElementById('exportBtn'),
		themeBtn: document.getElementById('themeBtn'),
		shareBtn: document.getElementById('shareBtn'),
		calendar: document.getElementById('calendar'),
		tagFilters: document.getElementById('tagFilters'),
		entriesList: document.getElementById('entriesList'),
		moodChart: document.getElementById('moodChart'),
		wordCloud: document.getElementById('wordCloud'),
		premiumStatus: document.getElementById('premiumStatus'),
		buyPremiumBtn: document.getElementById('buyPremiumBtn'),
		premiumBlocks: Array.from(document.querySelectorAll('.premium-only')),
		peaksText: document.getElementById('peaksText'),
		topicsText: document.getElementById('topicsText')
	};

	const INVOICE_URL = 'https://t.me/$zPNiXAv-8Ui9EQAAum5o32fZYwg';

	function applyThemeFromTelegram() {
		if (!tg) return;
		const p = tg.themeParams || {};
		// Применяем тему Telegram только если пользователь не выбрал свою
		if (state.theme === 'dark' || state.theme === 'light') {
			return; // Используем пользовательскую тему
		}
		
		const cssVars = {
			'--bg': p.bg_color ? `#${p.bg_color}` : null,
			'--text': p.text_color ? `#${p.text_color}` : null,
			'--card': p.secondary_bg_color ? `#${p.secondary_bg_color}` : null,
			'--border': p.hint_color ? `#${p.hint_color}33` : null,
			'--primary': p.button_color ? `#${p.button_color}` : null
		};
		Object.entries(cssVars).forEach(([k, v]) => {
			if (v) document.documentElement.style.setProperty(k, v);
		});
	}

	function load() {
		try {
			state.entries = JSON.parse(localStorage.getItem('diary') || '[]');
			state.premium = localStorage.getItem('premium') === 'true';
			state.theme = localStorage.getItem('theme') || 'dark';
		} catch (e) {
			state.entries = [];
			state.premium = false;
			state.theme = 'dark';
		}
	}

	function persist() {
		localStorage.setItem('diary', JSON.stringify(state.entries));
	}

	function setPremium(val) {
		state.premium = !!val;
		localStorage.setItem('premium', state.premium ? 'true' : 'false');
		els.premiumStatus.textContent = `Статус: ${state.premium ? 'Премиум' : 'Стандарт'}`;
		els.premiumBlocks.forEach(b => b.classList.toggle('unlocked', state.premium));
	}

	function setTheme(theme) {
		state.theme = theme;
		localStorage.setItem('theme', theme);
		
		// Устанавливаем тему
		if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
			els.themeBtn.textContent = '🌙';
		} else if (theme === 'dark') {
			document.documentElement.removeAttribute('data-theme');
			els.themeBtn.textContent = '☀️';
		} else {
			// 'auto' - используем тему Telegram
			document.documentElement.removeAttribute('data-theme');
			els.themeBtn.textContent = '🔄';
			applyThemeFromTelegram();
		}
		
		// Обновляем график если он есть
		if (state.chart) {
			state.chart.update();
		}
		
		// Принудительно обновляем стили для корректного применения темы
		requestAnimationFrame(() => {
			// Пересоздаем элементы для применения новых стилей
			const elements = document.querySelectorAll('.card, .tab, .ghost, .mood-btn, .chips .chip');
			elements.forEach(el => {
				el.style.transition = 'none';
				el.offsetHeight; // Force reflow
				el.style.transition = '';
			});
		});
	}

	function switchTab(tab) {
		state.activeTab = tab;
		els.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
		Object.entries(els.views).forEach(([k, v]) => v.classList.toggle('active', k === tab));
		if (tg) {
			if (tab === 'today') {
				tg.MainButton.setText('Сохранить');
				tg.MainButton.show();
				tg.onEvent('mainButtonClicked', onSaveEntryClick);
			} else {
				tg.MainButton.hide();
				tg.offEvent('mainButtonClicked', onSaveEntryClick);
			}
		}
		if (tab === 'history') {
			renderCalendar();
			renderTags();
			renderEntriesList();
		}
		if (tab === 'analytics') {
			renderChart();
			renderWordCloud();
			renderPremiumAnalytics();
		}
	}

	function parseTags(text) {
		const found = text.match(/#[\p{L}\p{N}_]+/gu) || [];
		return found.map(s => s.toLowerCase());
	}

	function getMoodSelected() {
		const active = els.moodBtns.find(b => b.classList.contains('active'));
		return active ? active.dataset.mood : 'neutral';
	}

	function onSaveEntryClick() {
		const text = (els.entry.value || '').trim();
		const mood = getMoodSelected();
		const date = new Date().toISOString().split('T')[0];
		if (!text && !mood) return;
		const entry = { date, text, mood, tags: parseTags(text), ts: Date.now() };
		state.entries.push(entry);
		persist();
		els.entry.value = '';
		if (tg) tg.HapticFeedback && tg.HapticFeedback.notificationOccurred('success');
		if (state.activeTab === 'today') {
			showToast('Сохранено');
		}
	}

	function showToast(msg) {
		if (tg && tg.showPopup) {
			tg.showPopup({ title: 'Daily Tracker', message: msg, buttons: [{ type: 'ok' }] });
		} else {
			console.log(msg);
		}
	}

	function renderCalendar() {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		const first = new Date(year, month, 1);
		const firstDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const frag = document.createDocumentFragment();
		for (let i = 0; i < firstDay; i++) {
			const pad = document.createElement('div');
			pad.className = 'day';
			frag.appendChild(pad);
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = new Date(year, month, d).toISOString().split('T')[0];
			const dayEl = document.createElement('div');
			dayEl.className = 'day';
			const entriesForDay = state.entries.filter(e => e.date === dateStr);
			let moodClass = '';
			if (entriesForDay.length) {
				const score = entriesForDay.reduce((acc, e) => acc + (e.mood === 'happy' ? 1 : e.mood === 'sad' ? -1 : 0), 0);
				moodClass = score > 0 ? 'good' : score < 0 ? 'bad' : 'neutral';
			}
			if (moodClass) dayEl.classList.add(moodClass);
			const n = document.createElement('div');
			n.className = 'num';
			n.textContent = String(d);
			dayEl.appendChild(n);
			frag.appendChild(dayEl);
		}
		els.calendar.innerHTML = '';
		els.calendar.appendChild(frag);
	}

	function renderTags() {
		const tags = new Map();
		state.entries.forEach(e => {
			(e.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
		});
		const items = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
		els.tagFilters.innerHTML = '';
		items.forEach(([tag]) => {
			const chip = document.createElement('button');
			chip.className = 'chip' + (state.filters.has(tag) ? ' active' : '');
			chip.textContent = tag;
			chip.addEventListener('click', () => {
				if (state.filters.has(tag)) state.filters.delete(tag); else state.filters.add(tag);
				renderTags();
				renderEntriesList();
			});
			els.tagFilters.appendChild(chip);
		});
	}

	function renderEntriesList() {
		let list = [...state.entries].sort((a, b) => b.ts - a.ts);
		if (state.filters.size) {
			list = list.filter(e => e.tags && e.tags.some(t => state.filters.has(t)));
		}
		els.entriesList.innerHTML = '';
		list.forEach(e => {
			const li = document.createElement('li');
			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = `${e.date} · ${e.mood === 'happy' ? '😊' : e.mood === 'sad' ? '😢' : '😐'} ${(e.tags || []).join(' ')}`;
			const text = document.createElement('div');
			text.textContent = e.text;
			li.appendChild(meta);
			li.appendChild(text);
			els.entriesList.appendChild(li);
		});
	}

	function lastNDays(n) {
		const out = [];
		const today = new Date();
		for (let i = n - 1; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(today.getDate() - i);
			out.push(d);
		}
		return out;
	}

	function renderChart() {
		const days = lastNDays(30);
		const labels = days.map(d => `${d.getDate()}.${d.getMonth() + 1}`);
		const values = days.map(d => {
			const dateStr = d.toISOString().split('T')[0];
			const entriesForDay = state.entries.filter(e => e.date === dateStr);
			const score = entriesForDay.reduce((acc, e) => acc + (e.mood === 'happy' ? 1 : e.mood === 'sad' ? -1 : 0), 0);
			return score;
		});
		if (state.chart) {
			state.chart.data.labels = labels;
			state.chart.data.datasets[0].data = values;
			state.chart.update();
			return;
		}
		state.chart = new Chart(els.moodChart, {
			type: 'line',
			data: {
				labels,
				datasets: [{
					label: 'Настроение',
					data: values,
					borderColor: getCss('--primary') || '#2ea6ff',
					backgroundColor: 'transparent',
					tension: 0.3,
					pointRadius: 2,
					pointBackgroundColor: getCss('--primary') || '#2ea6ff',
					pointBorderColor: getCss('--bg') || '#0f0f10'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { 
					legend: { display: false } 
				},
				scales: {
					y: { 
						suggestedMin: -3, 
						suggestedMax: 3, 
						grid: { 
							color: getCss('--border') || '#232427',
							drawBorder: false
						},
						ticks: { 
							color: getCss('--text') || '#eaeaea',
							font: { size: 12 }
						},
						border: {
							color: getCss('--border') || '#232427'
						}
					},
					x: { 
						grid: { display: false },
						ticks: { 
							color: getCss('--text') || '#eaeaea',
							font: { size: 12 }
						},
						border: {
							color: getCss('--border') || '#232427'
						}
					}
				}
			}
		});
	}

	function tokenize(text) {
		return text
			.toLowerCase()
			.replace(/[.,!?:;()"'`«»\[\]{}]/g, ' ')
			.split(/\s+/)
			.filter(Boolean);
	}
	const STOP = new Set(['и','в','на','с','по','к','из','за','как','что','это','а','но','или','у','о','не','да','the','a','to','of','for','in','on','is','it','i','you','we','they','with','my']);

	function wordFreq() {
		const freq = new Map();
		state.entries.forEach(e => {
			const words = tokenize(e.text);
			words.forEach(w => {
				if (w.startsWith('#')) return;
				if (STOP.has(w)) return;
				freq.set(w, (freq.get(w) || 0) + 1);
			});
		});
		return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
	}

	function renderWordCloud() {
		const list = wordFreq().slice(0, 60);
		els.wordCloud.innerHTML = '';
		if (!list.length) {
			els.wordCloud.textContent = 'Недостаточно данных';
			return;
		}
		try {
			window.WordCloud(els.wordCloud, {
				list,
				gridSize: 8,
				weightFactor: function (size) { return 6 + size * 4; },
				color: () => getCss('--text') || '#eaeaea',
				backgroundColor: getCss('--card') || '#17181a',
				rotateRatio: 0
			});
		} catch (e) {
			els.wordCloud.textContent = 'Не удалось построить облако слов';
		}
	}

	function renderPremiumAnalytics() {
		if (!state.premium) return;
		const byHour = new Array(24).fill(0);
		state.entries.forEach(e => {
			const h = new Date(e.ts).getHours();
			byHour[h] += e.mood === 'happy' ? 1 : e.mood === 'sad' ? -1 : 0;
		});
		const topHour = byHour.reduce((best, val, idx) => val > best.val ? { val, idx } : best, { val: -Infinity, idx: 0 });
		els.peaksText.textContent = topHour.val === -Infinity ? 'Недостаточно данных' : `Чаще всего хорошие дни в ${String(topHour.idx).padStart(2,'0')}:00`;
		const topics = wordFreq().filter(([w]) => w.length > 3).slice(0, 5).map(([w]) => w);
		els.topicsText.textContent = topics.length ? topics.join(', ') : 'Недостаточно данных';
	}

	async function exportPdf() {
		const { jsPDF } = window.jspdf;
		const doc = new jsPDF({ unit: 'pt', format: 'a4' });
		doc.setFontSize(18);
		doc.text('Daily Tracker — Отчет', 40, 50);
		doc.setFontSize(12);
		doc.text(`Дата: ${new Date().toLocaleDateString()}`, 40, 72);

		if (state.chart) {
			const img = state.chart.toBase64Image();
			doc.addImage(img, 'PNG', 40, 90, 515, 180);
		}

		let y = 290;
		doc.setFontSize(14);
		doc.text('Последние записи:', 40, y);
		y += 16;
		const recent = [...state.entries].sort((a, b) => b.ts - a.ts).slice(0, 20);
		recent.forEach(e => {
			const line = `${e.date} ${e.mood === 'happy' ? '😊' : e.mood === 'sad' ? '😢' : '😐'}  ${e.text}`;
			const wrapped = doc.splitTextToSize(line, 515);
			doc.text(wrapped, 40, y);
			y += wrapped.length * 14 + 6;
			if (y > 780) { doc.addPage(); y = 60; }
		});
		doc.save('daily-tracker.pdf');
	}

	function getCss(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	function buyPremium() {
		if (!INVOICE_URL || INVOICE_URL.startsWith('PASTE_')) {
			showToast('Укажите ссылку на инвойс Stars в app.js');
			return;
		}
		if (tg && tg.openInvoice) {
			tg.openInvoice(INVOICE_URL, (status) => {
				if (status === 'paid') {
					setPremium(true);
					showToast('Премиум активирован');
				} else if (status === 'cancelled') {
					showToast('Покупка отменена');
				} else {
					showToast('Статус: ' + status);
				}
			});
			if (tg.onEvent) {
				tg.onEvent('invoiceClosed', (res) => {
					if (res.status === 'paid') setPremium(true);
				});
			}
		} else {
			window.open(INVOICE_URL, '_blank');
		}
	}

	function shareBot() {
		const botUsername = tg ? tg.initDataUnsafe?.user?.username || 'your_bot' : 'your_bot';
		const shareText = `📱 Daily Tracker — Персональный дневник достижений и настроения\n\n✨ Быстрый ввод заметок\n📊 Аналитика и графики\n📅 Календарь истории\n💎 Премиум функции\n\nПопробуй: @${botUsername}`;
		
		if (tg && tg.switchInlineQuery) {
			// Открывает список чатов для пересылки
			tg.switchInlineQuery(shareText, ['users', 'groups', 'channels']);
		} else if (tg && tg.showPopup) {
			// Показываем меню выбора способа поделиться
			tg.showPopup({
				title: 'Поделиться ботом',
				message: 'Выберите способ:',
				buttons: [
					{ type: 'default', text: 'Скопировать ссылку' },
					{ type: 'default', text: 'Поделиться текстом' },
					{ type: 'cancel', text: 'Отмена' }
				]
			}, (buttonId) => {
				if (buttonId === 0) {
					// Копируем ссылку на бота
					const botLink = `https://t.me/${botUsername}`;
					if (navigator.clipboard) {
						navigator.clipboard.writeText(botLink);
						showToast('Ссылка скопирована');
					} else {
						showToast('Ссылка: ' + botLink);
					}
				} else if (buttonId === 1) {
					// Копируем текст
					if (navigator.clipboard) {
						navigator.clipboard.writeText(shareText);
						showToast('Текст скопирован');
					} else {
						showToast('Текст скопирован в буфер');
					}
				}
			});
		} else if (navigator.share) {
			navigator.share({
				title: 'Daily Tracker',
				text: shareText,
				url: window.location.href
			});
		} else {
			// Fallback для браузеров без Web Share API
			const textArea = document.createElement('textarea');
			textArea.value = shareText;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			showToast('Текст скопирован в буфер обмена');
		}
	}

	function toggleTheme() {
		let newTheme;
		if (state.theme === 'dark') {
			newTheme = 'light';
		} else if (state.theme === 'light') {
			newTheme = 'auto';
		} else {
			newTheme = 'dark';
		}
		setTheme(newTheme);
		if (tg && tg.HapticFeedback) {
			tg.HapticFeedback.impactOccurred('light');
		}
	}

	function bind() {
		els.moodBtns.forEach(b => b.addEventListener('click', () => {
			els.moodBtns.forEach(x => x.classList.remove('active'));
			b.classList.add('active');
		}));
		els.saveBtn.addEventListener('click', onSaveEntryClick);
		els.exportBtn.addEventListener('click', exportPdf);
		els.themeBtn.addEventListener('click', toggleTheme);
		els.shareBtn.addEventListener('click', shareBot);
		els.buyPremiumBtn.addEventListener('click', buyPremium);
		els.tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
		if (tg && tg.onEvent) {
			tg.onEvent('themeChanged', applyThemeFromTelegram);
		}
	}

	function init() {
		applyThemeFromTelegram();
		load();
		setPremium(state.premium);
		setTheme(state.theme);
		bind();
		switchTab('today');
	}

	init();
})(); 