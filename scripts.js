// --- НАЧАЛО ФАЙЛА scripts.js ---

// Самовызывающаяся функция для обработки перенаправления с 404.html
(function () {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== '' && redirect !== '/') {
    var l = window.location;
    var newRedirectPath = redirect.startsWith('/') ? redirect.substring(1) : redirect;
    // Убедимся, что basePath заканчивается на слеш, если он не корень
    var adjustedBasePath = (l.pathname.endsWith('/') ? l.pathname : l.pathname.substring(0, l.pathname.lastIndexOf('/') + 1));
    // Если redirect содержит параметры или хеш, они будут добавлены.
    // Для простого пути типа "en", newFullPath будет basePath + "en"
    var newFullPath = adjustedBasePath + newRedirectPath;

    // Проверка, если basePath сам по себе уже /MY_CV/en/ или /MY_CV/ru/
    // и redirect это пустая строка (случай прямого захода на /MY_CV/en/ который вызвал 404)
    // В этом случае newFullPath уже должен быть правильным.

    // Если же l.pathname был /MY_CV/ (после редиректа с 404.html на homePath)
    // и redirect был 'en' или 'ru', то newFullPath будет /MY_CV/en или /MY_CV/ru
    // Нам нужно добавить слеш, если его нет и это языковая директория
    if (newRedirectPath === 'en' || newRedirectPath === 'ru') {
        if (!newFullPath.endsWith('/')) {
            newFullPath += '/';
        }
    }

    history.replaceState(null, '', newFullPath);
  }
})();


let currentLang = 'ru';
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');
const basePath = '/MY_CV';

async function fetchTranslations(lang) {
    try {
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            console.error(`Не удалось загрузить ${lang}.json. Статус: ${response.status}`);
            if (lang !== 'ru') {
                console.warn(`Выполняется откат на 'ru' с языка '${lang}'`);
                currentLang = 'ru';
                return await fetchTranslations('ru');
            }
            return {};
        }
        currentLang = lang;
        return await response.json();
    } catch (error) {
        console.error(`Ошибка при загрузке переводов для ${lang}:`, error);
        if (lang !== 'ru') {
            console.warn(`Выполняется откат на 'ru' с языка '${lang}' из-за ошибки.`);
            currentLang = 'ru';
            return await fetchTranslations('ru');
        }
        return {};
    }
}

function updateMetaTagsForSEO() {
    const head = document.head;
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin;
    const ruUrl = `${siteOrigin}${basePath}/ru/`; // Слеш добавлен
    const enUrl = `${siteOrigin}${basePath}/en/`; // Слеш добавлен
    const defaultUrl = ruUrl;

    let canonicalUrl = '';
    if (currentLang === 'ru') {
        canonicalUrl = ruUrl;
    } else {
        canonicalUrl = enUrl;
    }

    const canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    canonicalTag.setAttribute('href', canonicalUrl);
    head.appendChild(canonicalTag);

    const hreflangRuTag = document.createElement('link');
    hreflangRuTag.setAttribute('rel', 'alternate');
    hreflangRuTag.setAttribute('hreflang', 'ru');
    hreflangRuTag.setAttribute('href', ruUrl);
    head.appendChild(hreflangRuTag);

    const hreflangEnTag = document.createElement('link');
    hreflangEnTag.setAttribute('rel', 'alternate');
    hreflangEnTag.setAttribute('hreflang', 'en');
    hreflangEnTag.setAttribute('href', enUrl);
    head.appendChild(hreflangEnTag);

    const hreflangXDefaultTag = document.createElement('link');
    hreflangXDefaultTag.setAttribute('rel', 'alternate');
    hreflangXDefaultTag.setAttribute('hreflang', 'x-default');
    hreflangXDefaultTag.setAttribute('href', defaultUrl);
    head.appendChild(hreflangXDefaultTag);
}

