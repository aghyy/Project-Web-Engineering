// defining global variables
var weekDates = [];
var weekDays = {};
var courses = {};
var selectedCourse;
// setting default values
const defaultTitle = 'Kurs auswählen';
const defaultDocumentTitle = 'DHBW Kalender';
// setting xslt urls
const xsltWeekUrl = 'assets/xml/calendar-week-block.xslt';
const xsltMonthUrl = 'assets/xml/calendar-month-block.xslt';
// getting elements
const courseInputElem = document.getElementById('course-input');
const datePicker = document.getElementById('date-picker');

// functions
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

const setCourse = () => {
    selectedCourse = courseInputElem.value.toUpperCase();
    setTitle(`${selectedCourse} Kalender`);
    document.title = `DHBW ${selectedCourse} Kalender`;
    onSelectedCourseChange();
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

const updateWeekView = async () => {
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

const onSelectedCourseChange = () => {
    updateWeekView();
}

const removeCalendar = () => {
    document.querySelectorAll('.calendar li.event').forEach((elem) => {
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

const changeDate = (days) => {
    let date = new Date(datePicker.value);
    date.setDate(date.getDate() + days);
    datePicker.value = date.toISOString().split('T')[0];

    updateWeekView();
}

const getAvailableCourses = () => {
    return new Promise((resolve, reject) => {
        $.getJSON("assets/json/courses.json", function (json) {
            resolve(json);
        });
    });
}

const createDropdown = () => {
    // Get the dropdown element
    var dropdown = document.getElementById("course-input");

    // Initialize variables for checking year
    var currentYear = new Date().getFullYear();
    var lastYear = currentYear;

    // Add options to the dropdown
    for (var key in courses) {
        if (courses.hasOwnProperty(key)) {
            // Extract year from key
            var year = parseInt(key.substring(4, 6));

            // If it's a new year, add a disabled option with the year as label
            if (year < lastYear) {
                var yearOption = document.createElement("option");
                yearOption.text = (2000 + year).toString();
                yearOption.disabled = true;
                dropdown.add(yearOption);
            }

            // Add the option itself
            var optionElement = document.createElement("option");
            optionElement.text = key;
            dropdown.add(optionElement);

            lastYear = year;
        }
    }
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
    datePicker.valueAsDate = new Date();

    updateWeekView();
});

document.addEventListener('DOMContentLoaded', async () => {
    courses = await getAvailableCourses();

    setTitle(defaultTitle);

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

    createDropdown();

    document.querySelector('#course-input').selectedIndex = 0;
});
