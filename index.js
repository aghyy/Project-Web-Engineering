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
	let flag = false;
	for (let i = 0; i < 5; i++) {
		if (isWeekend(req.body.year, req.body.month, day) && !flag) {
			day += 7;
			flag = true;
			continue;
		}

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

const createSubarrays = (arr) => {
	let result = [];
	let subarray = [];

	for (let i = 0; i < arr.length; i++) {
		subarray.push(arr[i]);

		// Check if the next element is not consecutive
		if (arr[i + 1] !== arr[i] + 1) {
			result.push(subarray);
			subarray = [];
		}
	}

	// Push the last subarray if it contains any elements
	if (subarray.length) {
		result.push(subarray);
	}

	return result;
}

function mapFirstDay(firstDay) {
    const mapping = {
        3: 3,
        2: 4
    };
    return mapping.hasOwnProperty(firstDay) ? mapping[firstDay] : firstDay;
}

const getWeekDaysOfMonth = (month, year, firstDay) => {
	const weekdays = [];
	const date = new Date(year, month - 1, 1);
	let dayIndex = mapFirstDay(firstDay);

	while (date.getMonth() === month - 1) {
		const dayOfWeek = date.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 is Sunday, 6 is Saturday
			weekdays.push(date.getDate());
		}
		date.setDate(date.getDate() + 1);
	}

	const result = createSubarrays(weekdays);

	return result;
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

const parseMonthToXml = (listOfLectureCurrentMonth, month, year) => {
	let daysXml = [];
	let firstDate = new Date(year, month - 1, 1);
	let firstDay = firstDate.getDay();
	let firstDayDiff = firstDay === 6 ? 5 - firstDay + 2 : firstDay;

	const daysOfMonth = getWeekDaysOfMonth(month, year, firstDay); // Array to accumulate the week days of the month
	const daysOfMonthComb = [].concat.apply([], daysOfMonth); // Flatten the array
	const daysOfWeek = ["mon", "tue", "wed", "thu", "fri"];

	let lessonsByDay = {}; // Object to accumulate lessons for each day
	let weekIndex = 0;
	let weekDays = [];

	listOfLectureCurrentMonth.forEach((week) => {
		let dayIndex = weekIndex === 0 ? firstDayDiff - 1 : 0;
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

	for (let i = 1; i < firstDay; i++) {
		daysXml.push({
			"@": {
				id: 'hidden'
			}
		});
	}

	daysOfMonthComb.forEach(day => {
		let dayObj = {
			"@": {
				id: day
			},
			show: true,
			today: new Date(`${year}-${month}-${day}`).toDateString() == new Date().toDateString(),
			day: day
		};

		if (lessonsByDay[day] !== undefined) {
			dayObj.lesson = lessonsByDay[day];
		}

		daysXml.push(dayObj);
	});

	let additionalDaysNeeded = 25 - daysXml.length;

	for (let i = 0; i < additionalDaysNeeded; i++) {
		daysXml.push({
			"@": {
				id: 'hidden'
			}
		});
	}

	let xmlCalendar = {
		course: listOfLectureCurrentMonth[0][0].course,
		day: daysXml
	};

	return js2xmlparser.parse("calendar", xmlCalendar, { 'declaration': { 'encoding': 'UTF-8' } });
}

const getXmlForWeek = async (courseName, day, month, year) => {
	const htmlString = await scrapeHtml(courseName, day, month, year);
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
	const htmlString = await scrapeHtml(courseName, day, month, year);
	let listOfLectureCurrentMonth = [];
	const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let wholeMonth = html.querySelectorAll('.week_block');
		let course = courseName;

		listOfLectureCurrentMonth.push({ "course": course });

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
				let missingDay = element.querySelectorAll('.tooltip div')[1].textContent.split(' ')[0].replace('.', '');
				let monthOfMissingDay = element.querySelectorAll('.tooltip div')[1].textContent.split(' ')[1].split(' ')[0];
				let nameOfSelectedMonth = new Date(year, month - 1).toLocaleString('de-DE', { month: 'long' });

				if (nameOfSelectedMonth !== monthOfMissingDay) {
					console.log(nameOfSelectedMonth, monthOfMissingDay);
					continue;
				}

				let dateOfMissingDay = new Date(year, month - 1, missingDay);
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

		console.log(listOfLectureCurrentMonth);

		return listOfLectureCurrentMonth;
	}
}

reload(app);
