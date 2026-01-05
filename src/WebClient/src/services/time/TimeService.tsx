import { format } from 'date-fns';

const TimeService = {
  getCurrentDateTime(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  },

  formatDateToEURWithHour(dateString: string): string {
    if (!dateString)
      return 'Invalid date';

    const date = new Date(dateString);
    if (isNaN(date.getTime()))
      return '-';

    return format(date, 'dd.MM.yyyy HH:mm');
  },

  formatDateToEUR(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  },

  formatDateToForm(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  },

  calculateSkippedDays(endDate: string): number {
    const currentDate = new Date();
    const end = new Date(endDate);
    const timeDiff = currentDate.getTime() - end.getTime();
    const days = timeDiff / (1000 * 3600 * 24);
    return Math.floor(days);
  },

  calculateDaysLeft(endDate: string): number {
    const currentDate = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - currentDate.getTime();
    const daysLeft = timeDiff / (1000 * 3600 * 24);
    return Math.ceil(daysLeft);
  },

  calculateDaysLeftPassed(endDate: string): string {
    const currentDate = new Date();
    const end = new Date(endDate);

    if (currentDate <= end) {
      const timeDiff = end.getTime() - currentDate.getTime();
      const daysLeft = timeDiff / (1000 * 3600 * 24);
      return `${Math.ceil(daysLeft)} days left`;
    }
    else {
      const timeDiff = currentDate.getTime() - end.getTime();
      const days = timeDiff / (1000 * 3600 * 24);
      return `${Math.floor(days)} days passed`;
    }
  },

  generateDateRange(startDate: string, endDate: string): string[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray: string[] = [];

    while (start <= end) {
      dateArray.push(start.toISOString().split('T')[0]);
      start.setDate(start.getDate() + 1);
    }

    return dateArray;
  },

  formatDateToMonth(date: Date): string {
    return date.toISOString().substring(0, 7);
  },
};

export default TimeService;