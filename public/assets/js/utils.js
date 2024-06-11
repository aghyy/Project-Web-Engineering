// defining global variables
let weekDates = [];
let courses = {};
let selectedCourse;
let currentRequest = null;
let keyPressTimeout;
// defining keyboard shortcuts
let keyboardShortcuts = {};
// setting default values
const defaultDocumentTitle = 'DHBW Kalender';
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
// setting xslt urls
const xsltDayUrl = 'assets/xslt/calendar-day-block.xslt';
const xsltWeekUrl = 'assets/xslt/calendar-week-block.xslt';
const xsltMonthUrl = 'assets/xslt/calendar-month-block.xslt';
const xsltMenu = 'assets/xslt/menu-week-block.xslt';
// getting elements
const courseInputElem = document.getElementById('course-input');
const datePicker = document.getElementById('date-picker');
const monthViewWrap = document.querySelector('.month-view-wrap');
const weekViewWrap = document.querySelector('.week-view-wrap');

// checking views
const isMonthView = () => monthViewWrap.style.display !== 'none';
const isWeekView = () => weekViewWrap.style.display !== 'none';

// functions
const insertLoaderBefore = (element) => {
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';

    const beatLoader = document.createElement('div');
    beatLoader.className = 'beat-loader';

    for (let i = 0; i < 3; i++) {
        const innerDiv = document.createElement('div');
        beatLoader.appendChild(innerDiv);
    }

    loaderContainer.appendChild(beatLoader);
    element.parentNode.insertBefore(loaderContainer, element);
}

const removeLoader = () => {
    const loaderContainer = document.querySelector('.loader-container');

    if (loaderContainer) {
        loaderContainer.parentNode.removeChild(loaderContainer);
    }
}

const getDateForPopup = (inputString) => {
    const match = inputString.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

const dayHasEvents = (elem) => {
    if (checkCurrentView() === 'month') {
        if (elem.closest('.month-view-card').querySelector('.month-view-day-info').innerHTML !== '') {
            return true;
        }
    } else if (checkCurrentView() === 'week') {
        let day = elem.classList[1];

        for (let eventElem of document.querySelectorAll('li.event')) {
            if (eventElem.getAttribute('style').includes(`grid-column: ${day}`)) {
                return true;
            }
        }
    }

    return false;
};

const createMenuPopup = async () => {
    let popup = document.createElement('div');
    popup.classList.add('popup');
    popup.id = 'food-menu-popup';
    popup.addEventListener('click', removePopup);

    let popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');
    popupContent.id = 'food-menu-popup-content';

    let popupTitle = document.createElement('div');
    popupTitle.classList.add('popup-title');
    popupTitle.textContent = 'Mensaplan aktuelle Woche';

    let closeIcon = document.createElement('div');
    closeIcon.classList.add('popup-close-button');
    closeIcon.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
    closeIcon.addEventListener('click', removePopup);

    let menuBar = document.createElement('div');
    menuBar.classList.add('menu-bar');
    menuBar.id = 'menu-bar';

    let dayContent = document.createElement('div');
    dayContent.classList.add('day-content');
    dayContent.id = 'day-content';

    popupContent.appendChild(popupTitle);
    popupContent.appendChild(closeIcon);
    popupContent.appendChild(menuBar);
    popupContent.appendChild(dayContent);
    popup.appendChild(popupContent);
    document.body.appendChild(popup);

    document.getElementById('food-menu-popup').style.display = 'block';
    document.body.style.overflow = 'hidden';

    insertLoaderBefore(popupContent);
    dayContent.style.display = 'none';

    let xmlString = await loadMenu();
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    removeLoader();
    dayContent.style.display = 'flex';

    loadXML(xsltMenu, function (xslt) {
        applyFoodMenuXSLT(xmlDoc, xslt, menuBar, dayContent);
    });
}

const applyFoodMenuXSLT = (xmlDoc, xslt, menuBar, dayContent) => {
    let xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xslt);

    let days = xmlDoc.getElementsByTagName('day');
    for (let i = 0; i < days.length; i++) {
        let dayName = days[i].getElementsByTagName('day-name')[0].textContent;

        let dayButton = document.createElement('button');
        dayButton.classList.add('day-button');
        dayButton.textContent = dayName;
        dayButton.addEventListener('click', (event) => {
            let fragment = xsltProcessor.transformToFragment(days[i], document);
            dayContent.innerHTML = '';
            dayContent.appendChild(fragment);

            document.querySelector('.active-food-menu-day')?.classList.remove('active-food-menu-day');
            event.target.classList.add('active-food-menu-day');
        });

        menuBar.appendChild(dayButton);
    }

    let dayIndex = ((new Date().getDay() + 6) % 7) > 4 ? 0 : (new Date().getDay() + 6) % 7;
    menuBar.querySelectorAll('.day-button')[dayIndex].click();
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
});

