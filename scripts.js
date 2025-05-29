// --- НАЧАЛО ФАЙЛА scripts.js ---

// Самовызывающаяся функция для обработки перенаправления с 404.html
(function () {
  var redirect = sessionStorage.redirect; // Получаем сохраненный путь из sessionStorage
  delete sessionStorage.redirect; // Удаляем его, чтобы он не использовался повторно
  // Если был сохраненный путь, и он не пустой и не просто '/'
  if (redirect && redirect !== '' && redirect !== '/') {
    var l = window.location;
    // l.pathname на этом этапе обычно /MY_CV/ (или /MY_CV/index.html в зависимости от сервера)
    // redirect может быть 'en', 'ru', или 'en?queryparams'
    // Мы хотим, чтобы новый URL был /MY_CV/en или /MY_CV/ru
    var newRedirectPath = redirect.startsWith('/') ? redirect.substring(1) : redirect;
    // Собираем новый полный путь: текущий путь (обычно /MY_CV/) + newRedirectPath
    var newFullPath = (l.pathname.endsWith('/') ? l.pathname : l.pathname + '/') + newRedirectPath;

    // Заменяем текущий URL в истории браузера на новый, без перезагрузки страницы
    history.replaceState(null, '', newFullPath);
  }
})();


let currentLang = 'ru'; // Язык по умолчанию, будет обновлен из URL
let loadedTranslations = {}; // Загруженные переводы
const toggleButton = document.getElementById('language-toggle'); // Кнопка переключения языка
const basePath = '/MY_CV'; // Базовый путь вашего репозитория на GitHub Pages

// Асинхронная функция для загрузки файлов перевода
async function fetchTranslations(lang) {
    try {
        // Запрашиваем JSON файл с переводами, добавляя v=timestamp для предотвращения кеширования
        const response = await fetch(`${basePath}/translations/${lang}.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            // Если файл не найден или другая ошибка сервера
            console.error(`Не удалось загрузить ${lang}.json. Статус: ${response.status}`);
            if (lang !== 'ru') { // Предотвращаем бесконечный цикл, если сам 'ru.json' не загружается
                console.warn(`Выполняется откат на 'ru' с языка '${lang}'`);
                currentLang = 'ru'; // Немедленно обновляем глобальный currentLang при попытке отката
                return await fetchTranslations('ru'); // Пытаемся загрузить язык по умолчанию ('ru')
            }
            return {}; // Возвращаем пустой объект, если 'ru' также не удалось загрузить
        }
        currentLang = lang; // Язык успешно загружен, обновляем глобальный currentLang
        return await response.json(); // Возвращаем распарсенный JSON
    } catch (error) {
        // Если произошла сетевая ошибка или другая ошибка при запросе
        console.error(`Ошибка при загрузке переводов для ${lang}:`, error);
        if (lang !== 'ru') {
            console.warn(`Выполняется откат на 'ru' с языка '${lang}' из-за ошибки.`);
            currentLang = 'ru'; // Немедленно обновляем глобальный currentLang при попытке отката
            return await fetchTranslations('ru'); // Пытаемся загрузить язык по умолчанию ('ru')
        }
        return {}; // Возвращаем пустой объект в случае ошибки
    }
}

// Функция для применения загруженных переводов к элементам страницы
function applyTranslations() {
    try {
        // Если переводы не загружены или объект переводов пуст
        if (Object.keys(loadedTranslations).length === 0) {
            console.warn("Переводы не загружены или пусты. Отображение с настройками по умолчанию или существующим содержимым.");
            document.title = document.title || 'CV'; // Используем существующий title или дефолт
            if (toggleButton) {
                const defaultButtonText = currentLang === 'ru' ? 'EN' : 'RU';
                toggleButton.textContent = loadedTranslations['lang-toggle-text'] || defaultButtonText;
            }
            // Обновляем текст кнопки PDF, если она есть и переводы не загружены
            const downloadPdfButton = document.getElementById('download-pdf-button');
            if (downloadPdfButton) {
                 const defaultPdfButtonText = currentLang === 'ru' ? 'Скачать PDF' : 'Download PDF';
                 downloadPdfButton.textContent = loadedTranslations['download-pdf-button-text'] || defaultPdfButtonText;
            }

            updateWorkDuration(); // Все равно пытаемся обновить длительность, там есть фоллбэки
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
                // Для кнопки используем textContent, для остальных innerHTML
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
        // Обновляем текст кнопки PDF, если она есть
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

    if (currentPathPrefix !== expectedPath || (window.location.pathname.length < expectedPath.length && window.location.pathname !== basePath && window.location.pathname !== basePath + '/')) {
        history.replaceState({ lang: currentLang }, document.title, `${expectedPath}${window.location.search}${window.location.hash}`);
    }

    await changeLanguage(currentLang);

    setInterval(updateWorkDuration, 1000);

    const downloadPdfButton = document.getElementById('download-pdf-button');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', () => {
            window.print();
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
            //
        }

        if (link.protocol === "mailto:" || isExternal) {
            // Проверяем, не является ли ссылка заголовком статьи или опытом работы
            // чтобы не добавлять target="_blank" к ним, если они уже являются ссылками
            const isTitleLink = link.classList.contains('article-title-link') ||
                                (link.parentElement && link.parentElement.classList.contains('timeline-content') && link.querySelector('h4'));

            if (!isTitleLink) { // Добавляем target_blank только если это не ссылка-заголовок
                 link.setAttribute('target', '_blank');
                 link.setAttribute('rel', 'noopener noreferrer');
            } else if (link.classList.contains('article-title-link')) { // Для ссылок-заголовков статей добавляем rel
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
});

// --- КОНЕЦ ФАЙЛА scripts.js ---