function applyTranslations() {
    try {
        if (Object.keys(loadedTranslations).length === 0) {
            console.warn("Переводы не загружены или пусты. Отображение с настройками по умолчанию.");
            document.title = document.title || 'CV Vladlen Kuznetsov';
            if (toggleButton) {
                const defaultButtonText = currentLang === 'ru' ? 'EN' : 'RU';
                toggleButton.textContent = loadedTranslations['lang-toggle-text'] || defaultButtonText;
            }
            const downloadPdfButton = document.getElementById('download-pdf-button');
            if (downloadPdfButton) {
                 const defaultPdfButtonText = currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF';
                 downloadPdfButton.textContent = loadedTranslations['download-pdf-button-text'] || defaultPdfButtonText;
            }
            updateWorkDuration();
            const ogUrlMeta = document.querySelector('meta[property="og:url"]');
            if (ogUrlMeta) {
                 ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}/`; // Слеш добавлен
            }
            return;
        }

        document.documentElement.lang = loadedTranslations['lang-code'] || currentLang;
        document.title = loadedTranslations['page-title'] || 'CV Vladlen Kuznetsov';

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = loadedTranslations['meta-description'] || '';
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metaKeywords.content = loadedTranslations['meta-keywords'] || '';
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = loadedTranslations['og-title'] || '';
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = loadedTranslations['og-description'] || '';

        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) {
            ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}/`; // Слеш добавлен
        }

        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto) profilePhoto.alt = loadedTranslations['profile-photo-alt'] || 'Profile Photo';

        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (loadedTranslations[key]) {
                if (element.tagName === 'BUTTON' && (element.id === 'language-toggle' || element.id === 'download-pdf-button')) {
                    element.textContent = loadedTranslations[key];
                } else {
                    element.innerHTML = loadedTranslations[key];
                }
            }
        });

        if (toggleButton) {
            toggleButton.textContent = loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU');
        }
        const downloadPdfButton = document.getElementById('download-pdf-button');
        if (downloadPdfButton && loadedTranslations['download-pdf-button-text']) {
            downloadPdfButton.textContent = loadedTranslations['download-pdf-button-text'];
        }

        updateWorkDuration();
    } finally {
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang) {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    loadedTranslations = await fetchTranslations(lang);
    applyTranslations();
    updateMetaTagsForSEO();

    const newPath = `${basePath}/${currentLang}/`; // Слеш добавлен
    const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

    const currentPathLangSegment = window.location.pathname.substring(basePath.length + 1).split('/')[0];
    const pageTitleForHistory = loadedTranslations['page-title'] || document.title;

    // Сверяем текущий URL (window.location.pathname) с тем, что должен быть (newPath)
    // Убедимся, что и тот и другой заканчиваются на слеш для корректного сравнения
    const currentPathForComparison = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';

    if (currentPathForComparison !== newPath) {
         history.pushState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
    } else {
        history.replaceState({ lang: currentLang }, pageTitleForHistory, window.location.href);
    }
}

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang);
    });
}

