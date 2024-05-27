var weekDates = [];
var weekDays = {};
const defaultTitle = 'Kurs auswählen';
let selectedCourse = null;
const xmlCalUrl = 'assets/xml/calendar-data.xml';
const xmlMonthUrl = 'assets/xml/month-data.xml';
const xsltWeekUrl = 'assets/xml/calendar-week-block.xslt';
const xsltMonthUrl = 'assets/xml/calendar-month-block.xslt';
const courseInputElem = document.getElementById('course-input');

const setTitle = (title) => {
    document.querySelector('h1').textContent = title;
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
    container.innerHTML += resultHTML;
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
        monthView.style.display = 'block';
    } else if (elem.classList.contains('week-view')) {
        monthView.style.display = 'none';
        weekView.style.display = 'block';
    }
}

const checkCourseInput = () => {
    let input = document.getElementById('course-input');
    let val = input.value;

    let msgElem = document.querySelector('.course-msg');

    if (val.length === 8) {
        let regex = /TINF\d\dB\d/i;
        let validInput = regex.test(val);

        if (validInput) {
            let maxYear = + new Date().getFullYear().toString().substr(-2);
            let minYear = maxYear - 3;

            let match;
            let yearRegex = /\d+/;
            match = val.match(yearRegex);

            let enteredYear = + match[0];

            let courseRegex = /\d$/;
            match = val.match(courseRegex);

            let enteredCourse = + match[0];

            if (minYear <= enteredYear &&
                enteredYear <= maxYear &&
                1 <= enteredCourse &&
                enteredCourse <= 6) {

                input.classList.add('valid-input');
                msgElem.style.color = 'var(--green)';
                msgElem.textContent = 'Kurs gültig.';
                return;
            }
        }

        input.classList.add('invalid-input');
        msgElem.style.color = 'var(--red)';
        msgElem.textContent = 'Kurs ungültig. Bitte gültigen Kursnamen eingeben.';
    } else {
        input.classList.remove('valid-input');
        input.classList.remove('invalid-input');
        msgElem.style.color = '#fff';
        msgElem.textContent = '';
    }
}

const setCourse = (event) => {
    if (event.key === 'Enter') {
        observedCourse.course = courseInputElem.value.toUpperCase();
        setTitle(courseInputElem.classList.contains('valid-input') ? `${observedCourse.course} Kalender` : defaultTitle);

        // get calendar for new course
    }

}

const isWeekday = date => date.getDay() % 6 !== 0;

const getMonthStructXML = () => {
    let todayDate = new Date();
    let firstDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    var lastDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    let firstDay = firstDate.getDay();
    let lastDay = lastDate.getDate();

    let todaysDay = todayDate.getDate();

    let month = ("0" + (todayDate.getMonth() + 1)).slice(-2);
    let year = todayDate.getFullYear();

    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlString += '<days>';

    for (let i = 1; i < firstDay; i++) {
        xmlString += '<day><day></day><show>false</show><today>false</today></day>';
    }

    for (let i = 1; i <= lastDay; i++) {
        let day = ("0" + i).slice(-2);

        if (isWeekday(new Date(`${year}-${month}-${day}`))) {
            let show = true;
            let today = day == todaysDay ? true : false;
            xmlString += `<day><day>${i}</day><show>${show}</show><today>${today}</today></day>`;
        }
    }

    for (let i = 0; i < 25; i++) {
        if (!xmlString.includes('<day>')) {
            xmlString += '<day><day></day><show>false</show><today>false</today></day>';
        }
    }

    xmlString += '</days>';

    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

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

const handleKeyPress = (event) => {
    if (document.activeElement === document.querySelector('#course-input')) {
        // key shortcuts if input course is active
    } else {
        if (event.key === 'w') {
            event.preventDefault();
            setView(document.querySelector('.week-view'));
        } else if (event.key === 'm') {
            event.preventDefault();
            setView(document.querySelector('.month-view'));
        }
    }
};

// Create a proxy to observe changes to selectedCourse
const handler = {
    set: function (target, property, value, receiver) {
        target[property] = value;
        if (property === 'course') {
            if (courseInputElem.classList.contains('valid-input')) {
                onSelectedCourseChange(); // Call the function when selectedCourse changes
            } else {
                removeCalendar(); // Remove the calendar when the course is invalid
            }
        }
        return true;
    }
};

const updateWeekView = async () => {
    const dateControl = document.querySelector('input#date-picker[type="date"]');
    const date = dateControl.value;
    const [year, month, day] = date.split('-');

    removeCalendar();

    let xmlString = await loadWeek(observedCourse.course, day, month, year);

    // Parse the XML string into an XML document
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    loadXML(xsltWeekUrl, function (xslt) {
        applyXSLT(xmlDoc, xslt, document.querySelector('.calendar'));
    });
}

const observedCourse = new Proxy({ course: selectedCourse }, handler);

const onSelectedCourseChange = () => {
    updateWeekView();
}

const removeCalendar = () => {
    document.querySelectorAll('.calendar li.event').forEach((elem) => {
        document.querySelector('.calendar').removeChild(elem);
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

setTitle(defaultTitle);

document.addEventListener('keydown', handleKeyPress);
document.getElementById('date-picker').addEventListener('change', updateWeekView);

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < 225; i++) {
        let li = document.createElement('li');
        document.querySelector('.calendar').appendChild(li);
    }

    loadXML(xsltMonthUrl, function (xslt) {
        applyXSLT(getMonthStructXML(), xslt, document.querySelector('.month-view-body'));
    });

    document.querySelectorAll('.month-view-head-day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    document.querySelectorAll('.day').forEach((elem) => {
        elem.textContent = determineWeekDays(elem);
    });

    document.getElementById('date-picker').valueAsDate = new Date();
});
