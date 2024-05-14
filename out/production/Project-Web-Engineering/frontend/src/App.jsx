import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { MonthView } from './components/MonthView'
import { WeekView } from './components/WeekView'
import { Header } from './components/Header'
import { setView } from './assets/utils';

function App() {
  const [defaultTitle, setDefaultTitle] = useState('Kurs auswählen');

  const handleKeyPress = useCallback((event) => {
    if (document.activeElement === document.querySelector('#course-input')) {
      // key shortcuts if input course is active
    } else {
      if (event.key === 'w') {
        event.preventDefault();
        setView(document.querySelector('.week-view'));
      } else if (event.key === 'm') {
        event.preventDefault();
        setView(document.querySelector('.month-view'));
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div>
      <Header title={defaultTitle} setTitle={setDefaultTitle} />
      <MonthView />
      <WeekView />
    </div>
  )
}

export default App
