import React from 'react';
import "./MonthView.css";

export const MonthViewCard = ({ day }) => {

    return (
        <div className="month-view-card">
            <div className="month-view-day">
                <div>{day}</div>
            </div>
            <div className="month-view-day-info">
            </div>
        </div>
    );
}