const createSettingsPopup = async () => {
    let popup = document.createElement('div');
    popup.classList.add('popup');
    popup.id = 'settings-popup';
    popup.addEventListener('click', removePopup);

    let popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');
    popupContent.id = 'settings-popup-content';

    let popupContainer = document.createElement('div');
    popupContainer.classList.add('popup-container');

    let popupTitle = document.createElement('div');
    popupTitle.classList.add('popup-title');
    popupTitle.textContent = 'Einstellungen';

    let closeIcon = document.createElement('div');
    closeIcon.classList.add('popup-close-button');
    closeIcon.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
    closeIcon.addEventListener('click', removePopup);

    let eventLegendSectionTitle = document.createElement('div');
    eventLegendSectionTitle.classList.add('section-title');
    eventLegendSectionTitle.textContent = 'Event-Legende';

    let sectionTitle = document.createElement('div');
    sectionTitle.classList.add('section-title');
    sectionTitle.textContent = 'Allgemein';

    let checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');

    let checkboxLabel = document.createElement('label');
    checkboxLabel.classList.add('checkbox-label');
    checkboxLabel.textContent = 'Kursauswahl speichern';

    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('checkbox');

    const isCheckboxChecked = localStorage.getItem('isCheckboxChecked') === 'true';
    checkbox.checked = isCheckboxChecked;

    checkbox.addEventListener('change', () => {
        localStorage.setItem('isCheckboxChecked', checkbox.checked);

        if (selectedCourse === '') {
            if (checkbox.checked) {
                localStorage.setItem('previouslySelectedCourse', selectedCourse);
                localStorageDisplay.textContent = `Zuvor gewählter Kurs: ${selectedCourse}`;
            } else {
                localStorage.removeItem('previouslySelectedCourse');
                localStorageDisplay.textContent = 'Zuvor gewählter Kurs: Kein Kurs ausgewählt';
            }
        }
    });

    let localStorageDisplay = document.createElement('div');
    localStorageDisplay.classList.add('local-storage-display');
    let previouslySelectedCourse = localStorage.getItem('previouslySelectedCourse') || 'Kein Kurs ausgewählt';
    localStorageDisplay.textContent = `Zuvor gewählter Kurs: ${previouslySelectedCourse}`;

    let clearButton = document.createElement('button');
    clearButton.classList.add('clear-button');
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', () => {
        localStorage.removeItem('previouslySelectedCourse');
        localStorageDisplay.textContent = 'Zuvor gewählter Kurs: Kein Kurs ausgewählt';
    });

    let legendContainer = document.createElement('div');
    legendContainer.classList.add('calendar-legend');

    let legendItems = [
        { color: 'var(--lecture-event)', label: 'Vorlesung' },
        { color: 'var(--volunt-event)', label: 'Freiwilliger Termin' },
        { color: 'var(--exam-event)', label: 'Klausur' },
        { color: 'var(--holiday-event)', label: 'Feiertag' },
        { color: 'var(--other-event)', label: 'Sonstiger Termin' }
    ];

    legendItems.forEach(item => {
        let legendItem = document.createElement('div');
        legendItem.classList.add('legend-item');

        let legendColor = document.createElement('div');
        legendColor.classList.add('legend-color');
        legendColor.style.backgroundColor = item.color;

        let legendLabel = document.createElement('p');
        legendLabel.textContent = item.label;

        legendItem.appendChild(legendColor);
        legendItem.appendChild(legendLabel);
        legendContainer.appendChild(legendItem);
    });

    let themeSectionTitle = document.createElement('div');
    themeSectionTitle.classList.add('section-title');
    themeSectionTitle.textContent = 'Themes';

    let themeContainer = document.createElement('div');
    themeContainer.classList.add('theme-container');

    let addThemeButton = document.createElement('button');
    addThemeButton.classList.add('add-theme-button');
    addThemeButton.textContent = 'Theme hinzufügen';
    addThemeButton.addEventListener('click', addTheme);

    let themeSelector = document.createElement('select');
    themeSelector.classList.add('theme-selector');
    themeSelector.addEventListener('change', () => {
        const selectedTheme = themeSelector.value;
        localStorage.setItem('selectedTheme', selectedTheme);
        applyTheme();
    });

    let themes = JSON.parse(localStorage.getItem('themes')) || {
        default: {
            '--lecture-event': '#4682B4',
            '--volunt-event': '#c3a602',
            '--exam-event': '#FF4500',
            '--holiday-event': '#0f7643',
            '--other-event': '#191970'
        }
    };

    localStorage.setItem('themes', JSON.stringify(themes));

    Object.keys(themes).forEach(theme => {
        let option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelector.appendChild(option);
    });

    themeSelector.value = localStorage.getItem('selectedTheme') || 'default';

    let buttonGroup = document.createElement('div');
    buttonGroup.classList.add('button-group');

    let editThemeButton = document.createElement('button');
    editThemeButton.classList.add('edit-theme-button');
    editThemeButton.textContent = 'Theme bearbeiten';
    editThemeButton.addEventListener('click', editTheme);

    let renameThemeButton = document.createElement('button');
    renameThemeButton.classList.add('rename-theme-button');
    renameThemeButton.textContent = 'Theme umbenennen';
    renameThemeButton.addEventListener('click', renameTheme);

    let deleteThemeButton = document.createElement('button');
    deleteThemeButton.classList.add('delete-theme-button');
    deleteThemeButton.textContent = 'Theme löschen';
    deleteThemeButton.addEventListener('click', deleteTheme);


    buttonGroup.appendChild(editThemeButton);
    buttonGroup.appendChild(renameThemeButton);
    buttonGroup.appendChild(deleteThemeButton);

    themeContainer.appendChild(addThemeButton);
    themeContainer.appendChild(themeSelector);
    themeContainer.appendChild(buttonGroup);

    checkboxLabel.appendChild(checkbox);

    checkboxContainer.appendChild(checkboxLabel);

    popupContainer.appendChild(sectionTitle);
    popupContainer.appendChild(checkboxContainer);
    popupContainer.appendChild(localStorageDisplay);
    popupContainer.appendChild(clearButton);
    popupContainer.appendChild(themeSectionTitle);
    popupContainer.appendChild(themeContainer);
    popupContainer.appendChild(eventLegendSectionTitle);
    popupContainer.appendChild(legendContainer);

    popupContent.appendChild(popupTitle);
    popupContent.appendChild(closeIcon);
    popupContent.appendChild(popupContainer);

    popup.appendChild(popupContent);

    document.body.appendChild(popup);

    document.getElementById('settings-popup').style.display = 'block';
    document.body.style.overflow = 'hidden';
};

