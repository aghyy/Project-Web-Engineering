// defining global variables
var weekDates = [];
var courses = {};
var selectedCourse;
var currentRequest = null;
// setting default values
const defaultDocumentTitle = 'DHBW Kalender';
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
// setting xslt urls
const xsltDayUrl = 'assets/xslt/calendar-day-block.xslt';
const xsltWeekUrl = 'assets/xslt/calendar-week-block.xslt';
const xsltMonthUrl = 'assets/xslt/calendar-month-block.xslt';
// getting elements
const courseInputElem = document.getElementById('course-input');
const datePicker = document.getElementById('date-picker');
const monthViewWrap = document.querySelector('.month-view-wrap');
const weekViewWrap = document.querySelector('.week-view-wrap');

// checking views
const isMonthView = () => monthViewWrap.style.display !== 'none';
const isWeekView = () => weekViewWrap.style.display !== 'none';

// functions
const getDateForPopup = (inputString) => {
    const match = inputString.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

const createPopup = async (event) => {
    let body = document.querySelector('body');
    let popupBackground = document.createElement('div');
    let popup = document.createElement('div');
    let popupContent = document.createElement('div');
    let closeButton = document.createElement('div');

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
    
    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltDayUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, document.querySelector('.popup-content'));
    });

    popupBackground.classList.add('popup-background');
    popup.classList.add('popup');
    popupContent.classList.add('popup-content');
    closeButton.classList.add('popup-close-button');

    closeButton.innerHTML = '<ion-icon name="close-outline"></ion-icon>';

    popupBackground.addEventListener('click', removePopup);
    closeButton.addEventListener('click', removePopup);

    document.body.style.overflow = 'hidden';

    popup.appendChild(closeButton);
    popup.appendChild(popupContent);
    popupBackground.appendChild(popup);
    body.appendChild(popupBackground);
}

const removePopup = (event) => {
    let popupBackground = document.querySelector('.popup-background');
    let popup = document.querySelector('.popup');
    let closeButton = document.querySelector('.popup-close-button>ion-icon');

    if (event.target === popupBackground || event.target === closeButton || event.key === 'Escape') {
        popup.style.animation = 'popup-close-animation 0.5s forwards';
        popupBackground.style.animation = 'fade-out 0.5s forwards';
        
        setTimeout(() => {
            try {
                popupBackground.parentNode.removeChild(popupBackground);
                document.body.style.overflow = 'auto';
            } catch {}
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

const setView = (elem) => {
    const prevSelectedView = document.querySelector('.view-option.active-view');
    const monthView = document.querySelector('.month-view-wrap');
    const weekView = document.querySelector('.week-view-wrap');
    const headerTitle = document.querySelector('.header-top>h2');

    if (elem === prevSelectedView) {
        return;
    }

    prevSelectedView.classList.remove('active-view');
    elem.classList.add('active-view');

    if (elem.classList.contains('month-view')) {
        weekView.style.display = 'none';
        monthView.style.display = 'flex';
        headerTitle.textContent = 'Monatsansicht';
    } else if (elem.classList.contains('week-view')) {
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

    if (beatLoaderContainer.style.display === 'flex') {
        beatLoaderContainer.style.display = 'none';
        monthViewWrap.style.display = 'flex';
    } else {
        beatLoaderContainer.style.display = 'flex';
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

// const updateWeekDates = () => {
//     if (window.matchMedia("(max-width: 450px)").matches) {
//         weekDates = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.'];
//     } else {
//         weekDates = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
//     }
//     // You can do something with weekDates here, like updating the UI
// }

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

const handleKeyPress = (event) => {
    if (document.querySelector('.popup-background')) {
        if (event.key === 'Escape') {
            removePopup(event);
        }
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
        setView(document.querySelector('.week-view'));
    } else if (event.key === 'm') {
        event.preventDefault();
        setView(document.querySelector('.month-view'));
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
    console.log(data);
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

// event listeners
// window.addEventListener('resize', updateWeekDates);
document.addEventListener('keydown', handleKeyPress);
document.getElementById('date-picker').addEventListener('change', updateCalendar);

document.querySelectorAll('li.day').forEach((elem) => {
    elem.addEventListener('click', createPopup);
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (isWeekView()) {
        changeDate(-7);
    } else if (isMonthView()) {
        changeMonth(-1);
    }
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (isWeekView()) {
        changeDate(7);
    } else if (isMonthView()) {
        changeMonth(1);
    }
});

document.getElementById('today-btn').addEventListener('click', () => {
    setDateToToday();
});

courseInputElem.addEventListener('change', () => {
    courseInputElem.blur();
});

document.addEventListener('DOMContentLoaded', async () => {
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

    createDropdown();
    document.querySelector('#course-input').selectedIndex = 0;

    let currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 2);
    // let adjustedDate = currentDate.toISOString().split('T')[0];

    document.getElementById('date-picker').valueAsDate = currentDate;

    prepareCalendar();

    loadMenu();
});
