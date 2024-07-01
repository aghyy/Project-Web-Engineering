const express = require("express");
const path = require("path");
const reload = require("reload");
const axios = require("axios");
const jsdom = require("jsdom");
const js2xmlparser = require("js2xmlparser");
const fs = require("fs");
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 6059;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

app.post('/api/get_day/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	const xmlData = await getXmlForWeek(req.body.course, req.body.day, req.body.month, req.body.year);
	const date = new Date(req.body.year, req.body.month - 1, req.body.day);
	const weekDay = daysOfWeek[date.getDay()];
	const xmlDataForDay = getXMLForDay(xmlData, weekDay);
	res.send(xmlDataForDay);
});

app.post('/api/get_week/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	const xmlData = await getXmlForWeek(req.body.course, req.body.day, req.body.month, req.body.year);
	res.send(xmlData);
});

app.post('/api/get_month/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	const xmlData = await getXmlMonthData(req.body.course, req.body.month, req.body.year);
	res.send(xmlData);
});

app.post('/api/get_menu', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	const xmlData = await getXmlWeekMenu();
	res.send(xmlData);
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
};

const users = JSON.parse(fs.readFileSync('public/assets/json/courses.json', 'utf8'));

const scrapeHtml = async (url) => {
	return await axios.request({
		method: "GET",
		url: url,
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

const foodAdditions = ['Antioxidationsmittel', 'Farbstoff geschwefelt', 'Konservierungsstoffe', 'gewachst', 'Farbstoff geschwärzt'];

const foodAdditionsSplitAndJoin = (str) => {
	let placeholderMap = new Map();
	let placeholderIndex = 0;

	foodAdditions.forEach(element => {
		let placeholder = `__PLACEHOLDER_${placeholderIndex}__`;
		placeholderMap.set(placeholder, element);
		str = str.replace(new RegExp(element, 'g'), placeholder);
		placeholderIndex++;
	});

	let parts = str.split(' ');

	for (let i = 0; i < parts.length; i++) {
		if (placeholderMap.has(parts[i])) {
			parts[i] = placeholderMap.get(parts[i]);
		}
	}

	return parts.join(', ');
}

const getXMLForDay = (xmlString, dayId) => {
	const dayRegex = new RegExp(`<day\\s+id=['"]${dayId}['"][^>]*>(.*?)<\/day>`, 's');
	const match = xmlString.match(dayRegex);

	if (!match) {
		return '';
	}

	const xmlStringForDay = match[0];
	const fullXMLForDay = `<?xml version='1.0' encoding='UTF-8'?><calendar>${xmlStringForDay}</calendar>`;

	return fullXMLForDay;
};

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

const parseXmlMenu = (json) => {
	let dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
	let index = 0;
	let xml = '<menu>';

	json.forEach(dayArray => {
		xml += '<day>';

		xml += `<day-name>${dayNames[index]}</day-name>`;

		dayArray.forEach(dayObject => {
			let meals = dayObject.jsonObject.meals;
			xml += '<meals>';

			meals.forEach(meal => {
				xml += '<meal>';
				xml += `<name>${meal.meal}</name>`;
				xml += `<allergies>${meal.allergies}</allergies>`;
				xml += `<additions>${meal.additions}</additions>`;
				xml += `<type>${meal.type}</type>`;
				xml += `<price>${meal.price}</price>`;
				xml += '</meal>';
			});

			xml += '</meals>';
		});

		xml += '</day>';

		index++;
	});

	xml += '</menu>';
	return xml;
}

const getXmlMonthData = async (courseName, month, year) => {
	let fullXml = [];
	let day = 1;
	let promises = [];

	for (let i = 0; i < 6; i++) {
		promises.push(getXmlForMonth(courseName, month, year, day));
		day += 7;
	}

	const results = await Promise.all(promises);
	fullXml.push(...results);

	const parsedXml = parseMonthToXml(fullXml, month, year);

	return parsedXml;
}

const getXmlForWeek = async (courseName, day, month, year) => {
	let htmlString;
	let url = `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${users[courseName]}&file=${courseName}&day=${day}&month=${month}&year=${year}`;
	try {
		htmlString = await scrapeHtml(url);
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

			if (type === 'Sonstiger Termin' && begin.split(':')[0] <= 7) {
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
	let url = `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${users[courseName]}&file=${courseName}&day=${day}&month=${month}&year=${year}`;

	try {
		htmlString = await scrapeHtml(url);
	} catch (error) {
		return {};
	}

	let listOfLectureCurrentMonth = [];
	const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	let html = new jsdom.JSDOM(htmlString.data).window.document;

	if (html.body.children.length <= 0) {
		return;
	}

	listOfLectureCurrentMonth.push({ "course": courseName });
	let wholeMonth = html.querySelectorAll('.week_block');

	for (const element of wholeMonth) {
		let type = element.querySelector('a > .tooltip > strong').textContent;
		let begin = element.querySelector('.week_block a').textContent.slice(0, 5);
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

const getXmlDayMenu = async (url) => {
	let htmlString;

	try {
		htmlString = await scrapeHtml(url);
	} catch (error) {
		return {};
	}
	let listOfMenuForDay = [];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let meal = html.querySelectorAll('.aw-meal-category');
		for (const element of meal) {
			let meals = [];
			element.querySelectorAll('.aw-meal').forEach((elem) => {
				let type, allergies, additions, meal, price = undefined;
				if (elem.querySelector('.aw-meal-description')) {
					meal = elem.querySelector('.aw-meal-description').textContent;
				}
				if (elem.querySelector('.aw-meal-attributes')) {
					let attributes = elem.querySelector('.aw-meal-attributes > span').innerHTML.replace(/&nbsp;&nbsp;/g, '');
					type = attributes.split(' ')[0] !== attributes.split(' ')[0].toUpperCase() ? attributes.split(' ')[0] : '';
					allergies = attributes.includes('ALLERGEN') ? attributes.split('ALLERGEN ')[1].split(' ').join(', ') : 'Keine Allergene';
					additions = attributes.includes('ZUSATZ') ? foodAdditionsSplitAndJoin(attributes.split('ZUSATZ ')[1].split(' ALLERGEN')[0]) : 'Keine Zusatzstoffe';
				}
				if (elem.querySelector('.aw-meal-price')) {
					price = elem.querySelector('.aw-meal-price').textContent;
				}

				let mealObject = {
					meal: meal,
					allergies: allergies,
					additions: additions,
					type: type,
					price: price
				};

				meals.push(mealObject);
			});

			let jsonObject = {
				meals: meals
			};

			listOfMenuForDay.push({ jsonObject });
		}
	}

	return listOfMenuForDay;
}

const getXmlWeekMenu = async () => {
	let weekDays = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];

	let promises = weekDays.map(day => {
		const url = `https://www.imensa.de/karlsruhe/mensa-erzbergerstrasse/${day}.html`;
		return getXmlDayMenu(url);
	});

	const listOfMenuForWeek = await Promise.all(promises);

	return parseXmlMenu(listOfMenuForWeek);
}

reload(app);
