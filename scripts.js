// PRODUCTION_BASE_PATH должен совпадать со значением в index.html (встроенный скрипт) и 404.html
const PRODUCTION_BASE_PATH = '/MY_CV';

// basePath и isLocal определяются во встроенном скрипте в index.html и доступны через window
// Если по какой-то причине они недоступны, используем запасные значения.
// (Это запасной вариант, встроенный скрипт должен их установить)
const basePath = window.appBasePath !== undefined ? window.appBasePath : PRODUCTION_BASE_PATH;
const isLocal = window.isLocal !== undefined ? window.isLocal : (basePath !== PRODUCTION_BASE_PATH);


// >>> ОТЛАДКА (опционально, включить для диагностики) <<<
/*
console.log("Main Script Debug (Top):");
console.log("  Read window.appBasePath:", window.appBasePath);
console.log("  Read window.isLocal:", window.isLocal);
console.log("  Using basePath:", basePath);
console.log("  Using isLocal:", isLocal);
*/
// >>> КОНЕЦ ОТЛАДКИ <<<


let currentLang = 'ru'; // Эта переменная будет инициализирована в initializeApp
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');


async function initializeApp() {
    // window.appBasePath и window.isLocal уже установлены здесь встроенным скриптом в head.

    // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
    /*
    console.log("initializeApp Debug:");
    console.log("  Window location:", window.location.href);
    console.log("  Window pathname:", window.location.pathname);
    console.log("  Window search:", window.location.search);
    console.log("  Window hash:", window.location.hash);
    console.log("  Using basePath (in initializeApp):", basePath);
    */
    // >>> КОНЕЦ ОТЛАДКИ <<<


    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru'; // Язык по умолчанию
    let performHistoryUpdateInChangeLanguage = true;

    const urlParams = new URLSearchParams(window.location.search);
    const spaPathFromParam = urlParams.get('spa_path');

    if (spaPathFromParam) {
        // Этот блок выполняется, когда мы пришли по ссылке с ?spa_path= (например, с 404.html)
        // >>> ОТЛАДКА (опционально) <<<
        // console.log("initializeApp Debug: Handling spa_path =", spaPathFromParam);
        // >>> КОНЕЦ ОТЛАДКИ <<<

        urlParams.delete('spa_path'); // Удаляем параметр spa_path
        let cleanSearch = urlParams.toString();
        if (cleanSearch) cleanSearch = '?' + cleanSearch;

        // spaPathFromParam может быть "en/" или "ru" или даже что-то некорректное вроде "blah/blah"
        let langSegment = spaPathFromParam.replace(/^\//, '').replace(/\/$/, "").split('/')[0]; // Убираем начальный/конечный слэш из spa_path и берем первую часть
        if (langSegment !== 'en' && langSegment !== 'ru') {
             langSegment = 'ru'; // Дефолт, если spa_path некорректный
        }
        langToLoad = langSegment;

        // Формируем целевой URL для history.replaceState. Это должен быть канонический путь с учетом basePath.
        const targetPathname = basePath === '' ? `/${langToLoad}/` : `${basePath}/${langToLoad}/`;
        const newHistoryPath = `${targetPathname}${cleanSearch}${window.location.hash}`;

        // >>> ОТЛАДКА (опционально) <<<
        // console.log("initializeApp Debug: spa_path -> newHistoryPath =", newHistoryPath);
        // >>> КОНЕЦ ОТЛАДКИ <<<

        history.replaceState({ lang: langToLoad }, document.title, newHistoryPath); // Обновляем URL
        performHistoryUpdateInChangeLanguage = false; // URL установлен, не нужен pushState в changeLanguage

    } else {
        // Этот блок выполняется при первой загрузке или обновлении страницы по URL типа /ru/ или /MY_CV/en/
        // Нужно определить язык из текущего pathname и при необходимости сделать replaceState на канонический URL
        const path = window.location.pathname;

         // >>> ОТЛАДКА (опционально) <<<
        // console.log("initializeApp Debug: No spa_path. Current path =", path);
        // >>> КОНЕГА ОТЛАДКИ <<<


        // Регулярка проверяет путь относительно basePath, ожидая /lang/
        const langPathRegex = basePath === ''
            ? /^\/(ru|en)\/?$/ // Локально: /ru/ или /en/
            : new RegExp(`^${basePath}/(ru|en)/?$`); // Продакшен: /MY_CV/ru/ или /MY_CV/en/

        const match = path.match(langPathRegex);

        if (match && match[1]) {
            // Если URL соответствует формату basePath/lang/
            langToLoad = match[1];
            // Проверяем, нужно ли делать replaceState для канонического URL (например, добавить слеш в конце если его нет)
            const expectedPathWithSlash = basePath === '' ? `/${langToLoad}/` : `${basePath}/${langToLoad}/`;

            // Проверяем, если текущий pathname не заканчивается на слеш и при этом не содержит точки (т.е. не файл)
            const currentPathnameEndsWithSlash = path.endsWith('/');
            const looksLikeFile = path.includes('.');

            if (!currentPathnameEndsWithSlash && !looksLikeFile) {
                 // >>> ОТЛАДКА (опционально) <<<
                 // console.log(`initializeApp Debug: Path "${path}" matches ${basePath}/lang/ but needs trailing slash.`);
                 // >>> КОНЕЦ ОТЛАДКИ <<<

                 // Делаем replaceState на URL со слешем в конце
                 const expectedFullUrl = window.location.origin + expectedPathWithSlash + window.location.search + window.location.hash;
                 history.replaceState({ lang: langToLoad }, document.title, expectedFullUrl);
                 performHistoryUpdateInChangeLanguage = false; // URL установлен
            } else {
                 // >>> ОТЛАДКА (опционально) <<<
                 // console.log(`initializeApp Debug: Path "${path}" matches ${basePath}/lang/ and is canonical or looks like file.`);
                 // >>> КОНЕЦ ОТЛАДКИ <<<
                 // Если URL уже канонический (со слешем) или выглядит как файл (т.е. не язык.путь)
                 performHistoryUpdateInChangeLanguage = false; // URL уже ок, не нужен pushState в changeLanguage
            }

        } else {
             // Если path не соответствует basePath/lang/ (и не spa_path)
             // Это может быть корень (/, /MY_CV/), index.html (/index.html, /MY_CV/index.html)
             // или любой другой некорректный путь (например, /about/, /ru/styles.css - хотя <base> должен исправить стили)

             // Проверяем, является ли путь корнем или index.html относительно basePath
             const pathRelativeToBase = basePath === '' ? path : (path.startsWith(basePath) ? path.substring(basePath.length) : path); // Убедимся, что basePath правильно отсекается
             // Нормализуем pathRelativeToBase, чтобы убрать ведущий слеш для сравнения с '', но оставить для сравнения с '/index.html' и т.д.
             const pathRelativeToBaseNormalized = pathRelativeToBase === '/' ? '/' : pathRelativeToBase.replace(/^\//, '');

             const isRootOrIndexRelativeToBase = (pathRelativeToBaseNormalized === '' || pathRelativeToBaseNormalized === '/' || pathRelativeToBaseNormalized === 'index.html' || pathRelativeToBaseNormalized === 'index');

             // >>> ОТЛАДКА (опционально) <<<
             /*
             console.log(`initializeApp Debug: Path "${path}" does not match ${basePath}/lang/. pathRelativeToBaseNormalized: "${pathRelativeToBaseNormalized}". Is root/index: ${isRootOrIndexRelativeToBase}`);
             */
             // >>> КОНЕЦ ОТЛАДКИ <<<


             if (isRootOrIndexRelativeToBase) {
                 // Если зашли на корень репозитория или index.html
                 langToLoad = 'ru'; // Язык по умолчанию
                  // Формируем дефолтный канонический путь basePath/ru/
                 const defaultLangPathname = basePath === '' ? `/ru/` : `${basePath}/ru/`;
                 const fullDefaultLangPath = `${defaultLangPathname}${window.location.search}${window.location.hash}`;
                  // Заменяем текущее состояние истории на дефолтное каноническое
                  // >>> ОТЛАДКА (опционально) <<<
                  // console.log(`initializeApp Debug: It's root/index. Replacing history with default: ${fullDefaultLangPath}`);
                  // >>> КОНЕЦ ОТЛАДКИ <<<

                 history.replaceState({ lang: langToLoad }, document.title, fullDefaultLangPath);
                 performHistoryUpdateInChangeLanguage = false; // URL установлен
             }
              // Если path не соответствует ни одному из известных шаблонов (basePath/lang/, корень, index),
              // langToLoad остается 'ru' (дефолт), а performHistoryUpdateInChangeLanguage остается true.
              // changeLanguage ниже сделает history.pushState на /basePath/ru/, исправляя некорректный URL.
              // >>> ОТЛАДКА (оционально) <<<
              /*
              else {
                  console.log(`initializeApp Debug: Path "${path}" is neither /lang/ nor root/index. Defaulting to lang='ru', performHistoryUpdate=true.`);
              }
              */
              // >>> КОНЕЦ ОТЛАДКИ <<<
        }
    }

    // currentLang инициализируется здесь, после определения из URL/spa_path
    currentLang = langToLoad;
     // >>> ОТЛАДКА (опционально) <<<
     // console.log("initializeApp Debug: Final langToLoad =", currentLang);
     // >>> КОНЕЦ ОТЛАДКИ <<<
    // Вызываем changeLanguage с определенным performHistoryUpdateInChangeLanguage
    await changeLanguage(currentLang, performHistoryUpdateInChangeLanguage);
}


async function fetchTranslations(lang) {
    try {
        // Используем window.appBasePath для формирования пути к translations, как определено встроенным скриптом
        const fetchUrl = `${window.appBasePath}/translations/${lang}.json?v=${new Date().getTime()}`;
         // >>> ОТЛАДКА (опционально) <<<
         // console.log("fetchTranslations Debug: Fetching from URL:", fetchUrl);
         // >>> КОНЕЦ ОТЛАДКИ <<<

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            console.error(`Failed to load ${window.appBasePath}/translations/${lang}.json. Status: ${response.status} from URL: ${fetchUrl}`);
            let fallbackLang = 'ru';
            if (lang === fallbackLang) {
                 console.error("Critical error: Default language 'ru' also failed to load.");
                 return {}; // Возвращаем пустой объект, если даже дефолт не загрузился
            }
            console.warn(`Falling back to '${fallbackLang}' from language '${lang}'`);
            // currentLang = fallbackLang; // НЕ МЕНЯЕМ currentLang здесь! Он изменится в changeLanguage если потребуется откат.
            return await fetchTranslations(fallbackLang); // Рекурсивный вызов с запасным языком
        }
        const translations = await response.json();
         // >>> ОТЛАДКА (опционально) <<<
         // console.log(`fetchTranslations Debug: Successfully loaded translations for ${lang}.`);
         // >>> КОНЕЦ ОТЛАДКИ <<<
         return translations;

    } catch (error) {
        console.error(`Error loading translations for ${window.appBasePath}/translations/${lang}:`, error);
        let fallbackLang = 'ru';
        if (lang === fallbackLang) {
             console.error("Critical error: Default language 'ru' also failed to load on error.");
             return {}; // Возвращаем пустой объект, если даже дефолт не загрузился
        }
        console.warn(`Falling back to '${fallbackLang}' from language '${lang}' due to error.`);
        // currentLang = fallbackLang; // НЕ МЕНЯЕМ currentLang здесь!
        return await fetchTranslations(fallbackLang); // Рекурсивный вызов с запасным языком
    }
}


function updateMetaTagsForSEO() {
    // Используем window.isLocal, определенный встроенным скриптом
    if (window.isLocal) {
        const head = document.head;
        // Удаляем SEO теги, если они есть (например, были в исходном HTML)
        head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"], meta[name="robots"]').forEach(tag => tag.remove());
        // Оставляем Open Graph теги, но, возможно, их тоже стоит удалить/изменить
        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) ogUrlMeta.content = window.location.href; // Текущий локальный URL
         return;
    }

    // Логика для продакшена (GitHub Pages)
    const head = document.head;
    // Удаляем существующие теги перед добавлением новых, чтобы избежать дублирования
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin;
    // Формируем канонические URL для продакшена в формате PRODUCTION_BASE_PATH/lang/
    const ruUrl = `${siteOrigin}${PRODUCTION_BASE_PATH}/ru/`;
    const enUrl = `${siteOrigin}${PRODUCTION_BASE_PATH}/en/`;
    const defaultUrl = ruUrl; // Русская версия как x-default (recomended for SEO)

    let canonicalUrl = (currentLang === 'ru') ? ruUrl : enUrl;

    // Добавляем canonical тег
    const canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    canonicalTag.setAttribute('href', canonicalUrl);
    head.appendChild(canonicalTag);

    // Добавляем alternate теги для языковых версий и x-default
    ['ru', 'en', 'x-default'].forEach(langCode => {
        const tag = document.createElement('link');
        tag.setAttribute('rel', 'alternate');
        tag.setAttribute('hreflang', langCode);
        tag.setAttribute('href', langCode === 'en' ? enUrl : (langCode === 'ru' ? ruUrl : defaultUrl) );
        head.appendChild(tag);
    });

    // Обновляем og:url для Open Graph
     const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    if (ogUrlMeta) {
         // og:url должен указывать на канонический URL текущей страницы с учетом текущего языка
         ogUrlMeta.content = `${siteOrigin}${PRODUCTION_BASE_PATH}/${currentLang}/`;
    }
    // Убедимся, что robots meta tag установлен правильно для продакшена
    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) robotsMeta.content = "index, follow"; // Или какое вам нужно значение для продакшена
}


