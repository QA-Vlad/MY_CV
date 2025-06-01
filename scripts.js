// --- НАЧАЛО ФАЙЛА scripts.js ---

let currentLang = 'ru';
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');
const basePath = '/MY_CV';

// --- Начало initializeApp и других функций, которые НЕ меняются в этом исправлении ---
// (Берем их из моего предыдущего ответа, где была введена initializeApp)

async function initializeApp() {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru';
    let performPushStateInChangeLanguage = true;

    const urlParams = new URLSearchParams(window.location.search);
    const spaPathFromParam = urlParams.get('spa_path');

    if (spaPathFromParam) {
        urlParams.delete('spa_path');
        let cleanSearch = urlParams.toString();
        if (cleanSearch) cleanSearch = '?' + cleanSearch;

        let langSegment = spaPathFromParam.replace(/\/$/, "").split('/')[0];
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment;
        }

        const newHistoryPath = `${basePath}/${langToLoad}/${cleanSearch}${window.location.hash}`;
        history.replaceState({ lang: langToLoad }, document.title, newHistoryPath);
        performPushStateInChangeLanguage = false;
    } else {
        const path = window.location.pathname;
        const langPathRegex = new RegExp(`^${basePath}/(ru|en)/?$`);
        const match = path.match(langPathRegex);

        if (match && match[1]) {
            langToLoad = match[1];
            const expectedPathWithSlash = `${basePath}/${langToLoad}/`;
            if (window.location.pathname !== expectedPathWithSlash) {
                history.replaceState({ lang: langToLoad }, document.title, `${expectedPathWithSlash}${window.location.search}${window.location.hash}`);
            }
            performPushStateInChangeLanguage = false;
        } else if (path === basePath || path === basePath + '/' || path.endsWith('/index.html')) {
            langToLoad = 'ru';
            const defaultLangPath = `${basePath}/${langToLoad}/${window.location.search}${window.location.hash}`;
            history.replaceState({ lang: langToLoad }, document.title, defaultLangPath);
            performPushStateInChangeLanguage = false;
        }
    }

    currentLang = langToLoad;
    await changeLanguage(currentLang, performPushStateInChangeLanguage);
}


async function fetchTranslations(lang) {
    try {
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            console.error(`Failed to load ${lang}.json. Status: ${response.status}`);
            let fallbackLang = 'ru';
            if (lang === 'ru') { // Если уже пытались загрузить 'ru' и не вышло
                 console.error("Critical error: Default language 'ru' also failed to load.");
                 return {}; // Возвращаем пустой объект, чтобы избежать бесконечной рекурсии
            }
            console.warn(`Falling back to '${fallbackLang}' from language '${lang}'`);
            // currentLang будет обновлен в changeLanguage
            return await fetchTranslations(fallbackLang);
        }
        // Не меняем currentLang здесь, это делает changeLanguage
        return await response.json();
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        let fallbackLang = 'ru';
        if (lang === 'ru') {
             console.error("Critical error: Default language 'ru' also failed to load on error.");
             return {};
        }
        console.warn(`Falling back to '${fallbackLang}' from language '${lang}' due to error.`);
        return await fetchTranslations(fallbackLang);
    }
}

