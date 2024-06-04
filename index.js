const express = require("express");
const path = require("path");
const reload = require("reload");
const axios = require("axios");
const jsdom = require("jsdom");
const js2xmlparser = require("js2xmlparser");
const fs = require("fs");
const bodyParser = require('body-parser');
const app = express();
const PORT = 6059;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

app.post('/api/get_week/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	const xmlData = await getXmlForWeek(req.body.course, req.body.day, req.body.month, req.body.year);
	res.send(xmlData);
});

app.post('/api/get_month/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	let fullXml = [];
	let day = 1;
	for (let i = 0; i < 6; i++) {
		const xmlData = await getXmlForMonth(req.body.course, req.body.month, req.body.year, day);
		fullXml.push(xmlData);

		day += 7;
	}

	res.send(parseMonthToXml(fullXml, req.body.month, req.body.year));
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
};

const users = JSON.parse(fs.readFileSync('public/assets/json/courses.json', 'utf8'));

const scrapeHtml = async (courseName, day, month, year) => {
	// HTTP GET request in Axios
	return await axios.request({
		method: "GET",
		url: `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${users[courseName]}&file=${courseName}&day=${day}&month=${month}&year=${year}`,
		headers: headers
	});
}

const mapWeekDay = (germanDay) => {
	const dayMapping = {
		'Mo': 'mon',
		'Di': 'tue',
		'Mi': 'wed',
		'Do': 'thu',
		'Fr': 'fri'
	};

	return dayMapping[germanDay] || null;  // Return null if the input is not a valid key
}

const isWeekend = (year, month, day) => {
	const date = new Date(year, month - 1, day);
	const dayOfWeek = date.getDay();
	return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
}

const getDateOfSpecificDayInWeek = (year, month, randomDay, dayName) => {
	const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	const monthIndex = month - 1;
	const dayIndex = dayNames.indexOf(dayName.toLowerCase());
	const randomDate = new Date(year, monthIndex, randomDay);
	const randomDayOfWeek = randomDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
	let difference = dayIndex - randomDayOfWeek;

	if (difference < 0) {
		difference += 7;
	}

	const desiredDate = randomDay + difference;

	return new Date(year, monthIndex, desiredDate);
}

const createSubarrays = (array) => {
	const subarrays = [];
	for (let i = 0; i < array.length; i += 5) {
		subarrays.push(array.slice(i, i + 5));
	}
	return subarrays;
}

const getWeekDaysOfMonth = (month, year) => {
	const weekdays = [];
	const date = new Date(year, month - 1, 1);

	// Add weekdays of the previous month until the beginning of the week
	while (date.getDay() !== 1) { // 1 is Monday
		date.setDate(date.getDate() - 1);
	}

	// Populate weekdays array with dates that are not Saturday (6) or Sunday (0)
	while (weekdays.length < 30) { // 6 weeks x 5 weekdays = 30
		const dayOfWeek = date.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 is Sunday, 6 is Saturday
			let monthAbbreviation = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
			weekdays.push(date.getDate() + '-' + monthAbbreviation);
		}
		date.setDate(date.getDate() + 1);
	}

	// Create subarrays using the provided function
	const result = createSubarrays(weekdays);

	return result;
}

const checkEmptyObjects = (arr) => {
	return arr.every(obj => Object.keys(obj).length === 0);
}

const parseWeekToXml = (listOfLectureCurrentWeek) => {
	const daysOfWeek = ["mon", "tue", "wed", "thu", "fri"];

	let lessonsByDay = {}; // Object to accumulate lessons for each day

	// Group lessons by day
	daysOfWeek.forEach(day => {
		lessonsByDay[day] = listOfLectureCurrentWeek.filter(obj => obj.week_day === day).map(lesson => ({
			name: lesson.name,
			person: lesson.person,
			room: lesson.room,
			total_time: lesson.total_time,
			begin: lesson.begin,
			end: lesson.end,
			holiday: lesson.holiday,
			exam: lesson.exam,
			lecture: lesson.lecture,
			other_event: lesson.other_event,
			voluntary: lesson.voluntary
		}));
	});

	let daysXml = daysOfWeek.map(day => ({
		"@": {
			id: day
		},
		lesson: lessonsByDay[day]
	}));

	let xmlCalendar = {
		course: listOfLectureCurrentWeek[0].course,
		day: daysXml
	};

	return js2xmlparser.parse("calendar", xmlCalendar, { 'declaration': { 'encoding': 'UTF-8' } });
}