function applyTranslations() {
     // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
     /*
     console.log("applyTranslations Debug: Applying translations for lang:", currentLang);
     console.log("applyTranslations Debug: Translations available:", Object.keys(loadedTranslations).length > 0);
     */
     // >>> КОНЕЦ ОТЛАДКИ <<<
    try {
        const translationsAvailable = Object.keys(loadedTranslations).length > 0;

        // Устанавливаем атрибут lang и title
        // Используем lang-code из переводов, если доступен, иначе currentLang
        document.documentElement.lang = translationsAvailable && loadedTranslations['lang-code'] ? loadedTranslations['lang-code'] : currentLang;
        document.title = translationsAvailable && loadedTranslations['page-title'] ? loadedTranslations['page-title'] : 'CV Vladlen Kuznetsov';

        // Обновляем мета-теги для SEO и Open Graph
        // Проверяем на undefined, чтобы пустая строка из перевода не была проигнорирована
        if (translationsAvailable) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && loadedTranslations['meta-description'] !== undefined) metaDesc.content = loadedTranslations['meta-description'];
            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords && loadedTranslations['meta-keywords'] !== undefined) metaKeywords.content = loadedTranslations['meta-keywords'];
            // Исправлены опечатки в селекторах og:title и og:description
            const ogTitle = document.querySelector('meta[property="og:title"]'); // <<< Исправлено
            if (ogTitle && loadedTranslations['og-title'] !== undefined) ogTitle.content = loadedTranslations['og-title'];
            const ogDesc = document.querySelector('meta[property="og:description"]'); // <<< Исправлено
            if (ogDesc && loadedTranslations['og-description'] !== undefined) ogDesc.content = loadedTranslations['og-description'];
        }

        // Обновляем alt текст для фото профиля
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto && translationsAvailable && loadedTranslations['profile-photo-alt'] !== undefined) {
             profilePhoto.alt = loadedTranslations['profile-photo-alt'];
        } // Иначе оставляем то, что в HTML (пустой alt)


        // Обновляем текст для всех элементов с data-lang-key
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
             // Проверяем, что перевод существует и не равен undefined (пустая строка - валидный перевод)
            if (translationsAvailable && loadedTranslations[key] !== undefined) {
                 element.innerHTML = loadedTranslations[key];
            } // Иначе оставляем то, что в HTML (если был дефолтный текст)
        });

        // Обновляем текст кнопок (у них нет дефолтного текста в HTML, кроме lang-toggle-text)
        if (toggleButton) {
             toggleButton.textContent = translationsAvailable && loadedTranslations['lang-toggle-text'] !== undefined ? loadedTranslations['lang-toggle-text'] : (currentLang === 'ru' ? 'EN' : 'RU');
        }
        const downloadPdfButton = document.getElementById('download-pdf-button');
         if (downloadPdfButton) {
            downloadPdfButton.textContent = translationsAvailable && loadedTranslations['download-pdf-button-text'] !== undefined ? loadedTranslations['download-pdf-button-text'] : (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF');
        }
    } finally {
        // Убираем класс загрузки после попытки применения переводов
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang, needsHistoryUpdate = true) {
     // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
     /*
     console.log("changeLanguage Debug: Called with lang =", lang, ", needsHistoryUpdate =", needsHistoryUpdate);
     */
     // >>> КОНЕЦ ОТЛАДКИ <<<

    // Добавляем класс загрузки
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    // Устанавливаем новый язык, который пытаемся загрузить
    const targetLang = lang;
    // Загружаем переводы. fetchTranslations может решить откатиться на 'ru'
    loadedTranslations = await fetchTranslations(targetLang);

    // currentLang должен отражать *фактический* язык, который был загружен.
    // fetchTranslations при откате уже мог изменить глобальный currentLang.
    // Или мы можем явно взять lang-code из загруженных переводов, если он есть.
    if (Object.keys(loadedTranslations).length > 0 && loadedTranslations['lang-code']) {
        currentLang = loadedTranslations['lang-code'];
         // >>> ОТЛАДКА (опционально) <<<
        // console.log("changeLanguage Debug: Fetched translations. Actual lang from loaded:", currentLang);
         // >>> КОНЕЦ ОТЛАДКИ <<<
    } else {
         // >>> ОТЛАДКА (оционально) <<<
        // console.warn("changeLanguage Debug: Translations not loaded or no lang-code. currentLang remains:", currentLang);
         // >>> КОНЕЦ ОТЛАДКИ <<<
         // Если переводы не загружены или нет lang-code, currentLang останется тем,
         // который был установлен как targetLang в начале этой функции.
         // fetchTranslations при критическом сбое мог установить currentLang = 'ru'.
         // Оставляем currentLang как есть после fetchTranslations.
    }


    // Применяем переводы (использует актуальный currentLang и loadedTranslations)
    applyTranslations();
    // Обновляем SEO мета-теги (использует актуальный currentLang)
    updateMetaTagsForSEO();

    // Обновляем историю браузера, если необходимо
    if (needsHistoryUpdate) {
        // Формируем новый канонический путь с учетом window.appBasePath (определен встроенным скриптом) и актуального currentLang
        const newPathname = window.appBasePath === '' ? `/${currentLang}/` : `${window.appBasePath}/${currentLang}/`; // Путь всегда должен заканчиваться на слеш для консистентности
        const pageTitleForHistory = document.title; // Берем актуальный заголовок после applyTranslations
        // Добавляем текущие search и hash к новому пути из window.location
        const fullNewPath = `${newPathname}${window.location.search}${window.location.hash}`;

        // Сравниваем текущий URL с целевым полным каноническим URL
        const currentFullUrl = window.location.href;
        const expectedFullUrl = window.location.origin + fullNewPath;

        // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
        /*
        console.log("changeLanguage Debug: Updating history?");
        console.log("  Current Full URL:", currentFullUrl);
        console.log("  Expected Full URL:", expectedFullUrl);
        */
        // >>> КОНЕЦ ОТЛАДКИ <<<


        if (currentFullUrl !== expectedFullUrl) {
             // Если текущий полный URL отличается от целевого канонического, делаем pushState
             // Это покроет случаи смены языка (нужен новый entry в history)
             // и случаи исправления некорректного URL при первой загрузке, если initializeApp установил needsHistoryUpdate = true
             history.pushState({ lang: currentLang }, pageTitleForHistory, expectedFullUrl);
              // >>> ОТЛАДКА (опционально) <<<
              // console.log("changeLanguage Debug: Doing history.pushState");
              // >>> КОНЕЦ ОТЛАДКИ <<<
        } else {
             // Если URL уже exactly как expectedFullUrl, ничего не делаем.
             // Это может произойти при обновлении страницы на каноническом URL.
              // >>> ОТЛАДКА (опционально) <<<
              // console.log("changeLanguage Debug: URL is already canonical, not pushing history.");
              // >>> КОНЕЦ ОТЛАДКИ <<<
        }
    }
    // Обновляем счетчик опыта работы после смены языка и применения переводов
    updateWorkDuration();
}


