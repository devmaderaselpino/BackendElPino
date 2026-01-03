const firsSchedulePayment = (date) => {
   
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();

    const dia2 = new Date(year, month, 2);
    const dia17 = new Date(year, month, 17);

    if (d.getDate() === 2 || d.getDate() === 17) {
        return d;
    }

    if (d < dia2) {
        return dia2;
    }
    if (d < dia17) {
        return dia17;
    }

    return new Date(year, month + 1, 2);
}

export default firsSchedulePayment;
