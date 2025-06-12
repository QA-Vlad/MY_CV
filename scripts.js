// PRODUCTION_BASE_PATH должен совпадать со значением в index.html (встроенный скрипт) и 404.html
// Это константа уровня приложения, можно определить вне класса.
const PRODUCTION_BASE_PATH = '/MY_CV';

class ResumeApp {
    constructor(productionBasePath) {
        // Присваиваем константу классу
        this._productionBasePath = productionBasePath;

        // Считываем значения, установленные встроенным скриптом в head
        // Используем запасные значения, хотя встроенный скрипт должен их установить
        this._basePath = window.appBasePath !== undefined ? window.appBasePath : productionBasePath;
        this._isLocal = window.isLocal !== undefined ? window.isLocal : (this._basePath !== productionBasePath);

        // Внутреннее состояние
        this._currentLang = 'ru'; // Язык по умолчанию, будет определен в init
        this._loadedTranslations = {};
        this._workDurationTimer = null; // Для хранения ID интервала таймера

        // Элементы DOM, которые будут использоваться часто
        this._elements = {
            languageToggle: document.getElementById('language-toggle'),
            downloadPdfButton: document.getElementById('download-pdf-button'),
            profilePhoto: document.getElementById('profile-photo'),
            gammisterLeadDuration: document.getElementById('gammister-lead-duration'),
            // Можно добавить ссылки на другие часто используемые элементы, если нужно
        };

        // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
        /*
        console.log("ResumeApp Constructor Debug:");
        console.log("  PRODUCTION_BASE_PATH:", this._productionBasePath);
        console.log("  _basePath:", this._basePath);
        console.log("  _isLocal:", this._isLocal);
        */
        // >>> КОНЕЦ ОТЛАДКИ <<<
    }