const applyTheme = () => {
    const selectedTheme = localStorage.getItem('selectedTheme') || 'default';
    const themes = JSON.parse(localStorage.getItem('themes'));

    if (themes && themes[selectedTheme]) {
        Object.keys(themes[selectedTheme]).forEach(variable => {
            document.documentElement.style.setProperty(variable, themes[selectedTheme][variable]);
        });
    }

    const themeSelector = document.querySelector('.theme-selector');
    if (themeSelector) {
        themeSelector.value = selectedTheme;
    }
};

const addTheme = async () => {
    const themeName = prompt('Theme Namen eingeben:');
    if (!themeName) return;

    const themes = JSON.parse(localStorage.getItem('themes')) || {};

    if (themes[themeName]) {
        alert('Theme existiert bereits!');
        return;
    }

    const newTheme = {};
    newTheme['--lecture-event'] = await openColorPicker('Farbe für Vorlesung eingeben:', '#4682B4');
    if (newTheme['--lecture-event'] === null) return;

    newTheme['--volunt-event'] = await openColorPicker('Farbe für Freiwilliger Termin eingeben:', '#c3a602');
    if (newTheme['--volunt-event'] === null) return;

    newTheme['--exam-event'] = await openColorPicker('Farbe für Klausur eingeben:', '#FF4500');
    if (newTheme['--exam-event'] === null) return;

    newTheme['--holiday-event'] = await openColorPicker('Farbe für Feiertag eingeben:', '#0f7643');
    if (newTheme['--holiday-event'] === null) return;

    newTheme['--other-event'] = await openColorPicker('Farbe für Sonstiger Termin eingeben:', '#191970');
    if (newTheme['--other-event'] === null) return;

    themes[themeName] = newTheme;
    localStorage.setItem('themes', JSON.stringify(themes));

    const themeSelector = document.querySelector('.theme-selector');
    const option = document.createElement('option');
    option.value = themeName;
    option.textContent = themeName;
    themeSelector.appendChild(option);

    themeSelector.value = themeName;
    localStorage.setItem('selectedTheme', themeName);
    applyTheme();
};

