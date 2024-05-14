import React from 'react';
import "./WeekView.css";

export const WeekView = ({ }) => {

    return (
        <div className="week-view-wrap">
            <div className="week-view-outer-wrap">
                <div className="week-view-data">
                    <div className="week-view-day-title"></div>
                    <div className="week-view-time-data">
                        <div className="week-view-time">07:00</div>
                        <div className="week-view-time">08:00</div>
                        <div className="week-view-time">09:00</div>
                        <div className="week-view-time">10:00</div>
                        <div className="week-view-time">11:00</div>
                        <div className="week-view-time">12:00</div>
                        <div className="week-view-time">13:00</div>
                        <div className="week-view-time">14:00</div>
                        <div className="week-view-time">15:00</div>
                        <div className="week-view-time">16:00</div>
                        <div className="week-view-time">17:00</div>
                        <div className="week-view-time">18:00</div>
                    </div>
                </div>
                <div className="week-view-inner-wrap">
                    <div className="week-view-day-title">Montag</div>
                    <div className="week-view-day-data"></div>
                </div>
                <div className="week-view-inner-wrap">
                    <div className="week-view-day-title">Dienstag</div>
                    <div className="week-view-day-data"></div>
                </div>
                <div className="week-view-inner-wrap">
                    <div className="week-view-day-title">Mittwoch</div>
                    <div className="week-view-day-data"></div>
                </div>
                <div className="week-view-inner-wrap">
                    <div className="week-view-day-title">Donnerstag</div>
                    <div className="week-view-day-data"></div>
                </div>
                <div className="week-view-inner-wrap">
                    <div className="week-view-day-title">Freitag</div>
                    <div className="week-view-day-data"></div>
                </div>
            </div>
        </div>
    );
}