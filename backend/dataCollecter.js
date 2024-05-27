const axios = require("axios");
const jsdom = require("jsdom");
const js2xmlparser = require("js2xmlparser");
const fs = require("fs");
const express = require('express');

const app = express();
const port = 6489;
const xml = require('xml');

app.get('/api/get_week/', async (req, res) => {
	res.set('Content-Type', 'application/xml');
	res.send(await getXml(req.body.course, req.body.day, req.body.month, req.body.year));
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});

const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
};
const users = JSON.parse(fs.readFileSync('../public/assets/json/courses.json', 'utf8'));
async function performScraping(courseName, day, month, year) {
	// HTTP GET request in Axios
	return await axios.request({
		method : "GET",
		url : `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${users[courseName]}&file=${courseName}&day=${day}&month=${month}&year=${year}`,
		headers : headers
	});
}

function mapWeekDay(germanDay) {
	const dayMapping = {
		'Mo': 'mon',
		'Di': 'tue',
		'Mi': 'wed',
		'Do': 'thu',
		'Fr': 'fri'
	};

	return dayMapping[germanDay] || null;  // Return null if the input is not a valid key
}

parseToXml = (listOfLectureCurrentWeek) => {
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
			end: lesson.end
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

	return js2xmlparser.parse("calendar", xmlCalendar, {'declaration': {'encoding': 'UTF-8'}}); // Return the XML for the entire week without XML declaration
}

const getXml = async (courseName, day, month, year) => {
	const htmlString = await performScraping(courseName, day, month, year);
	let listOfLectureCurrentWeek = [];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let wholeWeek = html.querySelectorAll('.week_block');

		let course = html.querySelector('.week_block').querySelector('.resource').textContent;
		listOfLectureCurrentWeek.push({ "course": course });

		for (const element of wholeWeek) {
			let begin = element.querySelector('.week_block a').textContent.slice(0, 5);
			let end = element.querySelector('.week_block a').textContent.slice(7, 12);
			let first = new Date('1970-01-01 ' + begin);
			let last = new Date('1970-01-01 ' + end);
			let dif = last.getTime() - first.getTime();
			let difDate = new Date(dif);
			let timeDif = `${difDate.getHours() - 1}h ${difDate.getMinutes()}m`;

			let weekDay = mapWeekDay(element.querySelectorAll('.tooltip div')[1].textContent.slice(0, 2));

			let jsonObject = {
				name: element.querySelector('a').textContent.split(/Titel:\n|\n/)[3],
				person: element.querySelector('.person')?.textContent ?? "",
				room: element.querySelectorAll('.resource')[1].textContent,
				total_time: timeDif,
				begin: begin,
				end: end,
				week_day: weekDay
			};
			listOfLectureCurrentWeek.push(jsonObject);
		}

		let parsedOutput = parseToXml(listOfLectureCurrentWeek);
		console.log(parsedOutput);
		return parsedOutput;
	}
}
