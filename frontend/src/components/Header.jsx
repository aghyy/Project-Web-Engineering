import React from 'react';
import "./Header.css";
import { setView } from '../assets/utils';
import { IoCalendar, IoListOutline } from "react-icons/io5";

export const Header = ({ title, setTitle }) => {

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
                    msgElem.style.color = 'green';
                    msgElem.textContent = 'Kurs gültig.';
                    return;
                }
            }

            input.classList.add('invalid-input');
            msgElem.style.color = 'red';
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
            let input = document.getElementById('course-input');
            setTitle(input.classList.contains('valid-input') ? `${input.value.toUpperCase()} Kalender` : title);
        }

        // get calendar for new course
    }

    return (
        <div className="head">
            <h1>{title}</h1>

            <div className="options">
                <div>
                    <div className="info-wrap">
                        <div className="date-wrap">
                            <p>Datum anzeigen</p>
                            <input type="date" name="date" id="date-picker" />
                        </div>

                        <div className="course-wrap">
                            <p>Kurs</p>
                            <input
                                type="text"
                                name="course"
                                id="course-input"
                                maxLength={8}
                                onKeyUp={(e) => {
                                    checkCourseInput();
                                    setCourse(e);
                                }}
                            />
                            <div className="course-msg"></div>
                        </div>
                    </div>
                </div>

                <div className="view-options">
                    <div
                        className="month-view active-view view-option"
                        onClick={(e) => {
                            setView(e.target);
                        }}
                    >
                        <div className='ignore-click'>
                            <IoCalendar />
                        </div>
                    </div>
                    <div
                        className="week-view view-option"
                        onClick={(e) => {
                            setView(e.target);
                        }}>
                        <div className='ignore-click'>
                            <IoListOutline />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}