function updateWorkDuration() {
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        const element = document.getElementById('gammister-lead-duration');
        if(element && element.getAttribute('data-lang-key') === 'qa-lead-duration-full' && !element.textContent.includes('·')) {
            if (loadedTranslations['qa-lead-duration-full']) {
                 element.innerHTML = loadedTranslations['qa-lead-duration-full'];
            } else if (currentLang === 'ru') {
                element.innerHTML = "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)";
            } else {
                element.innerHTML = "May 2024 – Present | Gammister | UAE (Remote)";
            }
        }
        if (!loadedTranslations['qa-lead-duration-full']) return;
    }

    const startDate = new Date('2024-05-25T00:00:00');
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    const element = document.getElementById('gammister-lead-duration');

    if (diffInMs < 0) {
         if(element && loadedTranslations['qa-lead-duration-full']) element.innerHTML = loadedTranslations['qa-lead-duration-full'];
         return;
    }

    const totalSeconds = Math.floor(diffInMs / 1000);
    let seconds = totalSeconds % 60;
    let totalMinutes = Math.floor(totalSeconds / 60);
    let minutes = totalMinutes % 60;
    let totalHours = Math.floor(totalMinutes / 60);
    let hours = totalHours % 24;
    let totalDays = Math.floor(totalHours / 24);

    let years = 0;
    let months = 0;
    let tempDays = totalDays;

    if (tempDays >= 365.25) {
        years = Math.floor(tempDays / 365.25);
        tempDays -= Math.floor(years * 365.25);
    }
    if (tempDays >= 30.4375) {
        months = Math.floor(tempDays / 30.4375);
        tempDays -= Math.floor(months * 30.4375);
    }
    let days = Math.floor(tempDays);

    let durationString = '';
    const yearAbbr = loadedTranslations['year-abbr'] || (currentLang === 'ru' ? 'г.' : 'yr');
    const monthAbbr = loadedTranslations['month-abbr'] || (currentLang === 'ru' ? 'мес.' : 'mos');
    const dayAbbr = loadedTranslations['day-abbr'] || (currentLang === 'ru' ? 'дн.' : 'days');
    const hourAbbr = loadedTranslations['hour-abbr'] || (currentLang === 'ru' ? 'ч.' : 'hrs');
    const minuteAbbr = loadedTranslations['minute-abbr'] || (currentLang === 'ru' ? 'мин.' : 'min');
    const secondAbbr = loadedTranslations['second-abbr'] || (currentLang === 'ru' ? 'сек.' : 'sec');

    if (years > 0) durationString += `${years} ${yearAbbr} `;
    if (months > 0 || years > 0) durationString += `${months} ${monthAbbr} `;
    if (days > 0 || months > 0 || years > 0) durationString += `${days} ${dayAbbr} `;
    if (hours > 0 || days > 0 || months > 0 || years > 0) durationString += `${hours} ${hourAbbr} `;
    if (minutes > 0 || hours > 0 || days > 0 || months > 0 || years > 0) durationString += `${minutes} ${minuteAbbr} `;
    durationString += `${seconds} ${secondAbbr}`;
    durationString = durationString.trim();

    if (totalSeconds === 0 && Object.keys(loadedTranslations).length > 0) {
         durationString = loadedTranslations['duration-just-started'] || (currentLang === 'ru' ? 'только началось' : 'just started');
    }

    if (element && loadedTranslations['qa-lead-duration-full']) {
        const baseStringParts = loadedTranslations['qa-lead-duration-full'].split(' | ');
        if (baseStringParts.length === 3) {
            const timePart = baseStringParts[0];
            let newTimePart = timePart;
            const presentText = loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present');
            if (timePart.includes(presentText)) {
                 newTimePart = timePart.replace(presentText, `${presentText} · ${durationString}`);
            } else {
                newTimePart = `${timePart} · ${durationString}`;
            }
            element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
        } else {
            const presentText = loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present');
            element.innerHTML = `${loadedTranslations['qa-lead-duration-full'].replace(presentText, `${presentText} · ${durationString}`)}`;
        }
    } else if (element && !loadedTranslations['qa-lead-duration-full'] && Object.keys(loadedTranslations).length > 0) {
        element.innerHTML = durationString;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru';
    const path = window.location.pathname;

    // basePath + '/' + lang_code + '/'
    const langPathRegex = new RegExp(`^${basePath}/(ru|en)/?$`); // ? делает последний слеш опциональным для матчинга
    const match = path.match(langPathRegex);

    if (match && match[1]) { // match[1] будет 'ru' или 'en'
        langToLoad = match[1];
    } else if (path === basePath || path === basePath + '/') {
        // Если зашли на /MY_CV/ или /MY_CV, устанавливаем язык по умолчанию и редиректим
        langToLoad = 'ru'; // Язык по умолчанию
    }
    // Если другой путь, который не матчится, langToLoad останется 'ru' (или что там по умолчанию)
    // и логика ниже должна корректно обработать редирект на /ru/ или /en/

    currentLang = langToLoad;

    // Всегда используем URL со слешем на конце для языковых версий
    const expectedPath = `${basePath}/${currentLang}/`;
    const pageTitleForHistory = document.title;

    // Сравниваем текущий путь (приведенный к виду со слешем) с ожидаемым
    const currentPathForComparison = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';

    if (currentPathForComparison !== expectedPath) {
        // Если зашли на /MY_CV или /MY_CV/en (без слеша), или другой некорректный путь,
        // делаем replaceState на корректный путь со слешем.
        history.replaceState({ lang: currentLang }, pageTitleForHistory, `${expectedPath}${window.location.search}${window.location.hash}`);
    }

    await changeLanguage(currentLang);

    setInterval(updateWorkDuration, 1000);

    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', () => {
            let fileName = '';
            if (currentLang === 'ru') {
                fileName = 'Резюме - Кузнецов Владлен.pdf';
            } else {
                fileName = 'Resume - Kuznetsov Vladlen.pdf';
            }
            const filePath = `${basePath}/pdf/${fileName}`;
            const link = document.createElement('a');
            link.href = filePath;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        let isExternal = true;
        try {
            const linkHostname = new URL(link.href).hostname;
            if (linkHostname === window.location.hostname) {
                isExternal = false;
            }
        } catch (e) {
            // Игнорируем
        }

        if (link.protocol === "mailto:" || isExternal) {
            const isTitleLink = link.classList.contains('article-title-link') ||
                                (link.parentElement && link.parentElement.classList.contains('timeline-content') && link.querySelector('h4'));

            if (!isTitleLink) {
                 link.setAttribute('target', 'blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
});
// --- КОНЕЦ ФАЙЛА scripts.js ---