// Обработчик клика по кнопке смены языка
if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        // При клике всегда обновляем историю (pushState)
        changeLanguage(newLang, true);
    });
}


function updateWorkDuration() {
     // >>>  ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: Called.");
     // >>> КОНЕЦ ОТЛАДКИ <<<

    const element = document.getElementById('gammister-lead-duration');
    if (!element) {
        console.warn("updateWorkDuration: Element with ID 'gammister-lead-duration' not found.");
        return;
    }

    // --- Start: Get strings and abbreviations ---
    // Получаем базовую строку из загруженных переводов или используем дефолт, и обрезаем пробелы
    const translationsAvailable = Object.keys(loadedTranslations).length > 0;

    let baseStringFullDefault = currentLang === 'ru' ? "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)" : "May 2024 – Present | Gammister | UAE (Remote)";
    const baseStringFull = (((translationsAvailable && loadedTranslations['qa-lead-duration-full'] !== undefined) ? loadedTranslations['qa-lead-duration-full'] : baseStringFullDefault) || '').trim();

    // Получаем перевод текста "настоящее время" и сокращений, и обрезаем пробелы
    let presentTextDefault = currentLang === 'ru' ? 'настоящее время' : 'Present';
    const presentTextString = ((translationsAvailable && loadedTranslations['present-time-text'] !== undefined) ? loadedTranslations['present-time-text'] : presentTextDefault || '').trim();

    let justStartedDefault = currentLang === 'ru' ? 'только началось' : 'just started';
    const justStartedText = ((translationsAvailable && loadedTranslations['duration-just-started'] !== undefined) ? loadedTranslations['duration-just-started'] : justStartedDefault || '').trim();


    let yearAbbrDefault = currentLang === 'ru' ? 'г.' : 'yr';
    const yearAbbr = ((translationsAvailable && loadedTranslations['year-abbr'] !== undefined) ? loadedTranslations['year-abbr'] : yearAbbrDefault || '').trim();
    let monthAbbrDefault = currentLang === 'ru' ? 'мес.' : 'mos';
    const monthAbbr = ((translationsAvailable && loadedTranslations['month-abbr'] !== undefined) ? loadedTranslations['month-abbr'] : monthAbbrDefault || '').trim();
    let dayAbbrDefault = currentLang === 'ru' ? 'дн.' : 'days';
    const dayAbbr = ((translationsAvailable && loadedTranslations['day-abbr'] !== undefined) ? loadedTranslations['day-abbr'] : dayAbbrDefault || '').trim();
    let hourAbbrDefault = currentLang === 'ru' ? 'ч.' : 'hrs';
    const hourAbbr = ((translationsAvailable && loadedTranslations['hour-abbr'] !== undefined) ? loadedTranslations['hour-abbr'] : hourAbbrDefault || '').trim();
    let minuteAbbrDefault = currentLang === 'ru' ? 'мин.' : 'min';
    const minuteAbbr = ((translationsAvailable && loadedTranslations['minute-abbr'] !== undefined) ? loadedTranslations['minute-abbr'] : minuteAbbrDefault || '').trim();
    let secondAbbrDefault = currentLang === 'ru' ? 'сек.' : 'sec';
    const secondAbbr = ((translationsAvailable && loadedTranslations['second-abbr'] !== undefined) ? loadedTranslations['second-abbr'] : secondAbbrDefault || '').trim();
    // --- End: Get strings and abbreviations ---


     // >>> ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: baseStringFull:", baseStringFull);
     // console.log("updateWorkDuration Debug: presentTextString:", presentTextString);
     // console.log("updateWorkDuration Debug: Translations available:", translationsAvailable);
     // Проверим, содержится ли строка "настоящее время" в baseStringFull
     // console.log("updateWorkDuration Debug: baseStringFull includes presentTextString:", baseStringFull.includes(presentTextString));
     // >>> КОНЕЦ ОТЛАДКИ <<<


    if (!baseStringFull || !presentTextString) {
        console.warn("updateWorkDuration: Base string or present marker is empty after trimming.");
        element.innerHTML = baseStringFull || ''; // Устанавливаем базовую строку, если она есть
        return;
    }

    // Проверяем, есть ли вообще "настоящее время" в базовой строке
    if (!baseStringFull.includes(presentTextString)) {
         console.warn(`updateWorkDuration: Present marker "${presentTextString}" not found in base string after trimming. Displaying base string as is.`);
         element.innerHTML = baseStringFull; // Устанавливаем базовую строку, если маркер не найден
         return;
    }


    const startDate = new Date('2024-05-25T00:00:00');
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

     // >>> ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: startDate:", startDate);
     // console.log("updateWorkDuration Debug: currentDate:", currentDate);
     // console.log("updateWorkDuration Debug: diffInMs:", diffInMs);
     // >>> КОНЕЦ ОТЛАДКИ <<<


    if (diffInMs < 0) {
         console.warn("updateWorkDuration: Start date is in the future.");
         // Если дата начала в будущем, просто показываем базовую строку без таймера
         element.innerHTML = baseStringFull;
         return;
    }

    const totalSeconds = Math.floor(diffInMs / 1000);

     // >>> ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: totalSeconds:", totalSeconds);
     // >>> КОНЕЦ ОТЛАДКИ <<<


    let durationString = ''; // Сюда соберем строку длительности

    if (totalSeconds === 0) {
         console.log("updateWorkDuration Debug: totalSeconds is 0, using 'just started' logic.");
        durationString = justStartedText;
    } else {
        let seconds = totalSeconds % 60;
        let totalMinutes = Math.floor(totalSeconds / 60);
        let minutes = totalMinutes % 60;
        let totalHours = Math.floor(totalMinutes / 60);
        let hours = totalHours % 24;

        let years = 0;
        let months = 0;
        let tempDaysCalc = Math.floor(totalHours / 24);

        if (tempDaysCalc >= 365.25) {
            years = Math.floor(tempDaysCalc / 365.25);
            tempDaysCalc -= Math.floor(years * 365.25);
        }
        if (tempDaysCalc >= 30.4375) {
            months = Math.floor(tempDaysCalc / 30.4375);
            tempDaysCalc -= Math.floor(months * 30.4375);
        }
        let days = Math.floor(tempDaysCalc);


         // >>> ОТЛАДКА <<<
         // console.log("updateWorkDuration Debug: Calculated duration parts (approx):", {years, months, days, hours, minutes, seconds});
         // >>> КОНЕЦ ОТЛАДКИ <<<

        // === ЛОГИКА СБОРКИ СТРОКИ ДЛИТЕЛЬНОСТИ (Add parts if > 0) ===
        const parts = [];
        if (years > 0) {
            parts.push(`${years} ${yearAbbr}`);
        }
        if (months > 0) {
             parts.push(`${months} ${monthAbbr}`);
        }
        if (days > 0) {
             parts.push(`${days} ${dayAbbr}`);
        }
        if (hours > 0) {
             parts.push(`${hours} ${hourAbbr}`);
        }
        if (minutes > 0) {
             parts.push(`${minutes} ${minuteAbbr}`);
        }
        if (seconds > 0) {
             parts.push(`${seconds} ${secondAbbr}`);
        }

        if (parts.length === 0 && totalSeconds > 0) {
             parts.push(`${totalSeconds} ${secondAbbr}`);
        }

        durationString = parts.join(' ');
    }


     // >>> ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: Formatted durationString:", durationString);
     // >>> КОНЕЦ ОТЛАДКИ <<<


    // >>> УПРОЩЕННАЯ ЛОГИКА ВСТАВКИ <<<
    // Заменяем presentTextString на себя + " · " + durationString
    // Меняем регулярку, чтобы она искала просто подстроку
    const regex = new RegExp(presentTextString, 'g');

    // Формируем строку для замены: "настоящее время" + " · " + "длительность" (если длительность есть)
    const replacementString = `${presentTextString}${durationString ? ' · ' + durationString : ''}`;
    const updatedHtml = baseStringFull.replace(regex, replacementString);

    // >>> ОТЛАДКА <<<
    // console.log("updateWorkDuration Debug: calculated updatedHtml (before assign):", updatedHtml);
    // >>> КОНЕЦ ОТЛАДКИ <<<


    // Обновляем HTML элемента
    element.innerHTML = updatedHtml;


     // >>> ОТЛАДКА <<<
     // console.log("updateWorkDuration Debug: Final element HTML (after assign):", element.innerHTML);
     // >>> КОНЕЦ ОТЛАДКИ <<<
}

