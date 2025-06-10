let currentLang = 'ru';
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');
const basePath = '/MY_CV';

async function initializeApp() {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru'; // Язык по умолчанию
    let performHistoryUpdateInChangeLanguage = true;

    const urlParams = new URLSearchParams(window.location.search);
    const spaPathFromParam = urlParams.get('spa_path');

    if (spaPathFromParam) {
        urlParams.delete('spa_path'); // Удаляем параметр spa_path
        let cleanSearch = urlParams.toString();
        if (cleanSearch) cleanSearch = '?' + cleanSearch;

        // spaPathFromParam может быть "en/" или "ru" и т.д.
        let langSegment = spaPathFromParam.replace(/\/$/, "").split('/')[0]; // Убираем конечный / перед split
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment;
        }

        const newHistoryPath = `${basePath}/${langToLoad}/${cleanSearch}${window.location.hash}`;
        history.replaceState({ lang: langToLoad }, document.title, newHistoryPath); // Обновляем URL без spa_path
        performHistoryUpdateInChangeLanguage = false; // URL уже установлен, не нужен pushState в changeLanguage
    } else {
        // Логика определения языка из текущего пути, если spa_path не было
        const path = window.location.pathname;
        const langPathRegex = new RegExp(`^${basePath}/(ru|en)/?$`);
        const match = path.match(langPathRegex);

        if (match && match[1]) {
            langToLoad = match[1];
            const expectedPathWithSlash = `${basePath}/${langToLoad}/`;
            if (window.location.pathname !== expectedPathWithSlash) { // Если URL не канонический (например, без слеша)
                history.replaceState({ lang: langToLoad }, document.title, `${expectedPathWithSlash}${window.location.search}${window.location.hash}`);
            }
            performHistoryUpdateInChangeLanguage = false; // URL уже (или только что стал) каноническим
        } else if (path === basePath || path === basePath + '/' || path.endsWith('index.html') || path.endsWith('index')) {
            // Если зашли на корень репозитория или index.html
            langToLoad = 'ru'; // Язык по умолчанию
            const defaultLangPath = `${basePath}/${langToLoad}/${window.location.search}${window.location.hash}`;
            history.replaceState({ lang: langToLoad }, document.title, defaultLangPath);
            performHistoryUpdateInChangeLanguage = false;
        }
        // Если путь совсем другой, langToLoad останется 'ru', и changeLanguage сделает pushState, если performHistoryUpdateInChangeLanguage остался true
    }

    currentLang = langToLoad;
    await changeLanguage(currentLang, performHistoryUpdateInChangeLanguage);
}


async function fetchTranslations(lang) {
    try {
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            console.error(`Failed to load ${lang}.json. Status: ${response.status}`);
            let fallbackLang = 'ru';
            if (lang === fallbackLang) {
                 console.error("Critical error: Default language 'ru' also failed to load.");
                 return {};
            }
            console.warn(`Falling back to '${fallbackLang}' from language '${lang}'`);
            currentLang = fallbackLang; // Обновляем currentLang немедленно при откате
            return await fetchTranslations(fallbackLang);
        }
        // currentLang уже должен быть установлен правильно перед вызовом fetchTranslations
        return await response.json();
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        let fallbackLang = 'ru';
        if (lang === fallbackLang) {
             console.error("Critical error: Default language 'ru' also failed to load on error.");
             return {};
        }
        console.warn(`Falling back to '${fallbackLang}' from language '${lang}' due to error.`);
        currentLang = fallbackLang; // Обновляем currentLang немедленно при откате
        return await fetchTranslations(fallbackLang);
    }
}

function updateMetaTagsForSEO() {
    const head = document.head;
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin;
    // Используем URL с параметром spa_path
    const ruUrl = `${siteOrigin}${basePath}/?spa_path=ru/`;
    const enUrl = `${siteOrigin}${basePath}/?spa_path=en/`;
    const defaultUrl = ruUrl; // Русская версия как x-default

    let canonicalUrl = (currentLang === 'ru') ? ruUrl : enUrl;

    const canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    canonicalTag.setAttribute('href', canonicalUrl);
    head.appendChild(canonicalTag);

    ['ru', 'en', 'x-default'].forEach(langCode => {
        const tag = document.createElement('link');
        tag.setAttribute('rel', 'alternate');
        tag.setAttribute('hreflang', langCode);
        tag.setAttribute('href', langCode === 'en' ? enUrl : (langCode === 'ru' ? ruUrl : defaultUrl) );
        head.appendChild(tag);
    });
}