const showDay = (day, month, year) => {
	let monthAbbreviation = new Date(year, month - 1).toLocaleString('en-US', { month: 'short' }).toLowerCase();
	return day.includes(monthAbbreviation);
};

const checkToday = (day, month) => {
	let today = new Date();
	let todayDay = today.getDate();
	let monthAbbreviation = today.toLocaleString('en-US', { month: 'short' }).toLowerCase();
	return day == `${todayDay}-${monthAbbreviation}`;
}

const parseMonthToXml = (listOfLectureCurrentMonth, month, year) => {
	let daysXml = [];

	const daysOfMonth = getWeekDaysOfMonth(month, year); // Array to accumulate the week days of the month
	const daysOfMonthComb = [].concat.apply([], daysOfMonth); // flattened array
	const daysOfWeek = ["mon", "tue", "wed", "thu", "fri"];

	let lessonsByDay = {}; // Object to accumulate lessons for each day
	let weekIndex = 0;
	let weekDays = [];

	if (!checkEmptyObjects(listOfLectureCurrentMonth)) {
		listOfLectureCurrentMonth.forEach((week) => {
			let dayIndex = 0;
			weekDays = daysOfMonth[weekIndex];

			// Group lessons by day
			weekDays.forEach(day => {
				let weekDay = daysOfWeek[dayIndex];

				lessonsByDay[day] = week
					.filter(obj => obj.week_day === weekDay && obj.name !== undefined)
					.map(lesson => {
						let lessonDetails = {};
						if (lesson.name !== undefined) lessonDetails.name = lesson.name;
						if (lesson.begin !== undefined) lessonDetails.begin = lesson.begin;
						if (lesson.holiday !== undefined) lessonDetails.holiday = lesson.holiday;
						if (lesson.exam !== undefined) lessonDetails.exam = lesson.exam;
						if (lesson.lecture !== undefined) lessonDetails.lecture = lesson.lecture;
						if (lesson.other_event !== undefined) lessonDetails.other_event = lesson.other_event;
						if (lesson.voluntary !== undefined) lessonDetails.voluntary = lesson.voluntary;
						return lessonDetails;
					});

				dayIndex++;
			});

			weekIndex++;
		});
	}

	daysOfMonthComb.forEach(day => {
		let dayObj = {
			"@": {
				id: day
			},
			show: showDay(day, month, year),
			today: checkToday(day, month),
			day: day
		};

		if (lessonsByDay[day] !== undefined) {
			dayObj.lesson = lessonsByDay[day];
		}

		daysXml.push(dayObj);
	});

	let xmlCalendar = {
		course: listOfLectureCurrentMonth[0][0] === undefined ? "" : listOfLectureCurrentMonth[0][0].course,
		day: daysXml
	};

	return js2xmlparser.parse("calendar", xmlCalendar, { 'declaration': { 'encoding': 'UTF-8' } });
}

