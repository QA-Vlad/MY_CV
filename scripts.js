// --- START OF FILE scripts.js ---
let currentLang = 'ru'; // Default language
let loadedTranslations = {};
const toggleButton = document.getElementById('language-toggle');

async function fetchTranslations(lang) {
    try {
        const response = await fetch(`translations/${lang}.json?v=${new Date().getTime()}`); // Cache busting
        if (!response.ok) {
            console.error(`Failed to load ${lang}.json. Status: ${response.status}`);
            if (lang !== 'ru') return await fetchTranslations('ru'); // Fallback to 'ru'
            return {};
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching translations for ${lang}:`, error);
        if (lang !== 'ru') return await fetchTranslations('ru'); // Fallback to 'ru' on network error
        return {};
    }
}

function applyTranslations() {
    if (Object.keys(loadedTranslations).length === 0) {
        console.warn("Translations not loaded or empty.");
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

    const profilePhoto = document.getElementById('profile-photo');
    if (profilePhoto) profilePhoto.alt = loadedTranslations['profile-photo-alt'] || 'Profile Photo';

    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (loadedTranslations[key]) {
            // Для элемента с динамической продолжительностью, устанавливаем базовую строку.
            // updateWorkDuration позаботится о динамической части.
            if (key === 'qa-lead-duration-full' && element.id === 'gammister-lead-duration') {
                element.innerHTML = loadedTranslations[key]; // Загружаем шаблон, updateWorkDuration его дополнит
            } else {
                element.innerHTML = loadedTranslations[key];
            }
        }
    });

    if (toggleButton) {
        toggleButton.textContent = loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU');
    }
    updateWorkDuration(); // Вызываем для первоначальной установки и форматирования
}

async function changeLanguage(lang) {
    currentLang = lang;
    loadedTranslations = await fetchTranslations(lang);
    applyTranslations();
}

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang);
    });
}

function updateWorkDuration() {
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        return; // Переводы еще не загружены или отсутствует ключ
    }

    const startDate = new Date('2024-05-25T00:00:00'); // Ваша дата начала работы QA Lead в Gammister
    const currentDate = new Date();
    const diffInMs = currentDate - startDate;

    if (diffInMs < 0) { // Если дата начала в будущем
         const element = document.getElementById('gammister-lead-duration');
         if(element) element.innerHTML = loadedTranslations['qa-lead-duration-full']; // Показываем базовую строку
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

    if (tempDays >= 365) {
        years = Math.floor(tempDays / 365.25);
        tempDays -= Math.floor(years * 365.25);
    }
    if (tempDays >= 30) {
        months = Math.floor(tempDays / 30.4375);
        tempDays -= Math.floor(months * 30.4375);
    }
    let days = Math.floor(tempDays);

    let durationString = '';

    if (years > 0) {
        durationString += `${years} ${loadedTranslations['year-abbr'] || 'г.'} `;
    }
    if (months > 0 || years > 0) {
        durationString += `${months} ${loadedTranslations['month-abbr'] || 'мес.'} `;
    }
    if (days > 0 || months > 0 || years > 0) {
        durationString += `${days} ${loadedTranslations['day-abbr'] || 'дн.'} `;
    }
    if (hours > 0 || days > 0 || months > 0 || years > 0) {
        durationString += `${hours} ${loadedTranslations['hour-abbr'] || 'ч.'} `;
    }
    if (minutes > 0 || hours > 0 || days > 0 || months > 0 || years > 0) {
        durationString += `${minutes} ${loadedTranslations['minute-abbr'] || 'мин.'} `;
    }
    durationString += `${seconds} ${loadedTranslations['second-abbr'] || 'сек.'}`;
    durationString = durationString.trim();

    if (years === 0 && months === 0 && days === 0 && hours === 0 && minutes === 0 && seconds === 0 && totalSeconds === 0) {
         durationString = loadedTranslations['duration-just-started'] || (currentLang === 'ru' ? 'только началось' : 'just started');
    }

    const element = document.getElementById('gammister-lead-duration');
    if (element && loadedTranslations['qa-lead-duration-full']) {
        const baseStringParts = loadedTranslations['qa-lead-duration-full'].split(' | ');
        if (baseStringParts.length === 3) {
            element.innerHTML = `${baseStringParts[0]} · ${durationString} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
        } else {
            element.innerHTML = `${loadedTranslations['qa-lead-duration-full'].replace('настоящее время', `настоящее время · ${durationString}`)}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await changeLanguage(currentLang); // Загружаем язык по умолчанию
    setInterval(updateWorkDuration, 1000); // Обновляем продолжительность каждую секунду

    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        if (link.href.indexOf(window.location.hostname) === -1 || link.href.startsWith('mailto:')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
});
// --- END OF FILE scripts.js ---