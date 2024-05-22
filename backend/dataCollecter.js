const axios = require("axios");
const jsdom = require("jsdom");
const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
};
const users = new Map();
// 2023
users.set('TINF23B1', 'freudenmann');
users.set('TINF23B2', 'ritterbusch');
users.set('TINF23B3', 'vollmer');
users.set('TINF23B4', 'eisenbiegler');
users.set('TINF23B5', 'strand');
users.set('TINF23B6', 'li');

// 2022
users.set('TINF22B1', 'freudenmann');
users.set('TINF22B2', 'ritterbusch');
users.set('TINF22B3', 'vollmer');
users.set('TINF22B4', 'eisenbiegler');
users.set('TINF22B5', 'strand');
users.set('TINF22B6', 'eisenbiegler');

// 2021
users.set('TINF21B1', 'freudenmann');
users.set('TINF21B2', 'ritterbusch');
users.set('TINF21B3', 'vollmer');
users.set('TINF21B4', 'eisenbiegler');
users.set('TINF21B5', 'strand');

async function performScraping(courseName, day, month, year) {
	// HTTP GET request in Axios
	const axiosResponse = await axios.request({
		method: "GET",
		url: `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${users.get(courseName)}&file=${courseName}&day=${day}&month=${month}&year=${year}`,
		headers: headers
	});
	return axiosResponse;
}

const execute = async (inDate) => {
	const htmlString = await performScraping('TINF23B5', 17, 5, 2024);

	let date = new Date(inDate);
	let reqDate = `${date.getDate()}.${"0" + (date.getMonth() + 1).toString().slice(-2)}.`
	let listOfLectureCurrentWeek = [];

	let html = new jsdom.JSDOM(htmlString.data).window.document;
	if (html.body.children.length > 0) {
		let elems = html.querySelectorAll('.week_header>nobr');
		let index = 0;
		for (const element of elems) {
			if (element.textContent.includes(reqDate)) {
				break;
			}
			index++;
		}

		let wholeWeek = html.querySelectorAll('.week_block');
		for (const element of wholeWeek) {
			let jsonObject = {
				prof : element.querySelector('.person')?.textContent ?? "",
				course : element.querySelector('.resource').textContent,
				room : element.querySelectorAll('.resource')[1].textContent,
				weekDay : element.querySelectorAll('.tooltip div')[1].textContent.slice(0, 2),
				begin : element.querySelector('.week_block a').textContent.slice(0, 5),
				end : element.querySelector('.week_block a').textContent.slice(7, 12),
				quarters : element.getAttribute('rowspan')
			};
			listOfLectureCurrentWeek.push(jsonObject);
		}
		console.log(listOfLectureCurrentWeek[0]);
	}
}

execute("2024-06-05");
