(function () {
    'use strict';

    /* ── Language config ── */
    const LANG_KEY = 'selectedLang';

    const langMap = {
        br: {
            logo:          'static/imgs/logos/pt.png',
            box:           'static/imgs/decorations/webyy_br.png',
            chapterSuffix: '_pt',
        },
        en: {
            logo:          'static/imgs/logos/en.png',
            box:           'static/imgs/decorations/webyy_en.png',
            chapterSuffix: '_en',
        },
        jp: {
            logo:          'static/imgs/logos/jp.png',
            box:           'static/imgs/decorations/webyy_jp.png',
            chapterSuffix: '_jp',
        },
    };

    const boxImg   = document.getElementById('box-img');
    const langBtns = document.querySelectorAll('.lang-btn');
    const chapters = document.querySelectorAll('.chapter');

    function applyLang(lang) {
        const config = langMap[lang];
        if (!config) return;

        boxImg.src = config.box;

        chapters.forEach(chapter => {
            let img = chapter.querySelector('img');

            if (!img) {
                // Caso 1: O capítulo nem tem a tag img no HTML (como nos seus dois capítulos finais)
                img = document.createElement('img');
                img.dataset.isPlaceholder = "true"; // Marcador para sabermos que nasceu vazio
                img.src = `static/imgs/chapters/placeholders/ph${config.chapterSuffix}.png`;
                chapter.appendChild(img);
            } else {
                // Caso 2: A tag img já existe no HTML (capítulos 0, 1 e 2)
                
                // Salva o caminho "base" original na primeira vez que o script roda.
                // Isso garante que não vamos perder o nome do arquivo se a imagem falhar e virar placeholder.
                if (!img.dataset.baseSrc) {
                    img.dataset.baseSrc = img.src;
                }

                if (img.dataset.isPlaceholder === "true") {
                    // Se foi uma imagem criada pelo JS puramente como placeholder (Caso 1)
                    img.src = `static/imgs/chapters/placeholders/ph${config.chapterSuffix}.png`;
                } else {
                    // Tenta carregar a imagem do idioma selecionado usando o baseSrc salvo
                    const targetSrc = img.dataset.baseSrc.replace(/_(en|pt|jp)(?=\.\w+$)/, config.chapterSuffix);
                    
                    // Configura o evento de erro ANTES de tentar carregar a nova imagem
                    img.onerror = function() {
                        // Se a imagem não existir (ex: JP dos capítulos 0, 1 e 2), cai aqui e troca pelo placeholder
                        this.src = `static/imgs/chapters/placeholders/ph${config.chapterSuffix}.png`;
                        
                        // Remove o evento para evitar um loop infinito caso o próprio arquivo do placeholder falte
                        this.onerror = null; 
                    };

                    // Dispara o carregamento
                    img.src = targetSrc;
                }
            }
        });

        // Marca o botão ativo
        langBtns.forEach(btn => {
            btn.classList.toggle('selected-theme', btn.dataset.lang === lang);
        });

        localStorage.setItem(LANG_KEY, lang);
    }

    // Aplica idioma salvo ou o padrão (jp)
    const savedLang = localStorage.getItem(LANG_KEY) || 'jp';
    applyLang(savedLang);

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyLang(btn.dataset.lang);
        });
    });

    /* ── Page navigation ── */
    const PAGE_KEY = 'selectedPage';

    const main    = document.querySelector('main');
    const boxBtn  = document.querySelector('.mainpage > img:last-child');
    const backBtn = document.getElementById('backBtn');
    const homeBtn = document.getElementById('homeBtn');

    function applyPage(shifted) {
        main.classList.toggle('shifted', shifted);
        localStorage.setItem(PAGE_KEY, shifted ? 'chapters' : 'main');
    }

    // Restaura posição salva (sem animação, para não piscar na tela)
    if (localStorage.getItem(PAGE_KEY) === 'chapters') {
        main.style.transition = 'none';
        main.classList.add('shifted');
        main.getBoundingClientRect(); // força reflow síncrono antes de liberar a transição
        main.style.transition = '';
    }

    boxBtn.addEventListener('click', () => {
        applyPage(true);
    });

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            applyPage(false);
        });
    }

    homeBtn.addEventListener('click', () => {
        applyPage(false);
        bookyPanel.classList.remove('open');
    });

    /* ── Swipe support ── */
    let touchStartX = 0;

    document.addEventListener('touchstart', (e) => {
        if (readerDialog.open) return;
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (readerDialog.open) return;
        const delta = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(delta) < 60) return;
        if (delta > 0 && !main.classList.contains('shifted')) {
            applyPage(true);
        }
        if (delta < 0 && main.classList.contains('shifted')) {
            applyPage(false);
        }
    });

    /* ── Booky panel toggle ── */
    const bookyPanel = document.getElementById('bookyPanel');
    const bookyBtn   = document.getElementById('bookyBtn');

    bookyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bookyPanel.classList.toggle('open');
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
        if (!bookyPanel.contains(e.target)) {
            bookyPanel.classList.remove('open');
        }
    });

    // Fecha ao pressionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            bookyPanel.classList.remove('open');
        }
    });

    /* ── Reader Dialog ── */
    const readerDialog  = document.getElementById('readerDialog');
    const readerClose   = document.getElementById('readerClose');
    const readerContent = document.getElementById('readerContent');

    /**
     * Extrai o nome completo do arquivo do capítulo a partir do src da imagem.
     * Ex: "static/imgs/chapters/0_en.png" → "0_en"
     *     "static/imgs/chapters/c_pt.png" → "c_pt"
     *     placeholder ou sem imagem       → null
     */
    function getChapterFilename(chapterEl) {
        const img = chapterEl.querySelector('img');
        if (!img) return null;

        // Usa o src atual (já reflete a língua ativa via applyLang)
        const src = img.src;

        // Pega o nome do arquivo sem extensão: "0_en", "ph_pt", etc.
        const filename = src.split('/').pop().replace(/\.\w+$/, '');

        return filename || null;
    }

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
        let buffer   = [];

        function flushBuffer(container) {
            if (!buffer.length) return;
            // Só remove quebras de linha nas pontas — tabs e espaços internos são preservados
            const joined = buffer.join('\n').replace(/^[\n\r]+|[\n\r]+$/g, '');
            buffer = [];
            if (!joined) return;

            joined.split(/\n{2,}/).forEach(block => {
                // Remove apenas quebras de linha nas pontas do bloco, não tabs
                const stripped = block.replace(/^[\n\r]+|[\n\r]+$/g, '');
                if (!stripped) return;

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

    /**
     * Abre o dialog e carrega o arquivo de texto do capítulo.
     * O arquivo é buscado em static/chapters/{id}_{lang}.txt
     */
    async function openReader(chapterEl) {
        const filename = getChapterFilename(chapterEl);

        readerContent.innerHTML = '<p class="reader-loading">Carregando...</p>';
        readerContent.scrollTop = 0;
        readerDialog.showModal();

        if (!filename) {
            readerContent.innerHTML = '<p class="reader-error">Capítulo sem conteúdo.</p>';
            return;
        }

        try {
            const res = await fetch(`static/chapters/${filename}.txt`);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const text = await res.text();
            renderText(text);
            readerContent.scrollTop = 0;
        } catch (err) {
            readerContent.innerHTML = `<p class="reader-error">Não foi possível carregar o capítulo "${filename}".</p>`;
        }
    }

    function closeReader() {
        readerDialog.close();
    }

    // Clique nos chapters
    chapters.forEach(chapter => {
        chapter.addEventListener('click', () => {
            openReader(chapter);
        });
    });

    // Botão de fechar
    readerClose.addEventListener('click', closeReader);

    // Fecha ao clicar no backdrop (fora do dialog)
    readerDialog.addEventListener('click', (e) => {
        if (e.target === readerDialog) {
            closeReader();
        }
    });

})();
