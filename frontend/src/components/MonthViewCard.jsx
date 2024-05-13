import React from 'react';
import "./MonthView.css";

export const MonthViewCard = ({ day, show, today }) => {

    return (
        <div className="month-view-card">
            {show && (
                <div>
                    <div className={today ? 'month-view-day today' : 'month-view-day'}>
                        <div>{day}</div>
                    </div>
                    <div className="month-view-day-info">
                    </div>
                </div>
            )
            }
        </div>
    );
}