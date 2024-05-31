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
	for (let i = 0; i < 5; i++) {
		const xmlData = await getXmlForMonth(req.body.course, req.body.month, req.body.year);
		fullXml.push(xmlData)
	}
	res.send(fullXml);
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

const parseToXml = (listOfLectureCurrentWeek) => {
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
			other_event: lesson.other_event
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

			let holiday = begin == '08:00' && end == '18:00';
			let exam = element.style.backgroundColor == 'rgb(255, 0, 0)';
			let lecture = type === 'Lehrveranstaltung';
			let other_event = type === 'Sonstiger Termin';

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

			let name = element.querySelector('a').innerHTML.split('<br>')[1].split('<span class="tooltip">')[0].replace('</span>', '');

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
				other_event: other_event
			};

			listOfLectureCurrentWeek.push(jsonObject);
		}

		let parsedOutput = parseToXml(listOfLectureCurrentWeek);

		return parsedOutput;
	}
}

const getXmlForMonth = async (courseName, month, year) => {
	const htmlString = await scrapeHtml(courseName, 1, month, year);
	let listOfLectureCurrentMonth = [];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let wholeMonth = html.querySelectorAll('.week_block');
		let course = html.querySelector('.week_block') && html.querySelector('.week_block').querySelector('.resource').textContent;

		listOfLectureCurrentMonth.push({ "course": course });

		for (const element of wholeMonth) {
			let type = element.querySelector('a > .tooltip > strong').textContent;
			let begin = element.querySelector('.week_block a').textContent.slice(0, 5);

			if (type === 'Sonstiger Termin' && begin === '07:00') {
				continue;
			}

			let end = element.querySelector('.week_block a').textContent.slice(7, 12);
			let holiday = begin == '08:00' && end == '18:00';
			let exam = element.style.backgroundColor == 'rgb(255, 0, 0)';
			let lecture = type === 'Lehrveranstaltung';
			let other_event = type === 'Sonstiger Termin';

			let weekDay = mapWeekDay(element.querySelectorAll('.tooltip div')[1].textContent.slice(0, 2));
			let name = element.querySelector('a').innerHTML.split('<br>')[1].split('<span class="tooltip">')[0].replace('</span>', '');

			let jsonObject = {
				name: name,
				begin: begin.replace(':', '_'),
				week_day: weekDay,
				holiday: holiday,
				exam: exam,
				lecture: lecture,
				other_event: other_event
			};

			listOfLectureCurrentMonth.push(jsonObject);
		}

		return parseToXml(listOfLectureCurrentMonth);
	}
}

reload(app);