function applyTranslations() {
    try {
        const translationsAvailable = Object.keys(loadedTranslations).length > 0;

        document.documentElement.lang = translationsAvailable ? (loadedTranslations['lang-code'] || currentLang) : currentLang;
        document.title = translationsAvailable ? (loadedTranslations['page-title'] || 'CV Vladlen Kuznetsov') : 'CV Vladlen Kuznetsov';

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

        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) {
            ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}/`;
        }

        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto) profilePhoto.alt = translationsAvailable ? (loadedTranslations['profile-photo-alt'] || 'Profile Photo') : 'Profile Photo';

        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (translationsAvailable && loadedTranslations[key] !== undefined) { // Проверяем !== undefined, чтобы пустые строки тоже применялись
                 element.innerHTML = loadedTranslations[key];
            } else if (!translationsAvailable && element.id !== 'language-toggle' && element.id !== 'download-pdf-button' && element.id !== 'gammister-lead-duration') {
                 // Если переводов нет, можно очистить или оставить дефолт. Оставляем дефолт.
            }
        });

        if (toggleButton) {
             toggleButton.textContent = translationsAvailable ? (loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU')) : (currentLang === 'ru' ? 'EN' : 'RU');
        }
        const downloadPdfButton = document.getElementById('download-pdf-button');
         if (downloadPdfButton) {
            downloadPdfButton.textContent = translationsAvailable ? (loadedTranslations['download-pdf-button-text'] || (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF')) : (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF');
        }
    } finally {
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang, needsHistoryUpdate = true) {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    currentLang = lang;
    loadedTranslations = await fetchTranslations(lang);
    // currentLang мог измениться внутри fetchTranslations при откате, поэтому используем его актуальное значение

    applyTranslations();
    updateMetaTagsForSEO();

    if (needsHistoryUpdate) {
        const newPath = `${basePath}/${currentLang}/`; // Используем currentLang, который мог быть обновлен
        const pageTitleForHistory = document.title;
        // search и hash уже должны быть "чистыми" после initializeApp, или их нет
        const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

        const currentPathForComparison = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
        if (currentPathForComparison !== newPath) {
            history.pushState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
        } else if (window.location.href !== fullNewPath) {
            // Если путь тот же, но search/hash изменились (маловероятно здесь) или просто обновить title
            history.replaceState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
        }
    }
    updateWorkDuration();
}


if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang, true);
    });
}

// Используем версию updateWorkDuration из вашего последнего рабочего скрипта
function updateWorkDuration() {
    const element = document.getElementById('gammister-lead-duration');
    if (!element) return;

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
        return;
    }

    const startDate = new Date('2024-05-25T00:00:00');
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    if (diffInMs < 0) {
         element.innerHTML = baseStringFull;
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

    let durationString = '';
    const yearAbbr = (translationsAvailable && loadedTranslations['year-abbr']) || yearAbbrDefault;
    const monthAbbr = (translationsAvailable && loadedTranslations['month-abbr']) || monthAbbrDefault;
    const dayAbbr = (translationsAvailable && loadedTranslations['day-abbr']) || dayAbbrDefault;
    const hourAbbr = (translationsAvailable && loadedTranslations['hour-abbr']) || hourAbbrDefault;
    const minuteAbbr = (translationsAvailable && loadedTranslations['minute-abbr']) || minuteAbbrDefault;
    const secondAbbr = (translationsAvailable && loadedTranslations['second-abbr']) || secondAbbrDefault;

    if (years > 0) durationString += `${years} ${yearAbbr} `;
    if (years > 0 || months > 0 ) durationString += `${months} ${monthAbbr} `;
    if (years > 0 || months > 0 || days > 0) durationString += `${days} ${dayAbbr} `;
    if (years > 0 || months > 0 || days > 0 || hours > 0) durationString += `${hours} ${hourAbbr} `;
    if (years > 0 || months > 0 || days > 0 || hours > 0 || minutes > 0) durationString += `${minutes} ${minuteAbbr} `;
    durationString += `${seconds} ${secondAbbr}`;
    durationString = durationString.trim();

    const justStartedText = (translationsAvailable && loadedTranslations['duration-just-started']) || justStartedDefault;
    if (totalSeconds === 0) {
         durationString = justStartedText;
    }

    const baseStringParts = baseStringFull.split(' | ');
    if (baseStringParts.length === 3) {
        const timePart = baseStringParts[0];
        let newTimePart = timePart.replace(presentTextString, `${presentTextString} · ${durationString}`);
        element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
    } else {
        element.innerHTML = baseStringFull.replace(presentTextString, `${presentTextString} · ${durationString}`);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();

    updateWorkDuration();
    setInterval(updateWorkDuration, 1000);

    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', () => {
            let fileName = (currentLang === 'ru') ? 'Резюме - Кузнецов Владлен.pdf' : 'Resume - Kuznetsov Vladlen.pdf';
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
            if (linkHostname === window.location.hostname) isExternal = false;
        } catch (e) {}

        if (link.protocol === "mailto:" || isExternal) {
            const isTitleLink = link.classList.contains('article-title-link') || (link.parentElement && link.parentElement.classList.contains('timeline-content') && link.querySelector('h4'));
            if (!isTitleLink) {
                 link.setAttribute('target', '_blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
});