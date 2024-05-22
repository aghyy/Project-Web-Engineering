const axios = require("axios");
const jsdom = require("jsdom");
const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
};

async function performScraping(user, courseName, day, month, year) {
	// HTTP GET request in Axios
	const axiosResponse = await axios.request({
		method: "GET",
		url: 'https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF23B6&day=17&month=5&year=2024&today=Heute',
		//url: `https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=${user}&file=${courseName}&day=${day}&month=${month}&year=${year}`,
		headers: headers
	});
	return axiosResponse;
}

const execute = async (inDate) => {
	const htmlString = await performScraping('li', 'TINF23B6', 17, 5, 2024);

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

execute("2024-05-21");
