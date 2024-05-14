import React, { useEffect } from 'react';
import "./MonthView.css";
import { MonthViewCard } from './MonthViewCard';

export const MonthView = ({ }) => {

    // const getMonthStruct = () => {
    //     let todayDate = new Date();
    //     let firstDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    //     var lastDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    //     let firstDay = firstDate.getDay();
    //     let lastDay = lastDate.getDate();

    //     let dates = [];

    //     for (let i = 1; i <= lastDay; i++) {
            

    //         dates.push(i);
    //     }

    //     console.log(dates);

    //     // if(today.getDay() == 6 || today.getDay() == 0) alert('Weekend');

    // }

    // useEffect(() => {
    //     getMonthStruct();
    // }, [])

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
                {
                    // arr.map((result, id) => {
                    //     return <MonthViewCard day={result} show={true} key={id} />
                    // })
                }
            </div>
        </div>
    );
}