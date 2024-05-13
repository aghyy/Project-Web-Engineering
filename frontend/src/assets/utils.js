export const setView = (elem) => {
    const prevSelectedView = document.querySelector('.view-option.active-view');
    const monthView = document.querySelector('.month-view-wrap');
    const weekView = document.querySelector('.week-view-wrap');

    if (elem === prevSelectedView) {
        return;
    }

    prevSelectedView.classList.remove('active-view');
    elem.classList.add('active-view');

    if (elem.classList.contains('month-view')) {
        weekView.style.display = 'none';
        monthView.style.display = 'block';
    } else if (elem.classList.contains('week-view')) {
        monthView.style.display = 'none';
        weekView.style.display = 'block';
    }
}