function updateMetaTagsForSEO() {
    const head = document.head;
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin;
    const ruUrl = `${siteOrigin}${basePath}/ru/`;
    const enUrl = `${siteOrigin}${basePath}/en/`;
    const defaultUrl = ruUrl;

    let canonicalUrl = (currentLang === 'ru') ? ruUrl : enUrl;

    const canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    canonicalTag.setAttribute('href', canonicalUrl);
    head.appendChild(canonicalTag);

    ['ru', 'en', 'x-default'].forEach(langCode => { // изменил lang на langCode во избежание путаницы с currentLang
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
            // Обновляем, только если ключ есть в переводах ИЛИ это не кнопка (для кнопок отдельная логика ниже)
            if (translationsAvailable && loadedTranslations[key]) {
                 element.innerHTML = loadedTranslations[key];
            } else if (!translationsAvailable && element.id !== 'language-toggle' && element.id !== 'download-pdf-button' && !element.closest('#gammister-lead-duration')) {
                // Если переводов нет, можно либо очистить, либо оставить дефолтный HTML.
                // Пока оставим как есть, чтобы не стирать то, что уже есть в HTML.
            }
        });

        if (toggleButton) {
             toggleButton.textContent = translationsAvailable ? (loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU')) : (currentLang === 'ru' ? 'EN' : 'RU');
        }
        const downloadPdfButton = document.getElementById('download-pdf-button');
         if (downloadPdfButton) {
            downloadPdfButton.textContent = translationsAvailable ? (loadedTranslations['download-pdf-button-text'] || (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF')) : (currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF');
        }
        // updateWorkDuration будет вызван отдельно после applyTranslations
    } finally {
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang, needsHistoryUpdate = true) {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    currentLang = lang;

    let newTranslations = await fetchTranslations(lang); // fetchTranslations может изменить currentLang при ошибке
    // Убедимся, что currentLang актуален ПОСЛЕ fetchTranslations, если был откат
    if (Object.keys(newTranslations).length === 0 && lang !== 'ru' && currentLang !== 'ru') {
        // Это условие маловероятно, если fetchTranslations корректно откатывает currentLang сам,
        // но на всякий случай.
        currentLang = 'ru';
    }
    loadedTranslations = newTranslations;

    applyTranslations();
    updateMetaTagsForSEO();

    if (needsHistoryUpdate) {
        const newPath = `${basePath}/${currentLang}/`;
        const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;
        const pageTitleForHistory = document.title;

        const currentPathForComparison = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
        if (currentPathForComparison !== newPath || window.location.search + window.location.hash !== "" ) {
            history.pushState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
        } else {
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
// --- Конец initializeApp и других функций ---

// --- НАЧАЛО ВОССТАНОВЛЕННОЙ updateWorkDuration ---
// Эта функция взята из вашего предоставленного кода, который работал с sessionStorage,
// и адаптирована для работы с loadedTranslations и currentLang
function updateWorkDuration() {
    // Проверяем, есть ли ключ в переводах, если нет, то используем дефолтную строку
    // Это условие было в самом начале вашей версии функции
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        const element = document.getElementById('gammister-lead-duration');
        if(element && element.getAttribute('data-lang-key') === 'qa-lead-duration-full') { // && !element.textContent.includes('·') - убрал, т.к. мы всегда будем обновлять
            // Это условие для самого первого рендера, когда translations еще могут быть не загружены
            // или если ключ отсутствует
            let defaultText = "";
            if (currentLang === 'ru') {
                defaultText = "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)";
            } else { // en
                defaultText = "May 2024 – Present | Gammister | UAE (Remote)";
            }
            // Если ключ есть в переводах, но он пуст, то тоже используем дефолт
            element.innerHTML = (loadedTranslations && loadedTranslations['qa-lead-duration-full']) ? loadedTranslations['qa-lead-duration-full'] : defaultText;
        }
        // Если ключ 'qa-lead-duration-full' отсутствует в loadedTranslations,
        // то дальнейший код не будет корректно работать, так как baseStringParts будет неверным.
        // Однако, если он есть, но пустой, то тоже проблема.
        // Лучше просто выйти, если нет базовой строки для работы.
        if (!loadedTranslations || !loadedTranslations['qa-lead-duration-full']) return;
    }

    const startDate = new Date('2024-05-25T00:00:00'); // Убедитесь, что эта дата верна
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    const element = document.getElementById('gammister-lead-duration');
    if (!element) return; // Если элемента нет на странице

    if (diffInMs < 0) { // Если дата начала в будущем
         if(loadedTranslations['qa-lead-duration-full']) {
            element.innerHTML = loadedTranslations['qa-lead-duration-full'];
         } else if (currentLang === 'ru') {
            element.innerHTML = "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)";
         } else {
            element.innerHTML = "May 2024 – Present | Gammister | UAE (Remote)";
         }
         return;
    }

    const totalSeconds = Math.floor(diffInMs / 1000);
    let seconds = totalSeconds % 60;
    let totalMinutes = Math.floor(totalSeconds / 60);
    let minutes = totalMinutes % 60;
    let totalHours = Math.floor(totalMinutes / 60);
    let hours = totalHours % 24; // Это часы текущего дня от начала отсчета, а не общие часы
    // let totalDays = Math.floor(totalHours / 24); // Не используется в этой версии напрямую для строки

    // Логика из вашего работающего кода для годов, месяцев, дней
    let years = 0;
    let months = 0;
    let tempDaysCalc = Math.floor(totalHours / 24); // Используем общее количество дней для расчета

    if (tempDaysCalc >= 365.25) { // Используем 365.25 для учета високосных годов
        years = Math.floor(tempDaysCalc / 365.25);
        tempDaysCalc -= Math.floor(years * 365.25);
    }
    if (tempDaysCalc >= 30.4375) { // Среднее количество дней в месяце
        months = Math.floor(tempDaysCalc / 30.4375);
        tempDaysCalc -= Math.floor(months * 30.4375);
    }
    let days = Math.floor(tempDaysCalc);


    let durationString = '';
    // Используем loadedTranslations для аббревиатур, с откатом на дефолт
    const yearAbbr = (loadedTranslations && loadedTranslations['year-abbr']) || (currentLang === 'ru' ? 'г.' : 'yr');
    const monthAbbr = (loadedTranslations && loadedTranslations['month-abbr']) || (currentLang === 'ru' ? 'мес.' : 'mos');
    const dayAbbr = (loadedTranslations && loadedTranslations['day-abbr']) || (currentLang === 'ru' ? 'дн.' : 'days');
    const hourAbbr = (loadedTranslations && loadedTranslations['hour-abbr']) || (currentLang === 'ru' ? 'ч.' : 'hrs');
    const minuteAbbr = (loadedTranslations && loadedTranslations['minute-abbr']) || (currentLang === 'ru' ? 'мин.' : 'min');
    const secondAbbr = (loadedTranslations && loadedTranslations['second-abbr']) || (currentLang === 'ru' ? 'сек.' : 'sec');

    // Формирование строки точно как на вашем скриншоте
    if (years > 0) durationString += `${years} ${yearAbbr} `;
    // Месяцы показываем, даже если 0, если есть года (или если это единственный не нулевой компонент до дней)
    if (years > 0 || months > 0 ) durationString += `${months} ${monthAbbr} `;
    // Дни показываем, если есть года/месяцы или если это единственный компонент до часов
    if (years > 0 || months > 0 || days > 0) durationString += `${days} ${dayAbbr} `;

    // Часы (используем `hours` из `totalHours % 24`, так как это часы текущего дня в отсчете)
    // или можно использовать `totalHours` если нужно общее кол-во часов. На скриншоте это похоже на `totalHours % 24`.
    // Показываем часы, если это первый день или если есть более крупные единицы
    if (years > 0 || months > 0 || days > 0 || hours > 0) durationString += `${hours} ${hourAbbr} `;

    // Минуты
    if (years > 0 || months > 0 || days > 0 || hours > 0 || minutes > 0) durationString += `${minutes} ${minuteAbbr} `;

    // Секунды показываем всегда
    durationString += `${seconds} ${secondAbbr}`;

    durationString = durationString.trim();

    // Текст "только началось"
    const justStartedText = (loadedTranslations && loadedTranslations['duration-just-started']) || (currentLang === 'ru' ? 'только началось' : 'just started');
    if (totalSeconds === 0) { // Строго 0 секунд
         durationString = justStartedText;
    }

    // Базовая строка и текст "настоящее время"
    const baseStringFull = (loadedTranslations && loadedTranslations['qa-lead-duration-full']) ||
                           (currentLang === 'ru' ? "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)" : "May 2024 – Present | Gammister | UAE (Remote)");
    const presentTextString = (loadedTranslations && loadedTranslations['present-time-text']) ||
                              (currentLang === 'ru' ? 'настоящее время' : 'Present');

    const baseStringParts = baseStringFull.split(' | ');
    if (baseStringParts.length === 3) {
        const timePart = baseStringParts[0];
        let newTimePart = timePart;
        if (timePart.includes(presentTextString)) {
             newTimePart = timePart.replace(presentTextString, `${presentTextString} · ${durationString}`);
        } else {
            // Если вдруг в строке нет "настоящее время", но мы все равно хотим добавить таймер
            // Этого быть не должно, если ключ qa-lead-duration-full всегда содержит present-time-text
            newTimePart = `${timePart} · ${durationString}`;
        }
        element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
    } else {
        // Если формат строки неожиданный, пытаемся просто заменить "настоящее время"
        element.innerHTML = baseStringFull.replace(presentTextString, `${presentTextString} · ${durationString}`);
    }
}
// --- КОНЕЦ ВОССТАНОВЛЕННОЙ updateWorkDuration ---


document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();

    updateWorkDuration(); // Первый вызов для немедленного отображения
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
        } catch (e) {/*Игнорируем*/}

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
// --- КОНЕЦ ФАЙЛА scripts.js ---