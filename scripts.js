let currentLang = 'ru';
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');

// Определяем basePath на основе текущего пути URL
const productionBasePath = '/MY_CV';
// basePath будет '/MY_CV', если URL начинается с '/MY_CV/', или равен '/MY_CV' (для корня репозитория)
// Иначе, basePath будет '' (пустая строка) для локальной разработки на корневом порту
const basePath = window.location.pathname.startsWith(productionBasePath + '/') || window.location.pathname === productionBasePath
    ? productionBasePath
    : '';

// Флаг isLocal теперь зависит от basePath
const isLocal = basePath === '';


async function initializeApp() {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru';
    let performHistoryUpdateInChangeLanguage = true;

    const urlParams = new URLSearchParams(window.location.search);
    const spaPathFromParam = urlParams.get('spa_path');

    if (spaPathFromParam) {
        urlParams.delete('spa_path');
        let cleanSearch = urlParams.toString();
        if (cleanSearch) cleanSearch = '?' + cleanSearch;

        // spaPathFromParam может быть "en/" или "ru" и т.д.
        let langSegment = spaPathFromParam.replace(/\/$/, "").split('/')[0]; // Убираем конечный / перед split
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment;
        }

        const cleanSpaPath = spaPathFromParam.replace(/^\//, '').replace(/\/$/, ""); // Убираем начальный/конечный слэш из spa_path
        const newHistoryPath = `${basePath}/${cleanSpaPath}${cleanSearch}${window.location.hash}`;
         // Убедимся, что у нас не получается двойной слеш в начале, если basePath пустой (basePath='' -> //ru/ -> /ru/)
        const finalNewHistoryPath = newHistoryPath.replace(/^\/\//, '/');


        history.replaceState({ lang: langToLoad }, document.title, finalNewHistoryPath); // Обновляем URL без spa_path
        performHistoryUpdateInChangeLanguage = false; // URL уже установлен, не нужен pushState в changeLanguage
    } else {
        // Логика определения языка из текущего пути, если spa_path не было
        const path = window.location.pathname;
        const langPathRegex = basePath === ''
            ? /^\/(ru|en)\/?$/
            : new RegExp(`^${basePath}/(ru|en)/?$`);
        const match = path.match(langPathRegex);

        if (match && match[1]) {
            langToLoad = match[1];
            const expectedPathWithSlash = basePath === '' ? `/${langToLoad}/` : `${basePath}/${langToLoad}/`;
            if (window.location.pathname !== expectedPathWithSlash) { // Если URL не канонический (например, без слеша)
                history.replaceState({ lang: langToLoad }, document.title, `${expectedPathWithSlash}${window.location.search}${window.location.hash}`);
            }
            performHistoryUpdateInChangeLanguage = false; // URL уже (или только что стал) каноническим
        } else {
            // Если путь не соответствует basePath/lang/
            // Проверяем, является ли путь корнем (basePath сам по себе или basePath/)
            const isRootPath = (path === basePath || path === basePath + '/');
             // Добавим проверку на пустой basePath для корня '/'
            const isLocalRoot = basePath === '' && path === '/';
            // Проверяем, является ли путь index.html в basePath
            const isIndexHtmlPath = path.endsWith('index.html') || path.endsWith('index');

            if (isRootPath || isLocalRoot || isIndexHtmlPath) {
                // Если зашли на корень репозитория или index.html
                langToLoad = 'ru'; // Язык по умолчанию
                 // Формируем дефолтный путь с учетом basePath и /ru/
                const defaultLangPath = basePath === '' ? `/ru/` : `${basePath}/ru/`; // Канонический дефолт
                const fullDefaultLangPath = `${defaultLangPath}${window.location.search}${window.location.hash}`;
                history.replaceState({ lang: langToLoad }, document.title, fullDefaultLangPath);
                performHistoryUpdateInChangeLanguage = false;
            }
             // Если путь совсем другой, langToLoad останется 'ru', и changeLanguage сделает pushState, если performHistoryUpdateInChangeLanguage остался true
        }
    }

    currentLang = langToLoad;
    await changeLanguage(currentLang, performHistoryUpdateInChangeLanguage);
}


async function fetchTranslations(lang) {
    try {
        // Используем basePath для формирования пути к translations
        // Это должно работать как локально (basePath=''), так и на GitHub Pages (basePath='/MY_CV')
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            console.error(`Failed to load ${basePath}/translations/${lang}.json. Status: ${response.status}`);
            let fallbackLang = 'ru';
            if (lang === fallbackLang) {
                 console.error("Critical error: Default language 'ru' also failed to load.");
                 return {}; // Возвращаем пустой объект, если даже дефолт не загрузился
            }
            console.warn(`Falling back to '${fallbackLang}' from language '${lang}'`);
            currentLang = fallbackLang; // Обновляем currentLang перед рекурсивным вызовом
            return await fetchTranslations(fallbackLang); // Рекурсивный вызов
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading translations for ${basePath}/translations/${lang}:`, error);
        let fallbackLang = 'ru';
        if (lang === fallbackLang) {
             console.error("Critical error: Default language 'ru' also failed to load on error.");
             return {}; // Возвращаем пустой объект, если даже дефолт не загрузился
        }
        console.warn(`Falling back to '${fallbackLang}' from language '${lang}' due to error.`);
        currentLang = fallbackLang; // Обновляем currentLang перед рекурсивным вызовом
        return await fetchTranslations(fallbackLang); // Рекурсивный вызов
    }
}

function updateMetaTagsForSEO() {
    // Логика для локальной разработки: удаляем SEO теги
    if (isLocal) {
        const head = document.head;
        head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());
        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) ogUrlMeta.content = window.location.href; // Или просто текущий локальный URL
         return;
    }

    // Логика для продакшена (isLocal === false), использует productionBasePath
    const head = document.head;
    // Сначала удаляем существующие теги, чтобы избежать дублирования при смене языка
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin;
    // Формируем канонические URL'ы для продакшена в формате basePath/lang/
    const ruUrl = `${siteOrigin}${productionBasePath}/ru/`;
    const enUrl = `${siteOrigin}${productionBasePath}/en/`;
    const defaultUrl = ruUrl; // Русская версия как x-default

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
         // og:url должен указывать на канонический URL текущей страницы
         ogUrlMeta.content = `${siteOrigin}${productionBasePath}/${currentLang}/`;
    }
}


function applyTranslations() {
    try {
        const translationsAvailable = Object.keys(loadedTranslations).length > 0;

        // Устанавливаем атрибут lang и title
        document.documentElement.lang = translationsAvailable ? (loadedTranslations['lang-code'] || currentLang) : currentLang;
        document.title = translationsAvailable ? (loadedTranslations['page-title'] || 'CV Vladlen Kuznetsov') : 'CV Vladlen Kuznetsov';

        // Обновляем мета-теги для SEO и Open Graph (кроме og:url, который обновляется в updateMetaTagsForSEO)
        if (translationsAvailable) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.content = loadedTranslations['meta-description'] || '';
            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords) metaKeywords.content = loadedTranslations['meta-keywords'] || '';
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.content = loadedTranslations['og-title'] || '';
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.content = loadedTranslations['og-description'] || '';
        }

        // Обновляем alt текст для фото профиля
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto) profilePhoto.alt = translationsAvailable ? (loadedTranslations['profile-photo-alt'] || 'Profile Photo') : 'Profile Photo';

        // Обновляем текст для всех элементов с data-lang-key
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
             // Проверяем, что перевод существует и не равен undefined (пустая строка - валидный перевод)
            if (translationsAvailable && loadedTranslations[key] !== undefined) {
                 element.innerHTML = loadedTranslations[key];
            } else if (!translationsAvailable) {
                 // Если переводы не загружены, оставляем дефолт из HTML.
            }
        });

        // Обновляем текст кнопок
        if (toggleButton) {
             toggleButton.textContent = translationsAvailable ? (loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU')) : (currentLang === 'ru' ? 'EN' : 'RU');
        }
        const downloadPdfButton = document.getElementById('download-pdf-button');
         if (downloadPdfButton) {
            downloadPdfButton.textContent = translationsAvailable ? (loadedTranslations['download-pdf-button-text'] || (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF')) : (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF');
        }
    } finally {
        // Убираем класс загрузки после попытки применения переводов
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang, needsHistoryUpdate = true) {
    // Добавляем класс загрузки
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    // Устанавливаем новый язык
    currentLang = lang;
    // Загружаем переводы. currentLang может измениться внутри fetchTranslations при откате!
    loadedTranslations = await fetchTranslations(currentLang); // currentLang тут - это тот, который мы пытались загрузить

    // Применяем переводы (использует актуальный currentLang из loadedTranslations или дефолт)
    applyTranslations();
    // Обновляем SEO мета-теги
    updateMetaTagsForSEO();

    // Обновляем историю браузера, если необходимо
    if (needsHistoryUpdate) {
        // Формируем новый канонический путь с учетом basePath и актуального currentLang
        const newPath = basePath === '' ? `/${currentLang}/` : `${basePath}/${currentLang}/`; // Путь всегда должен заканчиваться на слеш для консистентности
        const pageTitleForHistory = document.title;
        // Добавляем текущие search и hash к новому пути
        const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

        // Сравниваем текущий путь с целевым каноническим
        let currentPathForComparison = window.location.pathname;
        // Приводим текущий путь к каноническому виду (с конечным слешем), если его нет
        if (!currentPathForComparison.endsWith('/')) currentPathForComparison += '/';

        const expectedPathForComparison = newPath;

        // Если текущий pathname отличается от целевого канонического, делаем pushState
        if (currentPathForComparison !== expectedPathForComparison) {
            history.pushState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
        } else if (window.location.href !== fullNewPath) {
             // Если pathname совпадает, но есть разница в search, hash или title, делаем replaceState
            history.replaceState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
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

// ВОССТАНОВЛЕНА функция updateWorkDuration из вашего первого файла
function updateWorkDuration() {
    const element = document.getElementById('gammister-lead-duration');
    if (!element) {
        console.error("Element with ID 'gammister-lead-duration' not found.");
        return;
    }

    // Дефолтные строки, если переводы еще не загружены или ключ отсутствует
    let baseStringFullDefault = currentLang === 'ru' ? "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)" : "May 2024 – Present | Gammister | UAE (Remote)";
    let presentTextDefault = currentLang === 'ru' ? 'настоящее время' : 'Present';
    let justStartedDefault = currentLang === 'ru' ? 'только началось' : 'just started';

    let yearAbbrDefault = currentLang === 'ru' ? 'г.' : 'yr';
    let monthAbbrDefault = currentLang === 'ru' ? 'мес.' : 'mos';
    let dayAbbrDefault = currentLang === 'ru' ? 'дн.' : 'days';
    let hourAbbrDefault = currentLang === 'ru' ? 'ч.' : 'hrs';
    let minuteAbbrDefault = currentLang === 'ru' ? 'мин.' : 'min';
    let secondAbbrDefault = currentLang === 'ru' ? 'сек.' : 'sec';

    const translationsAvailable = Object.keys(loadedTranslations).length > 0;

    const baseStringFull = (translationsAvailable && loadedTranslations['qa-lead-duration-full']) || baseStringFullDefault;
    const presentTextString = (translationsAvailable && loadedTranslations['present-time-text']) || presentTextDefault;

    if (!baseStringFull.includes(presentTextString)) {
        element.innerHTML = baseStringFull; // Если нет "настоящее время", просто показываем строку
        console.warn(`updateWorkDuration: Present marker "${presentTextString}" not found in base string "${baseStringFull}". Displaying base string as is.`);
        return;
    }

    const startDate = new Date('2024-05-25T00:00:00');
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    if (diffInMs < 0) {
         element.innerHTML = baseStringFull;
         // console.log("updateWorkDuration: Start date is in the future.");
         return;
    }

    const totalSeconds = Math.floor(diffInMs / 1000);
    let seconds = totalSeconds % 60;
    let totalMinutes = Math.floor(totalSeconds / 60);
    let minutes = totalMinutes % 60;
    let totalHours = Math.floor(totalMinutes / 60);
    let hours = totalHours % 24;

    let years = 0;
    let months = 0;
    let tempDaysCalc = Math.floor(totalHours / 24); // Общее количество полных дней

    // Логика расчета лет и месяцев (использующая 365.25 и 30.4375)
    if (tempDaysCalc >= 365.25) {
        years = Math.floor(tempDaysCalc / 365.25);
        tempDaysCalc -= Math.floor(years * 365.25);
    }
    if (tempDaysCalc >= 30.4375) {
        months = Math.floor(tempDaysCalc / 30.4375);
        tempDaysCalc -= Math.floor(months * 30.4375);
    }
    let days = Math.floor(tempDaysCalc); // Оставшиеся дни

     // console.log("updateWorkDuration Debug: Calculated units (old logic):", { years, months, days, hours, minutes, seconds });


    let durationString = '';
    // Получаем сокращения единиц времени (переведенные или дефолтные)
    const yearAbbr = (translationsAvailable && loadedTranslations['year-abbr']) || yearAbbrDefault;
    const monthAbbr = (translationsAvailable && loadedTranslations['month-abbr']) || monthAbbrDefault;
    const dayAbbr = (translationsAvailable && loadedTranslations['day-abbr']) || dayAbbrDefault;
    const hourAbbr = (translationsAvailable && loadedTranslations['hour-abbr']) || hourAbbrDefault;
    const minuteAbbr = (translationsAvailable && loadedTranslations['minute-abbr']) || minuteAbbrDefault;
    const secondAbbr = (translationsAvailable && loadedTranslations['second-abbr']) || secondAbbrDefault;

    if (years > 0) durationString += `${years} ${yearAbbr} `;
    if (years > 0 || months > 0 ) durationString += `${months} ${monthAbbr} `;
    if (years > 0 || months > 0 || days > 0) durationString += `${days} ${dayAbbr} `;
    // И так далее для часов, минут, секунд
    if (years > 0 || months > 0 || days > 0 || hours > 0) durationString += `${hours} ${hourAbbr} `;
    if (years > 0 || months > 0 || days > 0 || hours > 0 || minutes > 0) durationString += `${minutes} ${minuteAbbr} `;
     // Всегда добавляем секунды, если totalSeconds > 0, иначе строка будет пустой для длительности < 1 минуты
     if (totalSeconds > 0 || (years === 0 && months === 0 && days === 0 && hours === 0 && minutes === 0)) {
          durationString += `${seconds} ${secondAbbr}`;
     } else if (totalSeconds === 0) {
          // Если totalSeconds == 0, строка уже будет "только началось"
     }

    durationString = durationString.trim();

     // **DEBUG LOG:** Проверяем собранную строку длительности
     // console.log("updateWorkDuration Debug: Formatted duration string (old logic):", durationString);


    const justStartedText = (translationsAvailable && loadedTranslations['duration-just-started']) || justStartedDefault;
    // Если общее время 0 секунд, переопределяем строку на "только началось"
    if (totalSeconds === 0) {
         durationString = justStartedText;
         // console.log("updateWorkDuration: Total seconds is 0, using 'just started'.");
    }

    // Логика вставки строки длительности (через split и join)
    const baseStringParts = baseStringFull.split(' | ');
    if (baseStringParts.length === 3) {
        const timePart = baseStringParts[0];
        let newTimePart = timePart.replace(presentTextString, `${presentTextString} · ${durationString}`);
        element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
         // console.log("updateWorkDuration Debug: Updated with split/join logic (3 parts).");
    } else {
        // Запасной вариант, если строка не имеет 3 частей.
         if (baseStringFull.includes(presentTextString)) {
              const updatedString = baseStringFull.replace(presentTextString, `${presentTextString} · ${durationString}`);
              element.innerHTML = updatedString;
               // console.log("updateWorkDuration Debug: Updated with replace logic (not 3 parts).");
         } else {
             // Этот блок должен быть недостижим, т.к. проверили includes выше.
             element.innerHTML = baseStringFull;
              console.error("updateWorkDuration: Failed to insert duration string, present marker not found in base string after split check.");
         }

    }
}


// Обработчик события полной загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем приложение (определение языка, загрузка переводов, обновление UI)
    await initializeApp();

    // Запускаем первое обновление таймера сразу после инициализации
    updateWorkDuration();
    // Настраиваем интервал для ежесекундного обновления таймера
    setInterval(updateWorkDuration, 1000);

    // Находим кнопку скачивания PDF
    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        // Добавляем обработчик клика
        downloadPdfButton.addEventListener('click', (event) => {
            // Предотвращаем стандартное действие ссылки (переход)
            event.preventDefault();

            // Определяем имя файла PDF в зависимости от текущего языка
            let fileName = (currentLang === 'ru') ? 'Резюме - Кузнецов Владлен.pdf' : 'Resume - Kuznetsov Vladlen.pdf';

            // Формируем путь к файлу PDF с учетом basePath
            // Убеждаемся, что путь корректен (начинается со слеша, нет двойных слешей)
            const filePath = `${basePath}${basePath.endsWith('/') ? '' : '/' }pdf/${fileName}`.replace(/^\/\濛/, '/');

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
    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        let isExternal = true;
        try {
            // Пытаемся определить hostname ссылки
            const linkHostname = new URL(link.href).hostname;
            // Определяем hostname текущей страницы (игнорируем порт для локальной разработки)
            const currentHostname = window.location.hostname;
            // Ссылка не является внешней, если hostname совпадает с текущим или является локальным адресом
             if (linkHostname === currentHostname || linkHostname === 'localhost' || linkHostname === '127.0.0.1') isExternal = false;
        } catch (e) {
            // Если парсинг URL не удался, считаем ссылку внутренней или не обрабатываем ее как внешнюю
            isExternal = false;
        }

        // Если ссылка является mailto или внешней (HTTP/HTTPS на другой домен)
        if (link.protocol === "mailto:" || isExternal) {
            // Проверяем, не является ли ссылка "ссылкой заголовка" в разделе опыта (там может быть специальная обработка или стили)
            const isTitleLink = link.classList.contains('article-title-link') || (link.parentElement && link.parentElement.classList.contains('timeline-content') && link.querySelector('h4'));
            // Для большинства внешних/mailto ссылок добавляем target="_blank" и rel="noopener noreferrer"
            if (!isTitleLink) {
                 link.setAttribute('target', '_blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) {
                 // Для title ссылок, если они все-таки внешние, добавляем только rel="noopener noreferrer"
                 link.setAttribute('rel', 'noopener noreferrer');
            }
             // Важно: rel="noopener noreferrer" рекомендуется добавлять для всех target="_blank" ссылок для безопасности.
             if (link.getAttribute('target') === '_blank') {
                 link.setAttribute('rel', 'noopener noreferrer');
             }
        }
    });

});
