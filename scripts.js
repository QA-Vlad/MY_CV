// --- НАЧАЛО ФАЙЛА scripts.js ---

// Самовызывающаяся функция для обработки перенаправления с 404.html
(function () {
  var redirect = sessionStorage.redirect; // Получаем сохраненный путь из sessionStorage
  delete sessionStorage.redirect; // Удаляем его, чтобы он не использовался повторно
  // Если был сохраненный путь, и он не пустой и не просто '/'
  if (redirect && redirect !== '' && redirect !== '/') {
    var l = window.location;
    var newRedirectPath = redirect.startsWith('/') ? redirect.substring(1) : redirect;
    var newFullPath = (l.pathname.endsWith('/') ? l.pathname : l.pathname + '/') + newRedirectPath;
    history.replaceState(null, '', newFullPath);
  }
})();


let currentLang = 'ru'; // Язык по умолчанию
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');
const basePath = '/MY_CV'; // Базовый путь репозитория

// Асинхронная функция для загрузки файлов перевода
async function fetchTranslations(lang) {
    try {
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`); // v=timestamp для предотвращения кеширования
        if (!response.ok) {
            console.error(`Не удалось загрузить ${lang}.json. Статус: ${response.status}`);
            if (lang !== 'ru') {
                console.warn(`Выполняется откат на 'ru' с языка '${lang}'`);
                currentLang = 'ru';
                return await fetchTranslations('ru'); // Попытка загрузить язык по умолчанию
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

// Функция для обновления мета-тегов для SEO
function updateMetaTagsForSEO() {
    const head = document.head;

    // Удаляем старые hreflang и canonical теги, чтобы избежать дублирования
    head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach(tag => tag.remove());

    const siteOrigin = window.location.origin; // Например, https://qa-vlad.github.io
    const ruUrl = `${siteOrigin}${basePath}/ru`;
    const enUrl = `${siteOrigin}${basePath}/en`;
    const defaultUrl = ruUrl; // Русская версия как x-default

    let canonicalUrl = '';
    if (currentLang === 'ru') {
        canonicalUrl = ruUrl;
    } else { // Предполагаем 'en'
        canonicalUrl = enUrl;
    }

    // Добавляем канонический тег
    const canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    canonicalTag.setAttribute('href', canonicalUrl);
    head.appendChild(canonicalTag);

    // Добавляем hreflang для русского
    const hreflangRuTag = document.createElement('link');
    hreflangRuTag.setAttribute('rel', 'alternate');
    hreflangRuTag.setAttribute('hreflang', 'ru');
    hreflangRuTag.setAttribute('href', ruUrl);
    head.appendChild(hreflangRuTag);

    // Добавляем hreflang для английского
    const hreflangEnTag = document.createElement('link');
    hreflangEnTag.setAttribute('rel', 'alternate');
    hreflangEnTag.setAttribute('hreflang', 'en');
    hreflangEnTag.setAttribute('href', enUrl);
    head.appendChild(hreflangEnTag);

    // Добавляем hreflang x-default
    const hreflangXDefaultTag = document.createElement('link');
    hreflangXDefaultTag.setAttribute('rel', 'alternate');
    hreflangXDefaultTag.setAttribute('hreflang', 'x-default');
    hreflangXDefaultTag.setAttribute('href', defaultUrl);
    head.appendChild(hreflangXDefaultTag);
}


// Функция для применения загруженных переводов к элементам страницы
function applyTranslations() {
    try {
        if (Object.keys(loadedTranslations).length === 0) {
            console.warn("Переводы не загружены или пусты. Отображение с настройками по умолчанию.");
            document.title = document.title || 'CV Vladlen Kuznetsov'; // Установим дефолтный тайтл
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
                 ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}`;
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
            ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}`;
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

// Асинхронная функция для смены языка
async function changeLanguage(lang) {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    loadedTranslations = await fetchTranslations(lang);
    applyTranslations();
    updateMetaTagsForSEO(); // Обновляем SEO-теги после применения переводов

    const newPath = `${basePath}/${currentLang}`;
    const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

    const currentPathLangSegment = window.location.pathname.substring(basePath.length + 1).split('/')[0];
    const pageTitleForHistory = loadedTranslations['page-title'] || document.title;

    if (currentPathLangSegment !== currentLang || window.location.pathname.substring(0, newPath.length) !== newPath) {
         history.pushState({ lang: currentLang }, pageTitleForHistory, fullNewPath);
    } else {
        // Если путь уже правильный, просто обновим заголовок в истории на случай, если он изменился
        history.replaceState({ lang: currentLang }, pageTitleForHistory, window.location.href);
    }
}

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang);
    });
}

// Функция для обновления отображения длительности работы
function updateWorkDuration() {
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        const element = document.getElementById('gammister-lead-duration');
        if(element && element.getAttribute('data-lang-key') === 'qa-lead-duration-full' && !element.textContent.includes('·')) {
            if (loadedTranslations['qa-lead-duration-full']) {
                 element.innerHTML = loadedTranslations['qa-lead-duration-full'];
            } else if (currentLang === 'ru') {
                element.innerHTML = "май 2024 г. – настоящее время | Gammister | ОАЭ (удаленно)"; // Полная строка по умолчанию
            } else {
                element.innerHTML = "May 2024 – Present | Gammister | UAE (Remote)"; // Полная строка по умолчанию
            }
        }
        if (!loadedTranslations['qa-lead-duration-full']) return;
    }

    const startDate = new Date('2024-05-25T00:00:00'); // Убедитесь, что эта дата верна
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    const element = document.getElementById('gammister-lead-duration');

    if (diffInMs < 0) { // Если дата начала в будущем
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

    if (totalSeconds === 0 && Object.keys(loadedTranslations).length > 0) { // Проверяем, что переводы загружены
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

    if (path.startsWith(basePath + '/')) {
        const langSegment = path.substring(basePath.length + 1).split('/')[0];
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment;
        }
    }

    currentLang = langToLoad;

    const expectedPath = `${basePath}/${currentLang}`;
    const currentPathPrefix = window.location.pathname.substring(0, expectedPath.length);
    const pageTitleForHistory = document.title; // Запоминаем начальный title до загрузки переводов

    if (currentPathPrefix !== expectedPath || (window.location.pathname.length < expectedPath.length && window.location.pathname !== basePath && window.location.pathname !== basePath + '/')) {
        history.replaceState({ lang: currentLang }, pageTitleForHistory, `${expectedPath}${window.location.search}${window.location.hash}`);
    }

    await changeLanguage(currentLang); // Это уже вызовет applyTranslations и updateMetaTagsForSEO

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
                 link.setAttribute('target', '_blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
});

// --- КОНЕЦ ФАЙЛА scripts.js ---