const editTheme = async () => {
    const themeSelector = document.querySelector('.theme-selector');
    const selectedTheme = themeSelector.value;

    if (selectedTheme === 'default') {
        alert('Default Theme kann nicht bearbeitet werden!');
        return;
    }

    const themes = JSON.parse(localStorage.getItem('themes'));

    const newTheme = {};
    newTheme['--lecture-event'] = await openColorPicker('Farbe für Vorlesung eingeben:', themes[selectedTheme]['--lecture-event']);
    if (newTheme['--lecture-event'] === null) return;

    newTheme['--volunt-event'] = await openColorPicker('Farbe für Freiwilliger Termin eingeben:', themes[selectedTheme]['--volunt-event']);
    if (newTheme['--volunt-event'] === null) return;

    newTheme['--exam-event'] = await openColorPicker('Farbe für Klausur eingeben:', themes[selectedTheme]['--exam-event']);
    if (newTheme['--exam-event'] === null) return;

    newTheme['--holiday-event'] = await openColorPicker('Farbe für Feiertag eingeben:', themes[selectedTheme]['--holiday-event']);
    if (newTheme['--holiday-event'] === null) return;

    newTheme['--other-event'] = await openColorPicker('Farbe für Sonstiger Termin eingeben:', themes[selectedTheme]['--other-event']);
    if (newTheme['--other-event'] === null) return;

    themes[selectedTheme] = newTheme;
    localStorage.setItem('themes', JSON.stringify(themes));
    applyTheme();
};

const renameTheme = () => {
    const themeSelector = document.querySelector('.theme-selector');
    const selectedTheme = themeSelector.value;
    if (selectedTheme === 'default') {
        alert('Default Theme kann nicht umbenannt werden!');
        return;
    }

    const newThemeName = prompt('Neuen Theme Namen eingeben:');
    if (!newThemeName) return;

    const themes = JSON.parse(localStorage.getItem('themes'));

    if (themes[newThemeName]) {
        alert('Ein Theme mit diesem Namen existiert bereits!');
        return;
    }

    themes[newThemeName] = themes[selectedTheme];
    delete themes[selectedTheme];
    localStorage.setItem('themes', JSON.stringify(themes));

    const option = themeSelector.querySelector(`option[value="${selectedTheme}"]`);
    option.value = newThemeName;
    option.textContent = newThemeName;

    themeSelector.value = newThemeName;
    localStorage.setItem('selectedTheme', newThemeName);
    applyTheme();
};

const deleteTheme = () => {
    const themeSelector = document.querySelector('.theme-selector');
    const selectedTheme = themeSelector.value;
    if (selectedTheme === 'default') {
        alert('Default Theme kann nicht gelöscht werden!');
        return;
    }

    const themes = JSON.parse(localStorage.getItem('themes'));
    delete themes[selectedTheme];
    localStorage.setItem('themes', JSON.stringify(themes));

    themeSelector.removeChild(themeSelector.querySelector(`option[value="${selectedTheme}"]`));
    themeSelector.value = 'default';
    localStorage.setItem('selectedTheme', 'default');
    applyTheme();
};

const openColorPicker = (text, defaultColor, callback) => {
    return new Promise(resolve => {
        var popup = document.createElement("div");
        popup.classList.add("color-picker-popup");

        var exitButton = document.createElement("button");
        exitButton.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
        exitButton.classList.add("exit-button");
        exitButton.onclick = function () {
            document.body.removeChild(popup);
            resolve(null);
        };

        var para = document.createElement("p");
        para.textContent = text;

        var colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.value = defaultColor;

        var submitButton = document.createElement("button");
        submitButton.textContent = "Auswählen";
        submitButton.onclick = function () {
            var selectedColor = colorPicker.value;
            document.body.removeChild(popup);
            resolve(selectedColor);
            if (callback) {
                callback(selectedColor);
            }
        };

        popup.appendChild(exitButton);
        popup.appendChild(para);
        popup.appendChild(colorPicker);
        popup.appendChild(submitButton);

        document.body.appendChild(popup);
    });
};

