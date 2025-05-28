// --- START OF FILE scripts.js ---
let currentLang = 'ru'; // Default language
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');

async function fetchTranslations(lang) {
    try {
        const response = await fetch(`translations/${lang}.json?v=${new Date().getTime()}`); // Cache busting
        if (!response.ok) {
            console.error(`Failed to load ${lang}.json. Status: ${response.status}`);
            if (lang !== 'ru') {
                currentLang = 'ru'; // Важно обновить currentLang, если основной язык не загрузился
                return await fetchTranslations('ru'); // Fallback to 'ru'
            }
            return {};
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching translations for ${lang}:`, error);
        if (lang !== 'ru') {
            currentLang = 'ru'; // Важно обновить currentLang при ошибке
            return await fetchTranslations('ru'); // Fallback to 'ru' on network error
        }
        return {};
    }
}

function applyTranslations() {
    try {
        if (Object.keys(loadedTranslations).length === 0) {
            console.warn("Translations not loaded or empty. Displaying with defaults or existing content.");
            // Устанавливаем базовые значения, если переводы не загрузились
            document.title = document.title || 'CV'; // Используем существующий title или дефолт
            if (toggleButton) {
                // Используем существующий текст кнопки или дефолт, если переводов нет
                const defaultButtonText = currentLang === 'ru' ? 'EN' : 'RU';
                toggleButton.textContent = loadedTranslations['lang-toggle-text'] || defaultButtonText;
            }
            // Важно: updateWorkDuration может зависеть от loadedTranslations, вызываем его осторожно
            // или с проверками внутри него. Текущая реализация updateWorkDuration уже имеет проверки.
            updateWorkDuration();
            return; // Выходим, если нет переводов, но класс loading-translations будет удален в finally
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

        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto) profilePhoto.alt = loadedTranslations['profile-photo-alt'] || 'Profile Photo';

        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (loadedTranslations[key]) {
                if (key === 'qa-lead-duration-full' && element.id === 'gammister-lead-duration') {
                    element.innerHTML = loadedTranslations[key];
                } else {
                    element.innerHTML = loadedTranslations[key];
                }
            } else {
                // Если для какого-то ключа нет перевода, можно оставить пустым или текущее содержимое
                // console.warn(`Translation key "${key}" not found for language "${currentLang}".`);
            }
        });

        if (toggleButton) {
            toggleButton.textContent = loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU');
        }
        updateWorkDuration();
    } finally {
        // Этот блок выполнится всегда, даже если в try была ошибка или return
        document.body.classList.remove('loading-translations');
    }
}

async function changeLanguage(lang) {
    // Добавляем класс перед началом загрузки, если его еще нет
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }
    currentLang = lang; // Устанавливаем currentLang перед загрузкой
    loadedTranslations = await fetchTranslations(lang);
    // currentLang мог измениться в fetchTranslations при fallback
    applyTranslations(); // applyTranslations теперь удалит класс loading-translations
}

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang);
    });
}

function updateWorkDuration() {
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        // Если переводы еще не загружены или отсутствует ключ, не пытаемся обновить
        // Можно либо вернуть, либо попробовать отобразить базовую строку без динамики,
        // но applyTranslations уже должна была установить базовую строку.
        const element = document.getElementById('gammister-lead-duration');
        if(element && element.getAttribute('data-lang-key') === 'qa-lead-duration-full' && !element.textContent.includes('·')) {
            // Если элемент пуст или не содержит динамической части, но есть ключ перевода
            // Это может произойти, если applyTranslations не смогла загрузить переводы
            // и updateWorkDuration вызвался по таймеру
            if (loadedTranslations['qa-lead-duration-full']) {
                 element.innerHTML = loadedTranslations['qa-lead-duration-full'];
            } else if (currentLang === 'ru') {
                element.innerHTML = "май 2024 г. – настоящее время | Gammister | ..."; // Жесткий фоллбэк
            } else {
                element.innerHTML = "May 2024 – Present | Gammister | ..."; // Жесткий фоллбэк
            }
        }
        // Если loadedTranslations пуст, то и ключей для аббревиатур не будет.
        // Поэтому лучше выйти, если нет основного ключа qa-lead-duration-full.
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

    if (tempDays >= 365.25) { // Используем 365.25 для более точного учета високосных лет
        years = Math.floor(tempDays / 365.25);
        tempDays -= Math.floor(years * 365.25);
    }
    if (tempDays >= 30.4375) { // Средняя длина месяца
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

    if (totalSeconds === 0) { // Проверяем именно totalSeconds, а не комбинацию y/m/d/h/m/s
         durationString = loadedTranslations['duration-just-started'] || (currentLang === 'ru' ? 'только началось' : 'just started');
    }

    if (element && loadedTranslations['qa-lead-duration-full']) {
        const baseStringParts = loadedTranslations['qa-lead-duration-full'].split(' | ');
        // Ожидаем 3 части: "дата начала - наст. время", "Компания", "Локация"
        if (baseStringParts.length === 3) { // "май 2024 г. – настоящее время | Gammister | Объединённые Арабские Эмираты · Удалённая работа"
            // Заменяем "настоящее время" на "настоящее время · продолжительность"
            const timePart = baseStringParts[0]; // "май 2024 г. – настоящее время"
            let newTimePart = timePart;
            if (timePart.includes(loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present'))) {
                 newTimePart = timePart.replace(loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present'),
                                             `${loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present')} · ${durationString}`);
            } else { // Если "настоящее время" не найдено, просто добавляем в конец
                newTimePart = `${timePart} · ${durationString}`;
            }
            element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
        } else {
            // Фоллбэк, если структура строки отличается (менее надежно)
            element.innerHTML = `${loadedTranslations['qa-lead-duration-full'].replace(loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present'), `${loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present')} · ${durationString}`)}`;
        }
    } else if (element && !loadedTranslations['qa-lead-duration-full'] && Object.keys(loadedTranslations).length > 0) {
        // Если ключ qa-lead-duration-full отсутствует, но другие переводы есть,
        // это может быть ошибкой в JSON файле. Попытаемся показать что-то осмысленное.
        // Например, только динамическую часть, если другие ключи для аббревиатур есть.
        element.innerHTML = durationString;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Класс уже должен быть на body из HTML, но можно добавить и здесь для подстраховки
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }
    // Перед первой загрузкой языка, убедимся что currentLang корректен (например, из localStorage)
    // currentLang = localStorage.getItem('preferredLang') || 'ru'; // Пример

    await changeLanguage(currentLang); // Загружаем язык по умолчанию
                                       // changeLanguage вызовет applyTranslations, который удалит 'loading-translations'

    setInterval(updateWorkDuration, 1000);

    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        if (link.href.indexOf(window.location.hostname) === -1 || link.href.startsWith('mailto:')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
});

// --- END OF FILE scripts.js ---