// Обработчик события полной загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
     // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
     /*
     console.log("DOMContentLoaded Debug: DOM is fully loaded.");
     console.log("DOMContentLoaded Debug: Initializing app...");
     */
     // >>> КОНЕЦ ОТЛАДКИ <<<

    // window.appBasePath и window.isLocal уже доступны благодаря встроенному скрипту

    // Инициализируем приложение (определение языка, загрузка переводов, обновление UI)
    // currentLang будет установлен внутри initializeApp
    await initializeApp();

     // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
     /*
     console.log("DOMContentLoaded Debug: initializeApp finished. Current lang:", currentLang);
     console.log("DOMContentLoaded Debug: loadedTranslations status:", Object.keys(loadedTranslations).length > 0 ? "Loaded" : "Failed");
     console.log("DOMContentLoaded Debug: Updating work duration...");
     */
     // >>> КОНЕЦ ОТЛАДКИ <<<

    // Запускаем первое обновление таймера сразу после инициализации
    updateWorkDuration();
    // Настраиваем интервал для ежесекундного обновления таймера
    // Убедимся, что интервал установлен только один раз при загрузке страницы
    if (!window.timerInterval) { // Проверяем, не установлен ли уже интервал в глобальном window
         // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
         // console.log("DOMContentLoaded Debug: Starting timer interval.");
         // >>> КОНЕЦ ОТЛАДКИ <<<
        window.timerInterval = setInterval(updateWorkDuration, 1000);
    } else {
         // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
         // console.log("DOMContentLoaded Debug: Timer interval already exists.");
         // >>> КОНЕЦ ОТЛАДКИ <<<
    }


    // Находим кнопку скачивания PDF
    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        // Добавляем обработчик клика
        downloadPdfButton.addEventListener('click', (event) => {
            // Предотвращаем стандартное действие ссылки (переход)
            event.preventDefault();

            // Определяем имя файла PDF в зависимости от текущего языка
            let fileName = (currentLang === 'ru') ? 'Резюме - Кузнецов Владлен.pdf' : 'Resume - Kuznetsov Vladlen.pdf';

            // Формируем путь к файлу PDF с учетом window.appBasePath
            // Используем window.appBasePath, который уже включает '/' или '/MY_CV'
            const filePath = `${window.appBasePath}/pdf/${fileName}`;

             // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
             /*
             console.log("Download PDF Debug: File path:", filePath);
             */
             // >>> КОНЕЦ ОТЛАДКИ <<<

            // Создаем временную ссылку для скачивания
            const link = document.createElement('a');
            link.href = filePath; // Указываем URL файла
            link.download = fileName; // Указываем имя файла для сохранения

            // Добавляем ссылку в DOM, кликаем по ней программно, затем удаляем
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Настраиваем атрибуты target="_blank" и rel="noopener noreferrer" для внешних ссылок
    document.querySelectorAll('a[href]').forEach(link => { // Проверяем все ссылки с href
        try {
            // Используем window.location.href как второй аргумент для правильного парсинга относительных URL
            const linkUrl = new URL(link.href, window.location.href);
            const linkHostname = linkUrl.hostname;
            const currentHostname = window.location.hostname;
            const linkPathname = linkUrl.pathname;

             // Определяем, является ли ссылка внутренней по hostname и basePath
             // Она внутренняя, если домен совпадает (или локальный) И pathname находится внутри basePath
             let isInternalAppLink = (linkHostname === currentHostname || linkHostname === 'localhost' || linkHostname === '127.0.0.1');

             // Проверяем, что путь ссылки находится в пределах basePath.
             // Учитываем, что basePath может быть пустым ('') локально.
             if (window.appBasePath) { // Если basePath не пустой, ссылка должна начинаться с него
                  // Сравниваем пути после Origin и basePath, добавляя слеш для сравнения путей папок
                  // Убеждаемся, что linkPathname начинается с window.appBasePath, прежде чем отсекать.
                  // const linkPathnameRelativeToBase = linkPathname.startsWith(window.appBasePath)
                  //     ? linkPathname.substring(window.appBasePath.length)
                  //     : linkPathname; // Эта переменная была лишней

                  // Ссылка считается внутренней, если она на том же хосте И ее pathname начинается с basePath (или равен basePath)
                  // Например: https://qa-vlad.github.io/MY_CV/ru/ (current) -> href="pdf/file.pdf" -> linkUrl="https://qa-vlad.github.io/MY_CV/ru/pdf/file.pdf"
                  // -> linkPathname="/MY_CV/ru/pdf/file.pdf". window.appBasePath = "/MY_CV".
                  // linkPathname.startsWith(window.appBasePath) true. isInternalAppLink остается true.

                  isInternalAppLink = isInternalAppLink && (linkPathname === window.appBasePath || linkPathname.startsWith(window.appBasePath + '/'));

             } else { // Если basePath пустой (''), любая ссылка на текущем домене считается внутренней app ссылкой (кроме явно внешних протоколов)
                  // isInternalAppLink уже true, если домен совпадает
             }


            // Ссылка является внешней, если она не внутренняя ссылка приложения И не mailto И не data:
            let isExternal = !isInternalAppLink && link.protocol !== 'mailto:' && link.protocol !== 'data:';

            // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
            /*
            console.log("Link Debug:", link.href, "| isExternal:", isExternal, "| isInternalAppLink:", isInternalAppLink, "| Protocol:", link.protocol);
            */
            // >>> КОНЕЦ ОТЛАДКИ <<<


            // Если ссылка является mailto или внешней
            const shouldOpenInNewTab = link.protocol === "mailto:" || isExternal;

            if (shouldOpenInNewTab) {
                 link.setAttribute('target', '_blank');
                 // Всегда добавляем rel="noopener noreferrer" для target="_blank" ссылок для безопасности
                 // Убедимся, что noreferrer включен для безопасности, даже если rel уже есть
                 let existingRel = link.getAttribute('rel') || '';
                 if (!existingRel.includes('noopener')) existingRel += ' noopener';
                 if (!existingRel.includes('noreferrer')) existingRel += ' noreferrer';
                 link.setAttribute('rel', existingRel.trim());

            } else {
                // Для внутренних ссылок (якоря, ссылки внутри текущего домена и basePath), убедимся, что target="_blank" и rel удалены
                 link.removeAttribute('target');
                 // Удаляем rel для внутренних ссылок, если он там не нужен по другой причине (например, rel="nofollow")
                 // Если вам нужны другие rel атрибуты для внутренних ссылок, нужно более сложная логика.
                 // Для простоты удалим все rel для внутренних:
                 link.removeAttribute('rel');
            }
        } catch (e) {
            // Если парсинг URL не удался (например, просто href="#"), считаем ссылку внутренней
            // >>> ОТЛАДКА (опционально, включить для диагностики) <<<
            // console.warn("Link Debug: Failed to parse URL or internal link error:", link.href, e);
            // >>> КОНЕЦ ОТЛАДКИ <<<

             link.removeAttribute('target');
             link.removeAttribute('rel');
        }
    });

});