const createCalendarPopup = async (event) => {
    if (!dayHasEvents(event.target)) {
        return;
    }

    let body = document.querySelector('body');
    let popup = document.createElement('div');
    let popupContent = document.createElement('div');
    let innerPopup = document.createElement('div');
    let closeButton = document.createElement('div');
    let title = document.createElement('h2');

    let clickedElement = event.target;
    let unparsedDate;
    let [year, month, day] = datePicker.value.split('-');

    if (clickedElement.classList.contains('day')) {
        unparsedDate = clickedElement.textContent;
    } else {
        let parentMonthViewCard = clickedElement.closest('.month-view-card');
        unparsedDate = parentMonthViewCard.querySelector('.month-view-day').textContent;
    }

    let parsedDate = new Date(year, month - 1, getDateForPopup(unparsedDate));

    let xmlString = await loadDay(selectedCourse, parsedDate.getDate(), parsedDate.getMonth() + 1, parsedDate.getFullYear());
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltDayUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, innerPopup);
    });

    popup.id = 'calendar-popup';
    popupContent.id = 'calendar-popup-content';
    closeButton.id = 'calendar-popup-close-button';

    popup.classList.add('popup');
    popupContent.classList.add('popup-content');
    closeButton.classList.add('popup-close-button');
    title.classList.add('popup-title');

    closeButton.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
    title.textContent = `Veranstaltungen am ${parsedDate.getDate()}.${parsedDate.getMonth() + 1}.`;

    popup.addEventListener('click', removePopup);
    closeButton.addEventListener('click', removePopup);

    document.body.style.overflow = 'hidden';

    popupContent.appendChild(closeButton);
    popupContent.appendChild(title);
    popupContent.appendChild(innerPopup);
    popup.appendChild(popupContent);
    body.appendChild(popup);
}

const createKeyboardShortcutsPopup = () => {
    let popup = document.createElement('div');
    popup.classList.add('popup');
    popup.id = 'kbshortcuts-popup';
    popup.addEventListener('click', removePopup);

    let popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');
    popupContent.id = 'kbshortcuts-popup-content';

    let popupTitle = document.createElement('div');
    popupTitle.classList.add('popup-title');
    popupTitle.textContent = keyboardShortcuts.title;

    let closeButtonContainer = document.createElement('div');
    closeButtonContainer.classList.add('popup-close-button');

    let closeButton = document.createElement('ion-icon');
    closeButton.id = 'kbshortcuts-close-button';
    closeButton.setAttribute('name', 'close-outline');
    closeButton.addEventListener('click', removePopup);

    closeButtonContainer.appendChild(closeButton);

    let kbInfo = document.createElement('div');
    kbInfo.classList.add('kbinfo');
    kbInfo.textContent = keyboardShortcuts.info;

    let categoriesContainer = document.createElement('div');
    categoriesContainer.classList.add('kbcategories');

    keyboardShortcuts.categories.forEach(categoryData => {
        let category = document.createElement('div');
        category.classList.add('kbcategory');

        let categoryTitle = document.createElement('div');
        categoryTitle.classList.add('kbcategory-title');
        categoryTitle.textContent = categoryData.title;

        let categoryContent = document.createElement('div');
        categoryContent.classList.add('kbcategory-content');

        categoryData.shortcuts.forEach(shortcutData => {
            let shortcut = document.createElement('div');
            shortcut.classList.add('kbshortcut');

            let iconContainer = document.createElement('div');
            iconContainer.classList.add('kbicon');

            let icon = document.createElement('img');
            icon.src = shortcutData.icon;

            iconContainer.appendChild(icon);

            let description = document.createElement('div');
            description.classList.add('kbdescr');
            description.textContent = shortcutData.description;

            if (shortcutData.tooltip) {
                let tooltip = document.createElement('span');
                tooltip.classList.add('tooltip');
                tooltip.textContent = shortcutData.tooltip;
                description.appendChild(tooltip);
            }

            shortcut.appendChild(iconContainer);
            shortcut.appendChild(description);
            categoryContent.appendChild(shortcut);
        });

        category.appendChild(categoryTitle);
        category.appendChild(categoryContent);
        categoriesContainer.appendChild(category);
    });

    popupContent.appendChild(popupTitle);
    popupContent.appendChild(closeButtonContainer);
    popupContent.appendChild(kbInfo);
    popupContent.appendChild(categoriesContainer);
    popup.appendChild(popupContent);
    document.body.appendChild(popup);

    document.body.style.overflow = 'hidden';
}

