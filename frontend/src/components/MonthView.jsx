import React, { useEffect, useState } from 'react';
import "./MonthView.css";
import { MonthViewCard } from './MonthViewCard';

export const MonthView = ({ }) => {
    const [weekDates, setWeekDates] = useState([]);

    const isWeekday = date => date.getDay() % 6 !== 0;

    const getMonthStruct = () => {
        let todayDate = new Date();
        let firstDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        var lastDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        let firstDay = firstDate.getDay();
        let lastDay = lastDate.getDate();

        let todaysDay = todayDate.getDate();

        let month = ("0" + (todayDate.getMonth() + 1)).slice(-2);
        let year = todayDate.getFullYear();

        let dates = [];

        for (let i = 1; i < firstDay; i++) {
            dates.push({'day': '', 'show': false, 'today': false});
        }

        for (let i = 1; i <= lastDay; i++) {
            let day = ("0" + i).slice(-2);

            if (isWeekday(new Date(`${year}-${month}-${day}`))) {
                dates.push({'day': i, 'show': true, 'today': day == todaysDay ? true : false});
            }
        }

        for (let i = dates.length; i < 25; i++) {
            dates.push({'day': '', 'show': false, 'today': false});
        }
        console.log(dates);
        setWeekDates(dates);
    }

    useEffect(() => {
        getMonthStruct();
    }, [])

    return (
        <div className="month-view-wrap">
            <div className="month-view-head">
                <div className="month-view-head-day">Montag</div>
                <div className="month-view-head-day">Dienstag</div>
                <div className="month-view-head-day">Mittwoch</div>
                <div className="month-view-head-day">Donnerstag</div>
                <div className="month-view-head-day">Freitag</div>
            </div>

            <div className="month-view-body">
                {   weekDates && weekDates.length > 0 &&
                    weekDates.map((result, id) => {
                        return <MonthViewCard day={result.day} show={result.show} today={result.today} key={id} />
                    })
                }
            </div>
        </div>
    );
}