const getXmlForWeek = async (courseName, day, month, year) => {
	let htmlString;
	try {
		htmlString = await scrapeHtml(courseName, day, month, year);
	} catch (error) {
		return {};
	}

	let listOfLectureCurrentWeek = [];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let wholeWeek = html.querySelectorAll('.week_block');

		let course = html.querySelector('.week_block') && html.querySelector('.week_block').querySelector('.resource').textContent;
		listOfLectureCurrentWeek.push({ "course": course });

		for (const element of wholeWeek) {
			let type = element.querySelector('a > .tooltip > strong').textContent;
			let begin = element.querySelector('.week_block a').textContent.slice(0, 5);

			if (type === 'Sonstiger Termin' && begin === '07:00') {
				continue;
			}

			let end = element.querySelector('.week_block a').textContent.slice(7, 12);
			let first = new Date('1970-01-01 ' + begin);
			let last = new Date('1970-01-01 ' + end);
			let dif = last.getTime() - first.getTime();
			let difDate = new Date(dif);
			let timeDif = `${difDate.getHours() - 1}h ${difDate.getMinutes()}min`
				.replace('0h ', '')
				.replace(' 0min', '');

			let name = element.querySelector('a').innerHTML.split('<br>')[1].split('<span class="tooltip">')[0].replace('</span>', '');

			let holiday = begin == '08:00' && end == '18:00';
			let exam = element.style.backgroundColor == 'rgb(255, 0, 0)';
			let lecture = type === 'Lehrveranstaltung';
			let other_event = type === 'Sonstiger Termin';
			let voluntary = name.toLowerCase().includes('ccna');
			if (voluntary) exam = lecture = other_event = false;

			let weekDay = mapWeekDay(element.querySelectorAll('.tooltip div')[1].textContent.slice(0, 2));

			const resources = element.querySelectorAll('.resource');
			const personElems = element.querySelectorAll('.person');

			let rooms = [];
			let persons = [];

			resources.forEach(elem => {
				const textContent = elem.textContent.trim();

				if (textContent.includes("Hörsaal") || textContent.includes("Labor")) {
					rooms.push(textContent);
				}
			});

			personElems.forEach(elem => {
				const textContent = elem.textContent.trim();
				persons.push(textContent);
			});

			let allRooms = rooms.join('\n');
			let allPersons = persons.join('\n');

			let jsonObject = {
				name: name,
				person: allPersons ?? "",
				room: allRooms ?? "",
				total_time: timeDif,
				begin: begin.replace(':', '_'),
				end: end.replace(':', '_'),
				week_day: weekDay,
				holiday: holiday,
				exam: exam,
				lecture: lecture,
				other_event: other_event,
				voluntary: voluntary
			};

			listOfLectureCurrentWeek.push(jsonObject);
		}

		let parsedOutput = parseWeekToXml(listOfLectureCurrentWeek);

		return parsedOutput;
	}
}

const getXmlForMonth = async (courseName, month, year, day) => {
	let htmlString;
	try {
		htmlString = await scrapeHtml(courseName, day, month, year);
	} catch (error) {
		return {};
	}

	let listOfLectureCurrentMonth = [];
	const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let wholeMonth = html.querySelectorAll('.week_block');

		listOfLectureCurrentMonth.push({ "course": courseName });

		for (const element of wholeMonth) {
			let type = element.querySelector('a > .tooltip > strong').textContent;
			let begin = element.querySelector('.week_block a').textContent.slice(0, 5);

			if (type === 'Sonstiger Termin' && begin === '07:00') {
				continue;
			}

			let name = element.querySelector('a').innerHTML.split('<br>')[1].split('<span class="tooltip">')[0].replace('</span>', '');

			let end = element.querySelector('.week_block a').textContent.slice(7, 12);
			let holiday = begin == '08:00' && end == '18:00';
			let exam = element.style.backgroundColor == 'rgb(255, 0, 0)';
			let lecture = type === 'Lehrveranstaltung';
			let other_event = type === 'Sonstiger Termin';
			let voluntary = name.toLowerCase().includes('ccna');
			if (voluntary) exam = lecture = other_event = false;

			let weekDay = mapWeekDay(element.querySelectorAll('.tooltip div')[1].textContent.slice(0, 2));

			if (weekDay === null) {
				let germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
				let missingDay = element.querySelectorAll('.tooltip div')[1].textContent.split(' ')[0].replace('.', '');
				let monthName = element.querySelectorAll('.tooltip div')[1].textContent.split(' ')[1].split(' ')[0];
				let monthIndex = germanMonths.indexOf(monthName);
				let dateOfMissingDay = new Date(year, monthIndex, missingDay);
				weekDay = daysOfWeek[dateOfMissingDay.getDay()];
			}

			// let date = getDateOfSpecificDayInWeek(year, month, day, weekDay);
			// let monthAbbreviation = date.toLocaleString('default', { month: 'short' }).toLowerCase();
			// let jsonDay = `${date.getDate()}-${monthAbbreviation}`;

			let jsonObject = {
				name: name,
				begin: begin.replace(':', '_'),
				week_day: weekDay,
				holiday: holiday,
				exam: exam,
				lecture: lecture,
				other_event: other_event,
				voluntary: voluntary
			};

			listOfLectureCurrentMonth.push(jsonObject);
		}

		return listOfLectureCurrentMonth;
	}
}

reload(app);
