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
                // Используем существующий текст кнопки или дефолт, если переводов нет
                const defaultButtonText = currentLang === 'ru' ? 'EN' : 'RU';
                toggleButton.textContent = loadedTranslations['lang-toggle-text'] || defaultButtonText;
            }
            updateWorkDuration(); // Все равно пытаемся обновить длительность, там есть фоллбэки
            // Обновляем og:url даже если переводы не удались, чтобы отразить текущий язык URL
            const ogUrlMeta = document.querySelector('meta[property="og:url"]');
            if (ogUrlMeta) {
                 ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}`;
            }
            return; // Выходим, если нет переводов
        }

        // Устанавливаем атрибут lang для <html>
        document.documentElement.lang = loadedTranslations['lang-code'] || currentLang;
        // Устанавливаем заголовок страницы
        document.title = loadedTranslations['page-title'] || 'CV';

        // Обновляем мета-теги
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = loadedTranslations['meta-description'] || '';
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metaKeywords.content = loadedTranslations['meta-keywords'] || '';
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = loadedTranslations['og-title'] || '';
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = loadedTranslations['og-description'] || '';

        // Обновляем og:url с учетом текущего языка
        const ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (ogUrlMeta) {
            ogUrlMeta.content = `${window.location.origin}${basePath}/${currentLang}`;
        }

        // Обновляем alt текст для фото профиля
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto) profilePhoto.alt = loadedTranslations['profile-photo-alt'] || 'Фото профиля';

        // Обходим все элементы с атрибутом data-lang-key и вставляем перевод
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (loadedTranslations[key]) {
                element.innerHTML = loadedTranslations[key];
            } else {
                // console.warn(`Ключ перевода "${key}" не найден для языка "${currentLang}".`);
            }
        });

        // Обновляем текст на кнопке переключения языка
        if (toggleButton) {
            toggleButton.textContent = loadedTranslations['lang-toggle-text'] || (currentLang === 'ru' ? 'EN' : 'RU');
        }
        updateWorkDuration(); // Обновляем динамически отображаемую продолжительность работы
    } finally {
        // Этот блок выполнится всегда, удаляя класс, который скрывает текст на время загрузки
        document.body.classList.remove('loading-translations');
    }
}

// Асинхронная функция для смены языка
async function changeLanguage(lang) {
    // Добавляем класс для эффекта "загрузки" (скрытия текста)
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    // Функция fetchTranslations обновит глобальный `currentLang`
    // в случае, если произойдет откат к языку по умолчанию.
    loadedTranslations = await fetchTranslations(lang);
    applyTranslations(); // Применяем переводы. Использует (потенциально обновленный) глобальный currentLang

    // Обновляем URL на основе *фактически* загруженного языка (currentLang)
    const newPath = `${basePath}/${currentLang}`; // Здесь нет строки запроса или хеша, если вы не хотите их сохранять
    // Собираем новый полный путь, сохраняя текущие query параметры и hash
    const fullNewPath = `${newPath}${window.location.search}${window.location.hash}`;

    // Добавляем новую запись в историю браузера, только если языковой сегмент пути действительно изменился
    // или если текущий путь не начинается с ожидаемого newPath (например, если был /MY_CV/ а стал /MY_CV/ru)
    const currentPathLangSegment = window.location.pathname.substring(basePath.length + 1).split('/')[0];
    if (currentPathLangSegment !== currentLang || window.location.pathname.substring(0, newPath.length) !== newPath) {
         history.pushState({ lang: currentLang }, loadedTranslations['page-title'] || document.title, fullNewPath);
    }
}

// Если кнопка переключения языка существует, добавляем обработчик клика
if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        // Определяем новый язык: если текущий 'ru', то новый 'en', и наоборот
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        changeLanguage(newLang); // Вызываем функцию смены языка
    });
}

// Функция для обновления отображения продолжительности работы
function updateWorkDuration() {
    // Если переводы не загружены или отсутствует ключ для полной строки продолжительности
    if (Object.keys(loadedTranslations).length === 0 || !loadedTranslations['qa-lead-duration-full']) {
        const element = document.getElementById('gammister-lead-duration');
        // Если элемент пуст или не содержит динамической части, но есть ключ перевода
        if(element && element.getAttribute('data-lang-key') === 'qa-lead-duration-full' && !element.textContent.includes('·')) {
            if (loadedTranslations['qa-lead-duration-full']) {
                 element.innerHTML = loadedTranslations['qa-lead-duration-full'];
            } else if (currentLang === 'ru') {
                element.innerHTML = "май 2024 г. – настоящее время | Gammister | ..."; // Жесткий фоллбэк для ru
            } else {
                element.innerHTML = "May 2024 – Present | Gammister | ..."; // Жесткий фоллбэк для en
            }
        }
        // Если нет основного ключа qa-lead-duration-full, выходим
        if (!loadedTranslations['qa-lead-duration-full']) return;
    }

    const startDate = new Date('2024-05-25T00:00:00'); // Дата начала работы
    const currentDate = new Date(); // Текущая дата
    const diffInMs = currentDate - startDate; // Разница в миллисекундах

    const element = document.getElementById('gammister-lead-duration'); // Элемент для отображения

    // Если разница отрицательная (дата начала в будущем), показываем базовую строку
    if (diffInMs < 0) {
         if(element && loadedTranslations['qa-lead-duration-full']) element.innerHTML = loadedTranslations['qa-lead-duration-full'];
         return;
    }

    // Расчет лет, месяцев, дней, часов, минут, секунд
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
    let days = Math.floor(tempDays); // Оставшиеся дни

    let durationString = '';
    // Получаем сокращения для времени из переводов или используем дефолтные
    const yearAbbr = loadedTranslations['year-abbr'] || (currentLang === 'ru' ? 'г.' : 'yr');
    const monthAbbr = loadedTranslations['month-abbr'] || (currentLang === 'ru' ? 'мес.' : 'mos');
    const dayAbbr = loadedTranslations['day-abbr'] || (currentLang === 'ru' ? 'дн.' : 'days');
    const hourAbbr = loadedTranslations['hour-abbr'] || (currentLang === 'ru' ? 'ч.' : 'hrs');
    const minuteAbbr = loadedTranslations['minute-abbr'] || (currentLang === 'ru' ? 'мин.' : 'min');
    const secondAbbr = loadedTranslations['second-abbr'] || (currentLang === 'ru' ? 'сек.' : 'sec');

    // Формируем строку продолжительности
    if (years > 0) durationString += `${years} ${yearAbbr} `;
    if (months > 0 || years > 0) durationString += `${months} ${monthAbbr} `; // Показываем месяцы, если есть годы или месяцы
    if (days > 0 || months > 0 || years > 0) durationString += `${days} ${dayAbbr} `; // Показываем дни, если есть годы/месяцы/дни
    if (hours > 0 || days > 0 || months > 0 || years > 0) durationString += `${hours} ${hourAbbr} `;
    if (minutes > 0 || hours > 0 || days > 0 || months > 0 || years > 0) durationString += `${minutes} ${minuteAbbr} `;
    durationString += `${seconds} ${secondAbbr}`; // Секунды показываем всегда
    durationString = durationString.trim(); // Убираем лишние пробелы

    // Если общее количество секунд равно 0, показываем "только началось"
    if (totalSeconds === 0) {
         durationString = loadedTranslations['duration-just-started'] || (currentLang === 'ru' ? 'только началось' : 'just started');
    }

    // Если элемент существует и есть базовый перевод для строки продолжительности
    if (element && loadedTranslations['qa-lead-duration-full']) {
        const baseStringParts = loadedTranslations['qa-lead-duration-full'].split(' | ');
        // Ожидаем 3 части: "дата начала - наст. время", "Компания", "Локация"
        if (baseStringParts.length === 3) {
            const timePart = baseStringParts[0]; // "май 2024 г. – настоящее время"
            let newTimePart = timePart;
            const presentText = loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present');
            // Если в строке времени есть текст "настоящее время"
            if (timePart.includes(presentText)) {
                 // Заменяем "настоящее время" на "настоящее время · продолжительность"
                 newTimePart = timePart.replace(presentText, `${presentText} · ${durationString}`);
            } else { // Если "настоящее время" не найдено, просто добавляем в конец части времени
                newTimePart = `${timePart} · ${durationString}`;
            }
            // Собираем обратно полную строку
            element.innerHTML = `${newTimePart} | ${baseStringParts[1]} | ${baseStringParts[2]}`;
        } else {
            // Фоллбэк, если структура строки отличается (менее надежно)
            const presentText = loadedTranslations['present-time-text'] || (currentLang === 'ru' ? 'настоящее время' : 'Present');
            element.innerHTML = `${loadedTranslations['qa-lead-duration-full'].replace(presentText, `${presentText} · ${durationString}`)}`;
        }
    } else if (element && !loadedTranslations['qa-lead-duration-full'] && Object.keys(loadedTranslations).length > 0) {
        // Если ключ qa-lead-duration-full отсутствует, но другие переводы есть (ошибка в JSON?),
        // показываем только динамическую часть.
        element.innerHTML = durationString;
    }
}


// Обработчик события загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Добавляем класс для эффекта "загрузки", если его еще нет
    if (!document.body.classList.contains('loading-translations')) {
        document.body.classList.add('loading-translations');
    }

    let langToLoad = 'ru'; // Язык для загрузки по умолчанию
    const path = window.location.pathname; // Текущий путь в URL

    // Проверяем, есть ли языковой сегмент в URL (например, /MY_CV/en)
    if (path.startsWith(basePath + '/')) {
        const langSegment = path.substring(basePath.length + 1).split('/')[0];
        if (langSegment === 'en' || langSegment === 'ru') {
            langToLoad = langSegment; // Используем язык из URL
        }
        // Если langSegment другой (например, /MY_CV/somepage), langToLoad останется 'ru' (или какой там у вас currentLang по умолчанию)
        // и URL будет исправлен ниже, если потребуется
    }

    // Устанавливаем глобальный currentLang перед вызовом changeLanguage
    // changeLanguage будет использовать его и может обновить через fallback в fetchTranslations
    currentLang = langToLoad;

    // Убеждаемся, что URL отражает определенный язык,
    // особенно если это был "голый" /MY_CV/ или /MY_CV/невалидный_язык
    const expectedPath = `${basePath}/${currentLang}`; // Ожидаемый путь, например /MY_CV/ru
    // Текущий префикс пути до длины ожидаемого пути
    const currentPathPrefix = window.location.pathname.substring(0, expectedPath.length);

    // Если текущий префикс не совпадает с ожидаемым путем ИЛИ текущий путь короче ожидаемого (и не равен basePath)
    // (например, URL был /MY_CV/ вместо /MY_CV/ru)
    if (currentPathPrefix !== expectedPath || (window.location.pathname.length < expectedPath.length && window.location.pathname !== basePath && window.location.pathname !== basePath + '/')) {
        // Это условие означает, что URL не /MY_CV/`currentLang` или /MY_CV/`currentLang`/что-то_еще
        // Например, /MY_CV/ или /MY_CV/нечто -> обновить до /MY_CV/`currentLang`
        // Заменяем URL без перезагрузки страницы, сохраняя query параметры и hash
        history.replaceState({ lang: currentLang }, document.title, `${expectedPath}${window.location.search}${window.location.hash}`);
    }

    await changeLanguage(currentLang); // Загружаем переводы для определенного языка
                                       // changeLanguage также вызовет pushState, если язык действительно изменится (например, из-за отката)

    // Устанавливаем интервал для обновления продолжительности работы каждую секунду
    setInterval(updateWorkDuration, 1000);

    // Добавляем target="_blank" для всех внешних ссылок и ссылок mailto:
    document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(link => {
        // Проверяем, является ли ссылка внешней или mailto
        let isExternal = true;
        try {
            const linkHostname = new URL(link.href).hostname;
            if (linkHostname === window.location.hostname) { // Если хост совпадает с текущим
                isExternal = false; // Это внутренняя ссылка
            }
        } catch (e) {
            // Невалидный URL (например, относительный путь, который не начинается с http), mailto, tel, и т.д.
            // Для mailto: isExternal останется true, что корректно.
        }

        // Если ссылка mailto или определена как внешняя
        if (link.protocol === "mailto:" || isExternal) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer'); // Для безопасности
        }
    });
});

// --- КОНЕЦ ФАЙЛА scripts.js ---