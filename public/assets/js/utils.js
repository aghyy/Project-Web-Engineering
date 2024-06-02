// defining global variables
var weekDates = [];
var courses = {};
var selectedCourse;
// setting default values
const defaultTitle = 'Kurs auswählen';
const defaultDocumentTitle = 'DHBW Kalender';
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
// setting xslt urls
const xsltWeekUrl = 'assets/xslt/calendar-week-block.xslt';
const xsltMonthUrl = 'assets/xslt/calendar-month-block.xslt';
// getting elements
const courseInputElem = document.getElementById('course-input');
const datePicker = document.getElementById('date-picker');

// checking views
const isWeekView = () => document.querySelector('.week-view-wrap').style.display !== 'none';
const isMonthView = () => document.querySelector('.month-view-wrap').style.display !== 'none';

// functions
const setTitle = (title) => {
    document.querySelector('h1').textContent = title;
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
    container.innerHTML += isFirefox ? getFirefoxResult(resultHTML) : resultHTML;
}

const setView = (elem) => {
    const prevSelectedView = document.querySelector('.view-option.active-view');
    const monthView = document.querySelector('.month-view-wrap');
    const weekView = document.querySelector('.week-view-wrap');

    if (elem === prevSelectedView) {
        return;
    }

    prevSelectedView.classList.remove('active-view');
    elem.classList.add('active-view');

    if (elem.classList.contains('month-view')) {
        weekView.style.display = 'none';
        monthView.style.display = 'flex';
    } else if (elem.classList.contains('week-view')) {
        monthView.style.display = 'none';
        weekView.style.display = 'block';
    }

    setCourse();
}

const setCourse = () => {
    selectedCourse = courseInputElem.value;
    setTitle(`${selectedCourse} Kalender`);
    document.title = `DHBW ${selectedCourse} Kalender`;
    if (isWeekView()) {
        updateWeekView();
    } else if (isMonthView()) {
        updateMonthView();
    }
}

const isWeekday = date => date.getDay() % 6 !== 0;

const getWeekNumber = (d) => {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    let weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
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

const getMonthStructXML = (monthDate) => {
    let firstDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    let lastDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    let firstDay = firstDate.getDay();
    let lastDay = lastDate.getDate();

    let month = ("0" + (monthDate.getMonth() + 1)).slice(-2);
    let year = monthDate.getFullYear();

    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlString += '<calendar>';

    for (let i = 1; i < firstDay; i++) {
        xmlString += '<day><day></day><show>false</show><today>false</today></day>';
    }

    for (let i = 1; i <= lastDay; i++) {
        let day = ("0" + i).slice(-2);

        if (isWeekday(new Date(`${year}-${month}-${day}`))) {
            let show = true;
            let today = new Date(`${year}-${month}-${day}`).toDateString() == new Date().toDateString();
            xmlString += `<day><day>${i}</day><show>${show}</show><today>${today}</today></day>`;
        }
    }

    // Ensure there are 25 days listed
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString + '</calendar>', "text/xml");
    let dayTags = xmlDoc.querySelectorAll("calendar > day");

    let additionalDaysNeeded = 25 - dayTags.length;

    for (let i = 0; i < additionalDaysNeeded; i++) {
        xmlString += '<day><day></day><show>false</show><today>false</today></day>';
    }

    xmlString += '</calendar>';

    xmlDoc = parser.parseFromString(xmlString, "text/xml");

    return xmlDoc;
}

const determineWeekDays = (elem) => {
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
        weekDates = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    } else {
        weekDates = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.'];
    }

    return weekDates[elem.id];
}

const showDropdown = (element) => { // not supported by all browsers, technically deprecated
    let event;
    event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window);
    element.dispatchEvent(event);
};

const handleKeyPress = (event) => {
    if (document.querySelector('.week-view-wrap').style.display !== 'none') {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            changeDate(-7);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            changeDate(7);
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

    if (selectedCourse === 'Kurs auswählen') {
        return;
    }

    const date = datePicker.value;
    const [year, month, day] = date.split('-');

    removeCalendar();

    let xmlString = await loadWeek(selectedCourse, day, month, year);

    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltWeekUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, document.querySelector('.calendar'));
    });
}

const updateMonthView = async () => {
    if (selectedCourse === 'Kurs auswählen') {
        return;
    }

    document.querySelectorAll('.month-view-card').forEach((elem) => {
        elem.parentNode.removeChild(elem);
    });

    const date = datePicker.value;
    const [year, month, day] = date.split('-');

    let xmlString = await loadMonth(selectedCourse, month, year);

    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltMonthUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, document.querySelector('.month-view-body'));
    });
}

const removeCalendar = () => {
    document.querySelectorAll('.calendar > li.event').forEach((elem) => {
        elem.parentNode.removeChild(elem);
    });
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

    isWeekView() && updateWeekView();
    isMonthView() && updateMonthView();
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
    updateWeekView();
}

// event listeners
document.addEventListener('keydown', handleKeyPress);
document.getElementById('date-picker').addEventListener('change', updateWeekView);

document.getElementById('prev-btn').addEventListener('click', () => {
    changeDate(-7);
});

document.getElementById('next-btn').addEventListener('click', () => {
    changeDate(7);
});

document.getElementById('today-btn').addEventListener('click', () => {
    setDateToToday();
});

courseInputElem.addEventListener('change', function () {
    courseInputElem.blur();
});

document.addEventListener('DOMContentLoaded', async () => {
    courses = await getAvailableCourses();

    setTitle(defaultTitle);

    for (let i = 0; i < 205; i++) { // per quarter hour 5, per hour 20 li elements
        let li = document.createElement('li');
        document.querySelector('.calendar').appendChild(li);
    }

    loadXML(xsltMonthUrl, function (xslt) {
        applyXSLT(getMonthStructXML(new Date()), xslt, document.querySelector('.month-view-body'));
    });

    document.querySelectorAll('.month-view-head-day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    document.querySelectorAll('.day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    let currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 2);
    let adjustedDate = currentDate.toISOString().split('T')[0];

    document.getElementById('date-picker').valueAsDate = adjustedDate;

    createDropdown();

    document.querySelector('#course-input').selectedIndex = 0;

    prepareCalendar();
});
