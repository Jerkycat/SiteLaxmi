(function () {
    'use strict';

    /* ── Storage seguro (localStorage pode estar bloqueado) ── */
    const store = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) { /* ignora */ }
        },
    };

    /* ── Elementos ── */
    const main = document.querySelector('main');
    const pageChapters = document.getElementById('pageChapters');
    const pageMain = document.getElementById('pageMain');
    const chaptersGrid = document.getElementById('chaptersGrid');
    const boxImg = document.getElementById('box-img');
    const boxBtn = document.getElementById('boxBtn');
    const homeBtn = document.getElementById('homeBtn');
    const discordLink = document.getElementById('discordLink');
    const bookyPanel = document.getElementById('bookyPanel');
    const bookyItems = document.getElementById('bookyItems');
    const bookyBtn = document.getElementById('bookyBtn');
    const readerDialog = document.getElementById('readerDialog');
    const readerClose = document.getElementById('readerClose');
    const readerContent = document.getElementById('readerContent');
    const langBtns = document.querySelectorAll('.lang-btn');

    /* ── Language config ── */
    const LANG_KEY = 'selectedLang';
    const DEFAULT_LANG = 'jp';

    const langMap = {
        br: {
            logo: 'static/imgs/logos/pt.png',
            box: 'static/imgs/decorations/webyy_br.png',
            chapterSuffix: '_pt',
        },
        en: {
            logo: 'static/imgs/logos/en.png',
            box: 'static/imgs/decorations/webyy_en.png',
            chapterSuffix: '_en',
        },
        jp: {
            logo: 'static/imgs/logos/jp.png',
            box: 'static/imgs/decorations/webyy_jp.png',
            chapterSuffix: '_jp',
        },
    };

    /* ── Manifesto dos capítulos ──
     * Fonte única de verdade: o que existe e em quais idiomas.
     *   id    → prefixo dos arquivos (static/imgs/chapters/{id}_xx.png e static/chapters/{id}_xx.txt)
     *   langs → idiomas que têm capa + texto (chaves de langMap)
     *   id: null → vaga "em breve" (sempre placeholder)
     * Idioma que não está em `langs` mostra o placeholder, sem tentar (e falhar) no servidor.
     */
    const CHAPTERS = [
        { id: 'c', langs: ['br', 'en', 'jp'] },
        { id: '0', langs: ['br', 'en'] },
        { id: '1', langs: ['br', 'en'] },
        { id: '2', langs: ['br', 'en'] },
        { id: null },
        { id: null },
    ];

    /* ── Textos da interface (acessibilidade e leitor) ── */
    const i18n = {
        br: {
            htmlLang: 'pt-BR',
            langName: 'Português',
            loading: 'Carregando...',
            error: (f) => `Não foi possível carregar o capítulo "${f}".`,
            close: 'Fechar',
            chapter: (id) => `Capítulo ${id}`,
            soon: 'Em breve',
            openChapters: 'Abrir capítulos',
            home: 'Início',
            menu: 'Menu',
            chaptersPage: 'Capítulos',
            mainPage: 'Página inicial',
        },
        en: {
            htmlLang: 'en',
            langName: 'English',
            loading: 'Loading...',
            error: (f) => `Could not load chapter "${f}".`,
            close: 'Close',
            chapter: (id) => `Chapter ${id}`,
            soon: 'Coming soon',
            openChapters: 'Open chapters',
            home: 'Home',
            menu: 'Menu',
            chaptersPage: 'Chapters',
            mainPage: 'Home page',
        },
        jp: {
            htmlLang: 'ja',
            langName: '日本語',
            loading: '読み込み中...',
            error: (f) => `章「${f}」を読み込めませんでした。`,
            close: '閉じる',
            chapter: (id) => `第${id}章`,
            soon: '近日公開',
            openChapters: '章を開く',
            home: 'ホーム',
            menu: 'メニュー',
            chaptersPage: '章一覧',
            mainPage: 'トップページ',
        },
    };

    let currentLang = DEFAULT_LANG;

    /* ── Capítulos ── */

    /** Decide capa e arquivo de texto de um capítulo para o idioma dado. */
    function resolveChapter(entry, lang) {
        const suffix = langMap[lang].chapterSuffix;

        if (entry.id !== null && entry.langs.includes(lang)) {
            const file = `${entry.id}${suffix}`;
            return { file, cover: `static/imgs/chapters/${file}.png`, placeholder: false };
        }

        const file = `ph${suffix}`;
        return { file, cover: `static/imgs/chapters/placeholders/${file}.png`, placeholder: true };
    }

    // Cria os botões a partir do manifesto
    const chapterItems = CHAPTERS.map((entry) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'chapter';

        const img = document.createElement('img');
        img.alt = '';
        el.appendChild(img);

        chaptersGrid.appendChild(el);

        const item = { entry, el, img, state: null };
        el.addEventListener('click', () => openReader(item));
        return item;
    });

    /** Nome acessível de um capítulo (placeholder vira "em breve"). */
    function labelChapter(item) {
        const t = i18n[currentLang];
        const label = item.state.placeholder
            ? t.soon
            : t.chapter(String(item.entry.id).toUpperCase());
        item.el.setAttribute('aria-label', label);
    }

    function applyChapter(item, lang) {
        item.state = resolveChapter(item.entry, lang);

        // Rede de segurança: se o manifesto prometeu uma capa que não existe, cai no placeholder
        item.img.onerror = () => {
            item.img.onerror = null;   // evita loop se o próprio placeholder faltar
            item.state = resolveChapter({ id: null }, currentLang);
            item.img.src = item.state.cover;
            labelChapter(item);
        };

        if (item.img.getAttribute('src') !== item.state.cover) {
            item.img.src = item.state.cover;
        }

        labelChapter(item);
    }

    function applyLabels(lang) {
        const t = i18n[lang];

        document.documentElement.lang = t.htmlLang;

        boxBtn.setAttribute('aria-label', t.openChapters);
        homeBtn.setAttribute('aria-label', t.home);
        bookyBtn.setAttribute('aria-label', t.menu);
        readerClose.setAttribute('aria-label', t.close);
        discordLink.setAttribute('aria-label', 'Discord');
        pageChapters.setAttribute('aria-label', t.chaptersPage);
        pageMain.setAttribute('aria-label', t.mainPage);

        langBtns.forEach(btn => {
            btn.setAttribute('aria-label', i18n[btn.dataset.lang].langName);
        });
    }

    function applyLang(lang) {
        const config = langMap[lang];
        if (!config) return;

        currentLang = lang;
        boxImg.src = config.box;

        chapterItems.forEach(item => applyChapter(item, lang));

        // Marca o botão ativo
        langBtns.forEach(btn => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('selected-theme', active);
            btn.setAttribute('aria-pressed', String(active));
        });

        applyLabels(lang);
        store.set(LANG_KEY, lang);
    }

    // Aplica idioma salvo ou o padrão (jp)
    const storedLang = store.get(LANG_KEY);
    applyLang(langMap[storedLang] ? storedLang : DEFAULT_LANG);

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyLang(btn.dataset.lang);
        });
    });

    /* ── Page navigation (scroll-snap nativo + URLs limpas) ──
     *   /          → página principal
     *   /chapters  → seleção de capítulos
     * O swipe, o arrasto, a inércia e o trackpad são do navegador.
     * O JS só: abre a página da URL, reage à página visível
     * (inert / History API) e oferece botões e teclado.
     * Obs.: abrir/recarregar /chapters direto exige que o servidor devolva
     * o index.html para essa rota (fallback de SPA).
     */
    const BASE = new URL(document.baseURI).pathname;   // pasta do app; sempre termina em "/"
    const PAGE_PATHS = ['chapters', ''];               // mesma ordem do DOM: esquerda → direita
    const pages = [pageChapters, pageMain];
    const CHAPTERS_PAGE = 0;
    const MAIN = 1;

    let current = -1;

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function pathFor(index) {
        return BASE + PAGE_PATHS[index];
    }

    /** Qual página a URL atual representa (qualquer rota desconhecida cai na principal). */
    function pageFromPath() {
        const path = location.pathname;
        const rel = (path.startsWith(BASE) ? path.slice(BASE.length) : '').replace(/\/+$/, '');
        const index = PAGE_PATHS.indexOf(rel);
        return index === -1 ? MAIN : index;
    }

    function syncUrl(index, replace) {
        const target = pathFor(index);
        if (location.pathname === target) return;

        try {
            history[replace ? 'replaceState' : 'pushState'](null, '', target);
        } catch (e) {
            /* ex.: abrindo via file:// — a navegação segue funcionando, só a URL não muda */
        }
    }

    function scrollToPage(index, smooth) {
        main.scrollTo({
            left: index * main.clientWidth,
            behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
        });
    }

    function goTo(index) {
        if (index < 0 || index >= pages.length) return;
        scrollToPage(index, true);
    }

    /** Chamado quando a página visível muda (swipe, botão, teclado ou "voltar"). */
    function setCurrent(index) {
        const previousFocus = document.activeElement;
        current = index;

        // A página fora da tela não deve receber foco nem ser lida por leitores de tela
        pages.forEach((page, i) => { page.inert = i !== index; });

        // Histórico: o botão "voltar" do navegador volta para a página anterior
        syncUrl(index, false);

        // Se o foco estava na página que saiu de cena, leva para a nova
        const lostFocus = pages.some((page, i) => i !== index && page.contains(previousFocus));
        if (lostFocus) pages[index].focus({ preventScroll: true });
    }

    // Posição inicial: a que a URL pede (sem animação)
    (function initPage() {
        const start = pageFromPath();

        scrollToPage(start, false);
        current = start;
        pages.forEach((page, i) => { page.inert = i !== start; });

        // Normaliza URLs como /index.html, /chapters/ ou rotas desconhecidas
        syncUrl(start, true);
    })();

    // Descobre qual página está visível (mais de 60%)
    const pageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const index = pages.indexOf(entry.target);
            if (index !== -1 && index !== current) setCurrent(index);
        });
    }, { root: main, threshold: 0.6 });

    pages.forEach(page => pageObserver.observe(page));

    // Botão "voltar"/"avançar" do navegador
    window.addEventListener('popstate', () => {
        const index = pageFromPath();
        if (index !== current) goTo(index);
    });

    // Mantém a página alinhada se a janela mudar de tamanho
    window.addEventListener('resize', () => scrollToPage(current, false));

    boxBtn.addEventListener('click', () => goTo(CHAPTERS_PAGE));

    homeBtn.addEventListener('click', () => {
        goTo(MAIN);
        setBooky(false);
    });

    /* ── Booky panel toggle ── */
    function setBooky(open) {
        bookyPanel.classList.toggle('open', open);
        bookyItems.inert = !open;   // fechado: itens fora da ordem de tabulação
        bookyBtn.setAttribute('aria-expanded', String(open));
    }

    bookyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBooky(!bookyPanel.classList.contains('open'));
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
        if (!bookyPanel.contains(e.target)) {
            setBooky(false);
        }
    });

    /* ── Teclado ── */
    document.addEventListener('keydown', (e) => {
        // Fecha o Booky ao pressionar Escape
        if (e.key === 'Escape') {
            if (bookyPanel.classList.contains('open')) {
                const hadFocus = bookyItems.contains(document.activeElement);
                setBooky(false);
                if (hadFocus) bookyBtn.focus();
            }
            return;
        }

        // Setas trocam de página (exceto com o leitor aberto ou com modificadores)
        if (readerDialog.open) return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

        if (e.key === 'ArrowLeft' && current > 0) {
            e.preventDefault();
            goTo(current - 1);
        } else if (e.key === 'ArrowRight' && current < pages.length - 1) {
            e.preventDefault();
            goTo(current + 1);
        }
    });

    /* ── Reader Dialog ── */
    let lastFocused = null;
    let readerAbort = null;
    const textCache = new Map();   // arquivo → texto já baixado

    /**
     * Renderiza o texto do arquivo como parágrafos no reader.
     * Linhas em branco separam parágrafos.
     * Blocos entre ``` e ``` são renderizados como cartas.
     */
    function renderText(text) {
        readerContent.innerHTML = '';

        const lines = text.split('\n');
        let inLetter = false;
        let letterEl = null;
        let buffer = [];

        const MEDIA_RE = /^<%(.+?)%>$/;

        function flushBuffer(container) {
            if (!buffer.length) return;
            // Só remove quebras de linha nas pontas — tabs e espaços internos são preservados
            const joined = buffer.join('\n').replace(/^[\n\r]+|[\n\r]+$/g, '');
            buffer = [];
            if (!joined) return;

            joined.split(/\r?\n\r?\n/).forEach(block => {
                // Remove apenas quebras de linha nas pontas do bloco, não tabs
                const stripped = block.replace(/^[\n\r]+|[\n\r]+$/g, '');
                if (!stripped) return;

                // Verifica se o bloco é uma mídia: <%nome_da_imagem.png%>
                const mediaMatch = stripped.trim().match(MEDIA_RE);
                if (mediaMatch) {
                    const filename = mediaMatch[1].trim();
                    const figure = document.createElement('figure');
                    figure.className = 'reader-media';
                    const img = document.createElement('img');
                    img.src = `static/imgs/media/${filename}`;
                    img.alt = filename;
                    img.loading = 'lazy';
                    img.onerror = function () {
                        figure.classList.add('reader-media--error');
                        figure.title = `Mídia não encontrada: ${filename}`;
                        this.remove();
                    };
                    figure.appendChild(img);
                    container.appendChild(figure);
                    return;
                }

                if (stripped.trimStart().startsWith('#')) {
                    const h = document.createElement('h2');
                    h.className = 'reader-title';
                    h.textContent = stripped.replace(/^[\t ]*#+\s*/, '');
                    container.appendChild(h);
                } else {
                    const p = document.createElement('p');
                    p.className = 'reader-paragraph';
                    p.textContent = stripped;
                    container.appendChild(p);
                }
            });
        }

        lines.forEach(line => {
            if (line.trim() === '```') {
                if (!inLetter) {
                    // Fecha buffer de texto normal e abre bloco de carta
                    flushBuffer(readerContent);
                    letterEl = document.createElement('div');
                    letterEl.className = 'reader-letter';
                    readerContent.appendChild(letterEl);
                    inLetter = true;
                } else {
                    // Fecha buffer da carta e volta ao modo normal
                    flushBuffer(letterEl);
                    inLetter = false;
                    letterEl = null;
                }
            } else {
                buffer.push(line);
            }
        });

        // Flush do que sobrou
        flushBuffer(inLetter && letterEl ? letterEl : readerContent);
    }

    function showMessage(className, text) {
        readerContent.replaceChildren();
        const p = document.createElement('p');
        p.className = className;
        p.textContent = text;
        readerContent.appendChild(p);
    }

    /** Baixa o texto do capítulo (com cache em memória). */
    async function loadChapterText(file, signal) {
        if (textCache.has(file)) return textCache.get(file);

        const res = await fetch(`static/chapters/${file}.txt`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        textCache.set(file, text);
        return text;
    }

    /**
     * Abre o dialog e carrega o arquivo de texto do capítulo.
     * O arquivo é buscado em static/chapters/{file}.txt (file vem do manifesto).
     */
    async function openReader(item) {
        const t = i18n[currentLang];
        const { file } = item.state;

        lastFocused = item.el;
        readerDialog.setAttribute('aria-label', item.el.getAttribute('aria-label') || '');

        // Cancela qualquer carregamento anterior ainda em andamento
        if (readerAbort) readerAbort.abort();
        readerAbort = new AbortController();
        const { signal } = readerAbort;

        showMessage('reader-loading', t.loading);
        readerContent.scrollTop = 0;

        document.body.classList.add('reader-open');   // trava scroll do fundo

        readerDialog.showModal();

        try {
            const text = await loadChapterText(file, signal);
            if (signal.aborted) return;

            renderText(text);
            readerContent.scrollTop = 0;
        } catch (err) {
            if (err.name === 'AbortError') return;
            showMessage('reader-error', t.error(file));
        }
    }

    // Qualquer forma de fechar (botão, Esc, botão "voltar" do Android) passa por aqui:
    // cancela o download, libera o scroll do fundo e devolve o foco ao capítulo que abriu o leitor.
    readerDialog.addEventListener('close', () => {
        if (readerAbort) {
            readerAbort.abort();
            readerAbort = null;
        }

        document.body.classList.remove('reader-open');

        if (lastFocused) {
            lastFocused.focus({ preventScroll: true });
            lastFocused = null;
        }
    });

    // Botão de fechar
    readerClose.addEventListener('click', () => readerDialog.close());

})();
