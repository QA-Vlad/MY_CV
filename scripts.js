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

// Функция для применения загруженных переводов к элементам страницы
function applyTranslations() {
    try {
        if (Object.keys(loadedTranslations).length === 0) {
            console.warn("Переводы не загружены или пусты. Отображение с настройками по умолчанию.");
            document.title = document.title || 'CV';
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
        document.title = loadedTranslations['page-title'] || 'CV';

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
        if (profilePhoto) profilePhoto.alt = loadedTranslations['profile-photo-alt'] || 'Фото профиля';

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

    const newPath = `${basePath}/${currentLang}`;
    const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

    const currentPathLangSegment = window.location.pathname.substring(basePath.length + 1).split('/')[0];
    if (currentPathLangSegment !== currentLang || window.location.pathname.substring(0, newPath.length) !== newPath) {
         history.pushState({ lang: currentLang }, loadedTranslations['page-title'] || document.title, fullNewPath);
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
                element.innerHTML = "май 2024 г. – настоящее время | Gammister | ...";
            } else {
                element.innerHTML = "May 2024 – Present | Gammister | ...";
            }
        }
        if (!loadedTranslations['qa-lead-duration-full']) return;
    }

    const startDate = new Date('2024-05-25T00:00:00');
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

    // Приблизительный расчет лет и месяцев
    if (tempDays >= 365.25) {
        years = Math.floor(tempDays / 365.25);
        tempDays -= Math.floor(years * 365.25);
    }
    if (tempDays >= 30.4375) { // Среднее количество дней в месяце
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

    if (totalSeconds === 0) {
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
                // Это условие может быть не нужно, если строка всегда содержит "настоящее время"
                newTimePart = `${timePart} · ${durationString}`;
            }
            element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
        } else {
            // Обработка, если формат строки неожиданный
            const presentText = loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present');
            element.innerHTML = `${loadedTranslations['qa-lead-duration-full'].replace(presentText, `${presentText} · ${durationString}`)}`;
        }
    } else if (element && !loadedTranslations['qa-lead-duration-full'] && Object.keys(loadedTranslations).length > 0) {
        // Если переводы есть, но конкретного ключа нет (маловероятно для этой функции)
        element.innerHTML = durationString;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru'; // Язык по умолчанию
    const path = window.location.pathname;

    // Определение языка из URL
    if (path.startsWith(basePath + '/')) {
        const langSegment = path.substring(basePath.length + 1).split('/')[0];
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment;
        }
    }

    currentLang = langToLoad;

    // Установка корректного URL, если он не соответствует выбранному языку
    const expectedPath = `${basePath}/${currentLang}`;
    const currentPathPrefix = window.location.pathname.substring(0, expectedPath.length);

    if (currentPathPrefix !== expectedPath || (window.location.pathname.length < expectedPath.length && window.location.pathname !== basePath && window.location.pathname !== basePath + '/')) {
        history.replaceState({ lang: currentLang }, document.title, `${expectedPath}${window.location.search}${window.location.hash}`);
    }

    await changeLanguage(currentLang);

    setInterval(updateWorkDuration, 1000); // Обновление таймера каждую секунду

    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', () => {
            window.print();
        });
    }

    // Добавление target="_blank" для внешних ссылок
    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        let isExternal = true;
        try {
            const linkHostname = new URL(link.href).hostname;
            if (linkHostname === window.location.hostname) {
                isExternal = false;
            }
        } catch (e) {
            // Игнорируем ошибки парсинга URL, считаем ссылку внешней
        }

        if (link.protocol === "mailto:" || isExternal) {
            const isTitleLink = link.classList.contains('article-title-link') ||
                                (link.parentElement && link.parentElement.classList.contains('timeline-content') && link.querySelector('h4'));

            if (!isTitleLink) {
                 link.setAttribute('target', '_blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) {
                link.setAttribute('rel', 'noopener noreferrer'); // Для ссылок-заголовков статей
            }
        }
    });
});

// --- КОНЕЦ ФАЙЛА scripts.js ---