const removePopup = (event) => {
    let popup = event.target.closest('.popup');
    let popupContent = popup.querySelector('.popup-content');
    let closeButton = popup.querySelector('.popup-close-button>ion-icon');

    if (event.target === popup || event.target === closeButton || event.key === 'Escape') {
        popupContent.style.animation = 'popup-close-animation 0.5s forwards';
        popup.style.animation = 'fade-out 0.5s forwards';

        setTimeout(() => {
            try {
                popup.parentNode.removeChild(popup);
                document.body.style.overflow = 'auto';
            } catch { }
        }, 500);
    }
}

const updateCalendar = () => {
    if (isWeekView()) {
        updateWeekView();
    } else if (isMonthView()) {
        updateMonthView();
    }
}

const getFirefoxResult = (resultHTML) => {
    return resultHTML
        .replaceAll('<transformiix:result xmlns:transformiix="http://www.mozilla.org/TransforMiix">', '')
        .replaceAll('</transformiix:result>', '')
        .replaceAll('xmlns="http://www.w3.org/1999/xhtml"', '');
}

const loadXML = (url, callback) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                callback(xhr.responseXML);
            } else {
                console.error('Fehler beim Laden der XML-Datei');
            }
        }
    };
    xhr.open('GET', url, true);
    xhr.send();
}

const applyXSLT = (xml, xslt, container) => {
    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xslt);
    const resultDocument = xsltProcessor.transformToDocument(xml);
    const resultHTML = new XMLSerializer().serializeToString(resultDocument);
    container.insertAdjacentHTML('beforeend', isFirefox ? getFirefoxResult(resultHTML) : resultHTML);
}

const checkCurrentView = () => {
    const viewElem = document.querySelector('.header-top>h2').textContent;
    let prevSelectedView = {
        'Monatsansicht': 'month',
        'Wochenansicht': 'week'
    }[viewElem];

    return prevSelectedView;
}

const setView = (view) => {
    const monthView = document.querySelector('.month-view-wrap');
    const weekView = document.querySelector('.week-view-wrap');
    const headerTitle = document.querySelector('.header-top>h2');

    if (view === checkCurrentView()) {
        return;
    }

    if (view === 'month') {
        weekView.style.display = 'none';
        monthView.style.display = 'flex';
        headerTitle.textContent = 'Monatsansicht';
    } else if (view === 'week') {
        monthView.style.display = 'none';
        weekView.style.display = 'block';
        headerTitle.textContent = 'Wochenansicht';
    }

    setCourse();
}

const setCourse = () => {
    selectedCourse = courseInputElem.value;
    if (selectedCourse && selectedCourse !== 'Kurs auswählen') {
        document.title = `DHBW ${selectedCourse} Kalender`;
        if (localStorage.getItem('isCheckboxChecked') === 'true') {
            window.localStorage.setItem('previouslySelectedCourse', selectedCourse);
        }
    }
    updateCalendar();
}

const isWeekday = date => date.getDay() % 6 !== 0;

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    let weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    return [d.getUTCFullYear(), weekNo];
}