    // --- Основная точка входа после загрузки DOM ---
    async init() {
        // >>> ОТЛАДКА (опционально) <<<
        /*
        console.log("ResumeApp init Debug: Initializing application.");
        console.log("  Window location:", window.location.href);
        console.log("  Window pathname:", window.location.pathname);
        console.log("  Window search:", window.location.search);
        console.log("  Window hash:", window.location.hash);
        */
        // >>> КОНЕЦ ОТЛАДКИ <<<

        if (!document.body.classList.contains('loading-translations')) {
            document.body.classList.add('loading-translations');
        }

        let langToLoad = 'ru'; // Язык по умолчанию
        let performHistoryUpdateInChangeLanguage = true; // Нужно ли делать pushState после определения языка?

        const urlParams = new URLSearchParams(window.location.search);
        const spaPathFromParam = urlParams.get('spa_path');

        if (spaPathFromParam) {
            // Случай перехода с 404.html с параметром ?spa_path=
            // >>> ОТЛАДКА (опционально) <<<
            // console.log("init Debug: Handling spa_path =", spaPathFromParam);
            // >>> КОНЕЦ ОТЛАДКИ <<<

            urlParams.delete('spa_path');
            let cleanSearch = urlParams.toString();
            if (cleanSearch) cleanSearch = '?' + cleanSearch;

            // Определяем язык из spa_path
            let langSegment = spaPathFromParam.replace(/^\//, '').replace(/\/$/, "").split('/')[0];
            if (langSegment !== 'en' && langSegment !== 'ru') {
                 langSegment = 'ru'; // Дефолт, если spa_path некорректный
            }
            langToLoad = langSegment;

            // Формируем целевой URL для history.replaceState - канонический путь с учетом basePath
            const targetPathname = this._basePath === '' ? `/${langToLoad}/` : `${this._basePath}/${langToLoad}/`;
            const newHistoryPath = `${targetPathname}${cleanSearch}${window.location.hash}`;

            // >>> ОТЛАДКА (опционально) <<<
            // console.log("init Debug: spa_path -> newHistoryPath =", newHistoryPath);
            // >>> КОНЕЦ ОТЛАДКИ <<<

            // Заменяем текущее состояние истории на каноническое без spa_path
            history.replaceState({ lang: langToLoad }, document.title, newHistoryPath);
            performHistoryUpdateInChangeLanguage = false; // URL уже установлен replaceState

        } else {
            // Случай первой загрузки по URL типа /ru/, /MY_CV/en/, /MY_CV/ etc.
            const path = window.location.pathname;

             // >>> ОТЛАДКА (опционально) <<<
            // console.log("init Debug: No spa_path. Current path =", path);
            // >>> КОНЕЦ ОТЛАДКИ <<<

            // Проверяем, соответствует ли путь формату basePath/lang/
            const langPathRegex = this._basePath === ''
                ? /^\/(ru|en)\/?$/ // Локально: /ru/ или /en/
                : new RegExp(`^${this._basePath}/(ru|en)/?$`); // Продакшен: /MY_CV/ru/ или /MY_CV/en/

            const match = path.match(langPathRegex);

            if (match && match[1]) {
                // Если URL соответствует формату basePath/lang/
                langToLoad = match[1];

                // Проверяем, нужно ли сделать replaceState для канонического URL (со слешем в конце)
                const expectedPathWithSlash = this._basePath === '' ? `/${langToLoad}/` : `${this._basePath}/${langToLoad}/`;
                const currentPathnameEndsWithSlash = path.endsWith('/');
                const looksLikeFile = path.includes('.'); // Простая эвристика

                if (!currentPathnameEndsWithSlash && !looksLikeFile) {
                     // >>> ОТЛАДКА (опционально) <<<
                     // console.log(`init Debug: Path "${path}" matches ${this._basePath}/lang/ but needs trailing slash.`);
                     // >>> КОНЕЦ ОТЛАДКИ <<<

                     const expectedFullUrl = window.location.origin + expectedPathWithSlash + window.location.search + window.location.hash;
                     history.replaceState({ lang: langToLoad }, document.title, expectedFullUrl);
                     performHistoryUpdateInChangeLanguage = false; // URL установлен
                } else {
                     // >>> ОТЛАДКА (опционально) <<<
                     // console.log(`init Debug: Path "${path}" matches ${this._basePath}/lang/ and is canonical or looks like file.`);
                     // >>> КОНЕЦ ОТЛАДКИ <<<
                     performHistoryUpdateInChangeLanguage = false; // URL уже ок
                }

            } else {
                 // Если path не соответствует basePath/lang/ (и не spa_path)
                 // Это может быть корень (/, /MY_CV/), index.html (/index.html, /MY_CV/index.html)
                 // или любой другой некорректный путь.
                 // Дефолтимся на 'ru' и даем changeLanguage сделать pushState для исправления URL.

                 const pathRelativeToBase = this._basePath === '' ? path : (path.startsWith(this._basePath) ? path.substring(this._basePath.length) : path);
                 const pathRelativeToBaseNormalized = pathRelativeToBase === '/' ? '/' : pathRelativeToBase.replace(/^\//, '');
                 const isRootOrIndexRelativeToBase = (pathRelativeToBaseNormalized === '' || pathRelativeToBaseNormalized === '/' || pathRelativeToBaseNormalized === 'index.html' || pathRelativeToBaseNormalized === 'index');

                  // >>> ОТЛАДКА (опционально) <<<
                 /*
                 console.log(`init Debug: Path "${path}" does not match ${this._basePath}/lang/. pathRelativeToBaseNormalized: "${pathRelativeToBaseNormalized}". Is root/index: ${isRootOrIndexRelativeToBase}`);
                 */
                 // >>> КОНЕЦ ОТЛАДКИ <<<


                 if (isRootOrIndexRelativeToBase) {
                     langToLoad = 'ru'; // Дефолтный язык для корня/index
                      // Формируем дефолтный канонический путь basePath/ru/
                     const defaultLangPathname = this._basePath === '' ? `/ru/` : `${this._basePath}/ru/`;
                     const fullDefaultLangPath = `${defaultLangPathname}${window.location.search}${window.location.hash}`;

                      // Заменяем текущее состояние истории на дефолтное каноническое.
                      // Это важно, чтобы при последующем popstate (например, если пользователь перешел куда-то, а потом вернулся)
                      // он вернулся не на некорректный URL типа /MY_CV, а на /MY_CV/ru/.
                      // >>> ОТЛАДКА (опционально) <<<
                      // console.log(`init Debug: It's root/index. Replacing history with default: ${fullDefaultLangPath}`);
                      // >>> КОНЕЦ ОТЛАДКИ <<<
                     history.replaceState({ lang: langToLoad }, document.title, fullDefaultLangPath);
                     performHistoryUpdateInChangeLanguage = false; // URL установлен replaceState
                 } else {
                      // Это любой другой некорректный путь. Оставляем langToLoad = 'ru' (дефолт).
                      // changeLanguage сделает pushState на /basePath/ru/.
                      // >>> ОТЛАДКА (опционально) <<<
                      // console.log(`init Debug: Path "${path}" is neither /lang/ nor root/index. Defaulting to lang='ru', performHistoryUpdate=true.`);
                      // >>> КОНЕЦ ОТЛАДКИ <<<
                 }
            }
        }

        // Устанавливаем текущий язык приложения
        this._currentLang = langToLoad;
        // Сохраняем язык в history.state, если он еще не установлен (например, при первой загрузке, если не было replaceState)
        // или если replaceState был сделан без state.lang.
        // Проверяем history.state? или просто устанавливаем его?
        // При первой загрузке state обычно null. При переходе по SPA ссылке он может быть уже установлен.
        // При popstate он УЖЕ установлен.
        // Лучше всего, history.replaceState делается всегда в initializeApp для установки начального, канонического URL
        // и state.lang. Если мы дошли досюда, значит, replaceState уже был сделан выше.
        // Поэтому просто убедимся, что текущее состояние истории корректно отражает установленный this._currentLang.
        // Это нужно, если, например, initializeApp дефолтнул язык на 'ru' и сделал replaceState на /basePath/ru/,
        // но state был {}.

         // Обновляем state, если он пустой или язык не совпадает.
         // Но будьте осторожны, чтобы не сломать state, который мог быть установлен ранее в changeLanguage или popstate.
         // В текущей логике initializeApp, history.replaceState УЖЕ делается с { lang: langToLoad }.
         // Так что этот шаг, возможно, избыточен, если логика initializeApp совершенна.
         // Оставим его для надежности: если по какой-то причине state.lang не соответствует this._currentLang.
        if (history.state === null || history.state.lang !== this._currentLang) {
             // >>> ОТЛАДКА (опционально) <<<
             // console.log("init Debug: history.state.lang does not match _currentLang. Replacing state.");
             // console.log("  Current state:", history.state);
             // console.log("  _currentLang:", this._currentLang);
             // >>> КОНЕЦ ОТЛАДКИ <<<
             // Используем replaceState, чтобы не добавлять новую запись в историю
            history.replaceState({ lang: this._currentLang }, document.title, window.location.href);
        }


        // Загружаем и применяем переводы для определенного языка
        // performHistoryUpdateInChangeLanguage = false, потому что URL уже установлен/исправлен выше
        await this.changeLanguage(this._currentLang, false); // Не делаем pushState здесь

        // Настраиваем слушателей событий
        this._setupEventListeners();

        // Запускаем таймер обновления длительности работы
        this._updateWorkDuration(); // Первое обновление сразу
        if (this._workDurationTimer === null) {
             this._workDurationTimer = setInterval(() => this._updateWorkDuration(), 1000);
             // >>> ОТЛАДКА (опционально) <<<
             // console.log("init Debug: Started work duration timer.");
             // >>> КОНЕЦ ОТЛАДКИ <<<
        }
    }

    // --- Вспомогательные методы ---

    async _fetchTranslations(lang) {
        try {
            // Используем _basePath для формирования пути
            const fetchUrl = `${this._basePath}/translations/${lang}.json?v=${new Date().getTime()}`;
             // >>> ОТЛАДКА (опционально) <<<
             // console.log("_fetchTranslations Debug: Fetching from URL:", fetchUrl);
             // >>> КОНЕЦ ОТЛАДКИ <<<

            const response = await fetch(fetchUrl);
            if (!response.ok) {
                console.error(`Failed to load ${this._basePath}/translations/${lang}.json. Status: ${response.status} from URL: ${fetchUrl}`);
                let fallbackLang = 'ru';
                if (lang === fallbackLang) {
                     console.error("Critical error: Default language 'ru' also failed to load.");
                     // Не меняем _currentLang здесь, обработка ошибки и возможный откат
                     // должны быть в вызывающем методе (changeLanguage).
                     return {}; // Возвращаем пустой объект при критическом сбое
                }
                console.warn(`Falling back to '${fallbackLang}' from language '${lang}'`);
                // Рекурсивный вызов с запасным языком
                // В случае отката, fetchTranslations вернет переводы для fallbackLang.
                // Вызывающий метод changeLanguage должен будет обновить this._currentLang
                // на фактический язык, который был загружен.
                return await this._fetchTranslations(fallbackLang);
            }
            const translations = await response.json();
             // >>> ОТЛАДКА (опционально) <<<
             // console.log(`_fetchTranslations Debug: Successfully loaded translations for ${lang}.`);
             // >>> КОНЕЦ ОТЛАДКИ <<<
            return translations;
        } catch (error) {
            console.error(`Error loading translations for ${this._basePath}/translations/${lang}:`, error);
            let fallbackLang = 'ru';
            if (lang === fallbackLang) {
                 console.error("Critical error: Default language 'ru' also failed to load on error.");
                 return {}; // Возвращаем пустой объект при критическом сбое
            }
            console.warn(`Falling back to '${fallbackLang}' from language '${lang}' due to error.`);
            return await this._fetchTranslations(fallbackLang); // Рекурсивный вызов с запасным языком
        }
    }


    _updateMetaTags() {
        const head = document.head;
        // Используем _isLocal и _productionBasePath
        if (this._isLocal) {
            // Удаляем SEO теги, если они есть
            head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"], meta[name="robots"]').forEach(tag => tag.remove());
            const ogUrlMeta = document.querySelector('meta[property="og:url"]');
            if (ogUrlMeta) ogUrlMeta.content = window.location.href; // Текущий локальный URL
            return;
        }

        // Логика для продакшена
        head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

        const siteOrigin = window.location.origin;
        // Формируем канонические URL для продакшена в формате PRODUCTION_BASE_PATH/lang/
        const ruUrl = `${siteOrigin}${this._productionBasePath}/ru/`;
        const enUrl = `${siteOrigin}${this._productionBasePath}/en/`;
        const defaultUrl = ruUrl; // Русская версия как x-default

        let canonicalUrl = (this._currentLang === 'ru') ? ruUrl : enUrl;

        const canonicalTag = document.createElement('link');
        canonicalTag.setAttribute('rel', 'canonical');
        canonicalTag.setAttribute('href', canonicalUrl);
        head.appendChild(canonicalTag);

        ['ru', 'en', 'x-default'].forEach(langCode => {
            const tag = document.createElement('link');
            tag.setAttribute('rel', 'alternate');
            tag.setAttribute('hreflang', langCode);
            tag.setAttribute('href', langCode === 'en' ? enUrl : (langCode === 'ru' ? ruUrl : defaultUrl));
            head.appendChild(tag);
        });

        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) {
             ogUrlMeta.content = `${siteOrigin}${this._productionBasePath}/${this._currentLang}/`;
        }
        const robotsMeta = document.querySelector('meta[name="robots"]');
        if (robotsMeta) robotsMeta.content = "index, follow";
    }

    _applyTranslations() {
         // >>> ОТЛАДКА (опционально) <<<
         /*
         console.log("_applyTranslations Debug: Applying translations for lang:", this._currentLang);
         console.log("_applyTranslations Debug: Translations available:", Object.keys(this._loadedTranslations).length > 0);
         */
         // >>> КОНЕЦ ОТЛАДКИ <<<
        try {
            const translationsAvailable = Object.keys(this._loadedTranslations).length > 0;

            document.documentElement.lang = translationsAvailable && this._loadedTranslations['lang-code'] ? this._loadedTranslations['lang-code'] : this._currentLang;
            document.title = translationsAvailable && this._loadedTranslations['page-title'] ? this._loadedTranslations['page-title'] : 'CV Vladlen Kuznetsov';

            // Обновляем мета-теги (вызываем отдельным методом для чистоты)
            // this._updateMetaTags() вызывается уже в changeLanguage после applyTranslations

            // Обновляем alt текст фото
            if (this._elements.profilePhoto && translationsAvailable && this._loadedTranslations['profile-photo-alt'] !== undefined) {
                 this._elements.profilePhoto.alt = this._loadedTranslations['profile-photo-alt'];
            }

            // Обновляем элементы с data-lang-key
            document.querySelectorAll('[data-lang-key]').forEach(element => {
                const key = element.getAttribute('data-lang-key');
                if (translationsAvailable && this._loadedTranslations[key] !== undefined) {
                     element.innerHTML = this._loadedTranslations[key];
                }
            });

            // Обновляем текст кнопок
            if (this._elements.languageToggle) {
                 this._elements.languageToggle.textContent = translationsAvailable && this._loadedTranslations['lang-toggle-text'] !== undefined ? this._loadedTranslations['lang-toggle-text'] : (this._currentLang === 'ru' ? 'EN' : 'RU');
            }
            if (this._elements.downloadPdfButton) {
                this._elements.downloadPdfButton.textContent = translationsAvailable && this._loadedTranslations['download-pdf-button-text'] !== undefined ? this._loadedTranslations['download-pdf-button-text'] : (this._currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF');
            }
        } finally {
            // Убираем класс загрузки
            document.body.classList.remove('loading-translations');
        }
    }

    _updateWorkDuration() {
        const element = this._elements.gammisterLeadDuration;
        if (!element) return; // Выходим, если элемент не найден

        // --- Получаем строки и сокращения из переводов ---
        const translationsAvailable = Object.keys(this._loadedTranslations).length > 0;

        const baseStringFullDefault = this._currentLang === 'ru' ? "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)" : "May 2024 – Present | Gammister | UAE (Remote)";
        // Используем запасное значение, если перевод недоступен или пуст
        const baseStringFull = (((translationsAvailable && this._loadedTranslations['qa-lead-duration-full'] !== undefined) ? this._loadedTranslations['qa-lead-duration-full'] : baseStringFullDefault) || '').trim();

        const presentTextDefault = this._currentLang === 'ru' ? 'настоящее время' : 'Present';
        const presentTextString = ((translationsAvailable && this._loadedTranslations['present-time-text'] !== undefined) ? this._loadedTranslations['present-time-text'] : presentTextDefault || '').trim();

        const justStartedDefault = this._currentLang === 'ru' ? 'только началось' : 'just started';
        const justStartedText = ((translationsAvailable && this._loadedTranslations['duration-just-started'] !== undefined) ? this._loadedTranslations['duration-just-started'] : justStartedDefault || '').trim();

        const yearAbbr = ((translationsAvailable && this._loadedTranslations['year-abbr'] !== undefined) ? this._loadedTranslations['year-abbr'] : (this._currentLang === 'ru' ? 'г.' : 'yr') || '').trim();
        const monthAbbr = ((translationsAvailable && this._loadedTranslations['month-abbr'] !== undefined) ? this._loadedTranslations['month-abbr'] : (this._currentLang === 'ru' ? 'мес.' : 'mos') || '').trim();
        const dayAbbr = ((translationsAvailable && this._loadedTranslations['day-abbr'] !== undefined) ? this._loadedTranslations['day-abbr'] : (this._currentLang === 'ru' ? 'дн.' : 'days') || '').trim();
        const hourAbbr = ((translationsAvailable && this._loadedTranslations['hour-abbr'] !== undefined) ? this._loadedTranslations['hour-abbr'] : (this._currentLang === 'ru' ? 'ч.' : 'hrs') || '').trim();
        const minuteAbbr = ((translationsAvailable && this._loadedTranslations['minute-abbr'] !== undefined) ? this._loadedTranslations['minute-abbr'] : (this._currentLang === 'ru' ? 'мин.' : 'min') || '').trim();
        const secondAbbr = ((translationsAvailable && this._loadedTranslations['second-abbr'] !== undefined) ? this._loadedTranslations['second-abbr'] : (this._currentLang === 'ru' ? 'сек.' : 'sec') || '').trim();
        // --- Конец получения строк ---

        if (!baseStringFull || !presentTextString) {
             // console.warn("updateWorkDuration: Base string or present marker is empty.");
             element.innerHTML = baseStringFull || '';
             return;
        }
         if (!baseStringFull.includes(presentTextString)) {
             // console.warn(`updateWorkDuration: Present marker "${presentTextString}" not found in base string.`);
             element.innerHTML = baseStringFull;
             return;
        }


        const startDate = new Date('2024-05-25T00:00:00');
        const currentDate = new Date();
        const diffInMs = currentDate - startDate;

        if (diffInMs < 0) {
             // console.warn("updateWorkDuration: Start date is in the future.");
             element.innerHTML = baseStringFull;
             return;
        }

        const totalSeconds = Math.floor(diffInMs / 1000);
        let durationString = '';

        if (totalSeconds === 0) {
             durationString = justStartedText; // Меньше 1 секунды
        } else {
            // Расчет компонентов времени
            let seconds = totalSeconds % 60;
            let totalMinutes = Math.floor(totalSeconds / 60);
            let minutes = totalMinutes % 60;
            let totalHours = Math.floor(totalMinutes / 60);
            let hours = totalHours % 24;

            let years = 0;
            let months = 0;
            let tempDaysCalc = Math.floor(totalHours / 24);

            if (tempDaysCalc >= 365.25) { // Приближенный расчет лет
                years = Math.floor(tempDaysCalc / 365.25);
                tempDaysCalc -= Math.floor(years * 365.25);
            }
            if (tempDaysCalc >= 30.4375) { // Приближенный расчет месяцев
                months = Math.floor(tempDaysCalc / 30.4375);
                tempDaysCalc -= Math.floor(months * 30.4375);
            }
            let days = Math.floor(tempDaysCalc); // Оставшиеся дни

            const parts = [];
            let hasLargerPartThanMinutes = false; // Флаг для определения, есть ли единицы > минут

            // Добавляем компоненты, только если они > 0
            if (years > 0) { parts.push(`${years} ${yearAbbr}`); hasLargerPartThanMinutes = true; }
            if (months > 0) { parts.push(`${months} ${monthAbbr}`); hasLargerPartThanMinutes = true; }
            if (days > 0) { parts.push(`${days} ${dayAbbr}`); hasLargerPartThanMinutes = true; }
            if (hours > 0) { parts.push(`${hours} ${hourAbbr}`); hasLargerPartThanMinutes = true; }
            if (minutes > 0) { parts.push(`${minutes} ${minuteAbbr}`); }

            if (seconds > 0 || minutes > 0) {
                parts.push(`${seconds.toString().padStart(2, '0')} ${secondAbbr}`);
            }
            durationString = parts.join(' ');
        }

        // Формируем итоговый HTML
        const regex = new RegExp(presentTextString, 'g');
        // Добавляем разделитель " · " только если durationString не пустая
        const replacementString = `${presentTextString}${durationString ? ' · ' + durationString : ''}`;
        const updatedHtml = baseStringFull.replace(regex, replacementString);

        element.innerHTML = updatedHtml;
    }

    _setupEventListeners() {
        // Слушатель для кнопки смены языка
        if (this._elements.languageToggle) {
            this._elements.languageToggle.addEventListener('click', () => {
                const newLang = this._currentLang === 'ru' ? 'en' : 'ru';
                // При клике всегда обновляем историю (pushState)
                this.changeLanguage(newLang, true);
            });
        }

        // Слушатель для popstate (назад/вперед в браузере)
        window.addEventListener('popstate', (event) => this._handlePopState(event));

        // Настройка кнопки скачивания PDF
        this._setupPdfDownload();

        // Настройка внешних ссылок
        this._setupExternalLinks();
    }

    _handlePopState(event) {
         // >>> ОТЛАДКА (опционально) <<<
         // console.log("_handlePopState Debug: Event state:", event.state);
         // >>> КОНЕЦ ОТЛАДКИ <<<

        // history.state содержит объект, который мы сохранили при pushState/replaceState
        const state = event.state;

        if (state && state.lang) {
            // Если в состоянии есть язык, переключаем на него.
            // needsHistoryUpdate = false, потому что popstate УЖЕ изменил URL
            this.changeLanguage(state.lang, false);
        } else {
            // Если состояние пустое или нет lang (редкий случай или первая загрузка без SPA логики),
            // дефолтимся на русский и возможно корректируем URL, но не добавляем новую запись.
            // На практике, благодаря initializeApp, state.lang всегда должен быть установлен.
            // Если сюда попали без state.lang, возможно, пользователь перешел на некорректный URL,
            // который не был обработан initializeApp. В этом случае changeLanguage('ru', true)
            // скорректирует URL, добавив /ru/, и сделает pushState.
             // Однако, popstate не должен делать pushState, он должен просто отобразить то состояние,
             // на которое перешел пользователь.
             // Поэтому, если state пустой, лучше переинициализировать приложение с текущим URL.
             // Или просто дефолт на 'ru' без pushState.
             // Выберем дефолт на 'ru' без pushState, предполагая, что initializeApp при загрузке
             // уже установил правильный начальный state.
             console.warn("Popstate event with no language state. Defaulting to 'ru' without history update.");
             this.changeLanguage('ru', false);
        }
    }

    _setupPdfDownload() {
        if (this._elements.downloadPdfButton) {
            this._elements.downloadPdfButton.addEventListener('click', (event) => {
                event.preventDefault();

                let fileName = (this._currentLang === 'ru') ? 'Резюме - Кузнецов Владлен.pdf' : 'Resume - Kuznetsov Vladlen.pdf';
                // Используем _basePath
                const filePath = `${this._basePath}/pdf/${fileName}`;

                 // >>> ОТЛАДКА (опционально) <<<
                 // console.log("Download PDF Debug: File path:", filePath);
                 // >>> КОНЕЦ ОТЛАДКИ <<<

                const link = document.createElement('a');
                link.href = filePath;
                link.download = fileName;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    }

    _setupExternalLinks() {
        document.querySelectorAll('a[href]').forEach(link => {
            try {
                // Используем window.location.href как второй аргумент для правильного парсинга относительных URL
                const linkUrl = new URL(link.href, window.location.href);
                const linkHostname = linkUrl.hostname;
                const currentHostname = window.location.hostname;
                const linkPathname = linkUrl.pathname;

                 let isInternalAppLink = (linkHostname === currentHostname || linkHostname === 'localhost' || linkHostname === '127.0.0.1');

                 // Если _basePath не пустой, ссылка должна начинаться с него, чтобы считаться внутренней SPA ссылкой
                 if (this._basePath) {
                     // Ссылка считается внутренней, если она на том же хосте И ее pathname начинается с basePath (или равен basePath)
                      isInternalAppLink = isInternalAppLink && (linkPathname === this._basePath || linkPathname.startsWith(this._basePath + '/'));
                 } else {
                      // Если _basePath пустой (локально), любая ссылка на текущем домене считается внутренней app ссылкой
                      // isInternalAppLink уже true на этом шаге, если домен совпадает.
                 }

                // Ссылка является внешней, если она не внутренняя ссылка приложения И не mailto И не data:
                // Также явно исключаем ссылки, начинающиеся с # (якоря) - они всегда внутренние по определению SPA
                let isExternal = !isInternalAppLink && link.protocol !== 'mailto:' && link.protocol !== 'data:' && !link.href.startsWith('#');

                // >>> ОТЛАДКА (опционально) <<<
                 /*
                 console.log("Link Debug:", link.href, "| isExternal:", isExternal, "| isInternalAppLink:", isInternalAppLink, "| Protocol:", link.protocol, "| Starts with #:", link.href.startsWith('#'));
                 */
                // >>> КОНЕЦ ОТЛАДКИ <<<


                // Если ссылка является mailto или внешней
                const shouldOpenInNewTab = link.protocol === "mailto:" || isExternal;

                if (shouldOpenInNewTab) {
                     link.setAttribute('target', '_blank');
                     // Всегда добавляем rel="noopener noreferrer" для target="_blank" ссылок для безопасности
                     let existingRel = link.getAttribute('rel') || '';
                     if (!existingRel.includes('noopener')) existingRel += ' noopener';
                     if (!existingRel.includes('noreferrer')) existingRel += ' noreferrer';
                     link.setAttribute('rel', existingRel.trim());
                } else {
                    // Для внутренних ссылок (включая якоря и ссылки внутри basePath), убедимся, что target="_blank" и rel удалены
                     link.removeAttribute('target');
                     link.removeAttribute('rel'); // Удаляем все rel для внутренних ссылок, если нет специфических требований
                }
            } catch (e) {
                // Если парсинг URL не удался (например, некорректный href), считаем внутренней
                 console.warn("Link Debug: Failed to parse URL or internal link error:", link.href, e);
                 link.removeAttribute('target');
                 link.removeAttribute('rel');
            }
        });
    }

    // --- Публичный метод для смены языка (вызывается слушателем клика и init) ---
    async changeLanguage(lang, needsHistoryUpdate = true) {
         // >>> ОТЛАДКА (опционально) <<<
         /*
         console.log("changeLanguage Debug: Called with lang =", lang, ", needsHistoryUpdate =", needsHistoryUpdate);
         */
         // >>> КОНЕЦ ОТЛАДКИ <<<

        // Добавляем класс загрузки перед fetch, если его нет
        if (!document.body.classList.contains('loading-translations')) {
            document.body.classList.add('loading-translations');
        }

        const targetLang = lang; // Язык, который мы пытаемся загрузить

        // Загружаем переводы. _fetchTranslations может решить откатиться на 'ru'.
        const fetchedTranslations = await this._fetchTranslations(targetLang);

        if (Object.keys(fetchedTranslations).length > 0) {
             this._loadedTranslations = fetchedTranslations;
             // currentLang должен отражать фактический язык загруженных переводов
             this._currentLang = this._loadedTranslations['lang-code'] || targetLang;
              // >>> ОТЛАДКА (опционально) <<<
              // console.log("changeLanguage Debug: Translations loaded successfully. Actual lang:", this._currentLang);
              // >>> КОНЕЦ ОТЛАДКИ <<<
        } else {
             // Если fetchTranslations вернул пустой объект (критический сбой),
             // _loadedTranslations останется пустым или предыдущими переводами.
             // currentLang останется тем, что было до вызова changeLanguage.
             // applyTranslations сможет использовать дефолтные тексты или предыдущие переводы.
             console.error(`changeLanguage Debug: Failed to load translations for ${targetLang}. Keeping previous state.`);
             // НЕ МЕНЯЕМ _currentLang в случае ошибки, если не было явного отката в fetchTranslations.
             // Предполагается, что fetchTranslations сам устанавливает lang-code в translations.
        }


        // Применяем переводы и обновляем мета-теги
        this._applyTranslations();
        this._updateMetaTags();

        // Обновляем историю браузера, если необходимо (pushState)
        // replaceState для начальной загрузки уже сделан в init
        if (needsHistoryUpdate) {
            // Формируем новый канонический путь с учетом _basePath и актуального _currentLang
            const newPathname = this._basePath === '' ? `/${this._currentLang}/` : `${this._basePath}/${this._currentLang}/`; // Путь всегда должен заканчиваться на слеш
            const pageTitleForHistory = document.title; // Берем актуальный заголовок

            // Добавляем текущие search и hash
            const fullNewPath = `${newPathname}${window.location.search}${window.location.hash}`;

            // Сравниваем текущий URL с целевым полным каноническим URL перед pushState
            const currentFullUrl = window.location.href;
            const expectedFullUrl = window.location.origin + fullNewPath;

            // >>> ОТЛАДКА (опционально) <<<
            /*
            console.log("changeLanguage Debug: Updating history?");
            console.log("  Current Full URL:", currentFullUrl);
            console.log("  Expected Full URL:", expectedFullUrl);
            */
            // >>> КОНЕЦ ОТЛАДКИ <<<


            if (currentFullUrl !== expectedFullUrl) {
                 // Делаем pushState только если URL действительно меняется
                 history.pushState({ lang: this._currentLang }, pageTitleForHistory, expectedFullUrl);
                  // >>> ОТЛАДКА (опционально) <<<
                  // console.log("changeLanguage Debug: Doing history.pushState");
                  // >>> КОНЕЦ ОТЛАДКИ <<<
            } else {
                  // >>> ОТЛАДКА (опционально) <<<
                  // console.log("changeLanguage Debug: URL is already canonical, not pushing history.");
                  // >>> КОНЕЦ ОТЛАДКИ <<<
            }
        }

        // Обновляем счетчик опыта работы после смены языка и применения переводов
        this._updateWorkDuration();
    }
}

// --- Инициализация приложения после полной загрузки DOM ---
document.addEventListener('DOMContentLoaded', async () => {
     // >>> ОТЛАДКА (опционально) <<<
     // console.log("DOMContentLoaded Debug: DOM is fully loaded. Creating ResumeApp instance.");
     // >>> КОНЕЦ ОТЛАДКИ <<<

    // PRODUCTION_BASE_PATH определен в глобальной области видимости скрипта
    const app = new ResumeApp(PRODUCTION_BASE_PATH);

     // >>> ОТЛАДКА (опционально) <<<
     // console.log("DOMContentLoaded Debug: ResumeApp instance created. Calling init().");
     // >>> КОНЕЦ ОТЛАДКИ <<<

    // Запускаем инициализацию приложения
    await app.init();

     // >>> ОТЛАДКА (опционально) <<<
     // console.log("DOMContentLoaded Debug: App initialization finished.");
     // >>> КОНЕЦ ОТЛАДКИ <<<
});