const formatDateAsDayMonth = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.`;
}

const setCalendarWeek = () => {
    let calWeek = getWeekNumber(new Date(datePicker.value));
    document.querySelector('.week-number').textContent = `KW ${calWeek[1]}`;
}

const getDayDates = () => {
    const inputDate = datePicker.valueAsDate;

    // Find the Monday of the week
    const dayOfWeek = inputDate.getDay();
    const monday = new Date(inputDate);
    const diffToMonday = (dayOfWeek + 6) % 7; // Calculate days to Monday
    monday.setDate(inputDate.getDate() - diffToMonday);

    const weekdays = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekdays.push(formatDateAsDayMonth(date));
    }

    return weekdays;
}

const setDayDates = () => {
    let days = document.querySelectorAll('li.day');
    let index = 0;

    days.forEach((elem) => {
        elem.textContent = `${elem.textContent.split(' ')[0]} ${getDayDates()[index]}`;
        index++;
    });
}

const prepareCalendar = () => {
    setCalendarWeek();
    setDayDates();
}

const toggleBeatLoader = () => {
    let beatLoaderContainer = document.querySelector('.loader-container');

    if (beatLoaderContainer) {
        removeLoader();
        monthViewWrap.style.display = 'flex';
    } else {
        insertLoaderBefore(document.querySelector('.month-view-wrap'));
        monthViewWrap.style.display = 'none';
    }
}

const determineWeekDays = (elem) => {
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
        weekDates = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    } else {
        weekDates = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.'];
    }

    return weekDates[elem.id];
}

const showDropdown = (element) => { // not supported by all browsers, technically deprecated (probably just safari)
    let event;
    event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window);
    element.dispatchEvent(event);
};

const changeMonth = (months) => {
    let date = new Date(datePicker.value);
    date.setMonth(date.getMonth() + months);
    datePicker.value = date.toISOString().split('T')[0];

    updateCalendar();
}

const debounce = (func, delay) => {
    return (...args) => {
        if (keyPressTimeout) clearTimeout(keyPressTimeout);
        keyPressTimeout = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

const handleKeyPress = (event) => {
    if (document.querySelector('.color-picker-popup')) {
        return;
    }

    let foodMenuPopup = document.getElementById('food-menu-popup');
    let kbshortcutsPopup = document.getElementById('kbshortcuts-popup');
    let calendarPopup = document.getElementById('calendar-popup');
    let settingsPopup = document.getElementById('settings-popup');

    let activePopup = foodMenuPopup ? foodMenuPopup :
        kbshortcutsPopup ? kbshortcutsPopup :
            calendarPopup ? calendarPopup :
                settingsPopup ? settingsPopup : null;

    if (activePopup) {
        if (event.key === 'Escape') {
            let customEvent = new Event('escape', { bubbles: true, cancelable: true });
            activePopup.dispatchEvent(customEvent);
            removePopup({ target: activePopup });
        }

        return;
    }

    if (document.querySelector('.week-view-wrap').style.display !== 'none') {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            changeDate(-7);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            changeDate(7);
        }
    } else if (document.querySelector('.month-view-wrap').style.display !== 'none') {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            changeMonth(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            changeMonth(1);
        }
    }

    if (event.key === 'w') {
        event.preventDefault();
        setView('week');
    } else if (event.key === 'm') {
        event.preventDefault();
        setView('month');
    } else if (event.key === 'f') {
        event.preventDefault();
        showMenu();
    } else if (event.key === 'h') {
        event.preventDefault();
        createKeyboardShortcutsPopup();
    } else if (event.key === 'c') {
        showDropdown(courseInputElem);
    } else if (event.key === 't') {
        setDateToToday();
    }
};

const updateWeekView = async () => {
    prepareCalendar();

    if (!selectedCourse || selectedCourse === 'Kurs auswählen') {
        return;
    }

    const date = datePicker.value;
    const [year, month, day] = date.split('-');

    removeWeekCalendar();

    let xmlString = await loadWeek(selectedCourse, day, month, year);

    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltWeekUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, document.querySelector('.calendar'));

        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach((day) => {
            if (dayHasEvents(document.querySelector(`li.${day}`))) {
                document.querySelector(`li.${day}`).style.cursor = 'pointer';
            }
        });
    });

}

const makeCancelable = (promise) => {
    let hasCanceled_ = false;

    const wrappedPromise = new Promise((resolve, reject) => {
        promise.then((val) =>
            hasCanceled_ ? reject({ isCanceled: true }) : resolve(val)
        );
        promise.catch((error) =>
            hasCanceled_ ? reject({ isCanceled: true }) : reject(error)
        );
    });

    return {
        promise: wrappedPromise,
        cancel() {
            hasCanceled_ = true;
        },
    };
}

const updateMonthView = async () => {
    if (currentRequest) {
        currentRequest.cancel();
    }

    const date = datePicker.value;
    const [year, month, day] = date.split('-');

    removeMonthCalendar();
    toggleBeatLoader();

    const loadMonthPromise = makeCancelable(loadMonth(selectedCourse || '', month, year));
    currentRequest = loadMonthPromise;

    try {
        let xmlString = await loadMonthPromise.promise;

        // Parse the XML string into an XML document
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(xmlString, "text/xml");

        toggleBeatLoader();

        loadXML(xsltMonthUrl, function (xslt) {
            applyXSLT(xmlDoc, xslt, document.querySelector('.month-view-body'));
        });
    } catch (error) {
        if (!error.isCanceled) {
            console.error('An error occurred:', error);
        }
    } finally {
        currentRequest = null;
    }
};

const removeWeekCalendar = () => {
    document.querySelectorAll('.calendar > li.event').forEach((elem) => {
        elem.parentNode.removeChild(elem);
    });
}

const removeMonthCalendar = () => {
    document.querySelectorAll('.month-view-card').forEach((elem) => {
        elem.parentNode.removeChild(elem);
    });
}

const loadDay = async (course, day, month, year) => {
    const response = await fetch('http://localhost:6059/api/get_day/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/xml',
        },
        body: JSON.stringify({
            course: course,
            day: day,
            month: month,
            year: year,
        }),
    });
    const data = await response.text();
    return data;
}

const loadMenu = async () => {
    const response = await fetch('http://localhost:6059/api/get_menu/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/xml',
        }
    });
    const data = await response.text();
    return data;
}

const loadWeek = async (course, day, month, year) => {
    const response = await fetch('http://localhost:6059/api/get_week/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/xml',
        },
        body: JSON.stringify({
            course: course,
            day: day,
            month: month,
            year: year,
        }),
    });
    const data = await response.text();
    return data;
}

const loadMonth = async (course, month, year) => {
    const response = await fetch('http://localhost:6059/api/get_month/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/xml',
        },
        body: JSON.stringify({
            course: course,
            month: month,
            year: year,
        }),
    });
    const data = await response.text();
    return data;
}

const changeDate = (days) => {
    let date = new Date(datePicker.value);
    date.setDate(date.getDate() + days);
    datePicker.value = date.toISOString().split('T')[0];

    updateCalendar();
}

const getAvailableCourses = () => {
    return new Promise((resolve, reject) => {
        $.getJSON("assets/json/courses.json", function (json) {
            resolve(json);
        });
    });
}

const getKeyboardShortcuts = () => {
    return new Promise((resolve, reject) => {
        $.getJSON("assets/json/keyboard-shortcuts.json", function (json) {
            resolve(json);
        });
    });
}

const createDropdown = () => {
    // Initialize variables for checking year
    let currentYear = new Date().getFullYear();
    let lastYear = currentYear;

    // Add options to the dropdown
    for (let key in courses) {
        if (courses.hasOwnProperty(key)) {
            // Extract year from key
            let year = parseInt(key.substring(4, 6));

            // If it's a new year, add a disabled option with the year as label
            if (year < lastYear) {
                let yearOption = document.createElement("option");
                yearOption.text = (2000 + year).toString();
                yearOption.disabled = true;
                courseInputElem.add(yearOption);
            }

            // Add the option itself
            let optionElement = document.createElement("option");
            optionElement.text = key;
            courseInputElem.add(optionElement);

            lastYear = year;
        }
    }
}

const setDateToToday = () => {
    datePicker.valueAsDate = new Date();
    updateCalendar();
}

const buttonClick = (direction) => {
    if (isWeekView()) {
        changeDate(7 * direction);
    } else if (isMonthView()) {
        changeMonth(1 * direction);
    }
}

// event listeners
// window.addEventListener('resize', updateWeekDates);
document.addEventListener('keydown', debounce(handleKeyPress, 300));
document.getElementById('date-picker').addEventListener('change', updateCalendar);
document.getElementById('prev-btn').addEventListener('click', debounce(() => { buttonClick(-1); }, 300));
document.getElementById('next-btn').addEventListener('click', debounce(() => { buttonClick(1); }, 300));
document.getElementById('today-btn').addEventListener('click', setDateToToday);
courseInputElem.addEventListener('change', () => { courseInputElem.blur() });

document.querySelectorAll('li.day').forEach((elem) => {
    elem.addEventListener('click', createCalendarPopup);
});

document.addEventListener('DOMContentLoaded', async () => {
    keyboardShortcuts = await getKeyboardShortcuts();
    courses = await getAvailableCourses();

    for (let i = 0; i < 205; i++) { // per quarter hour 5, per hour 20 li elements
        let li = document.createElement('li');

        if ((i % 20) >= 15 && (i % 20) < 20) {
            li.classList.add('border-li');
        }

        document.querySelector('.calendar').appendChild(li);
    }

    document.querySelectorAll('.month-view-head-day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    document.querySelectorAll('.day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    let currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 2);

    document.getElementById('date-picker').valueAsDate = currentDate;

    prepareCalendar();
    createDropdown();

    const selectedTheme = localStorage.getItem('selectedTheme') || 'default';
    applyTheme(selectedTheme);

    let previouslySelectedCourse = window.localStorage.getItem('previouslySelectedCourse');
    if (previouslySelectedCourse) {
        courseInputElem.value = previouslySelectedCourse;
        setCourse();
    } else {
        courseInputElem.selectedIndex = 0;
    }

    await loadMonth(courseInputElem, currentDate.getMonth() + 1, currentDate.getFullYear());

});
