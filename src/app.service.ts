import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { log } from 'util';

@Injectable()
export class AppService {
  getPool() {
    return new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'car-rent',
      password: 'ignatenko123',
      port: 5433,
    });
  }

  getPriceByDays(day: number) {
    let price = 0;
    let calculateDay = day;
    switch (true) {
      case calculateDay > 17:
        price = price + 1000 * (calculateDay - 17) * 0.85; //-15% discount
        calculateDay = 17;
      case calculateDay > 9:
        price = price + 1000 * (calculateDay - 9) * 0.9; //-10% discount
        calculateDay = 9;
      case calculateDay > 4:
        price = price + 1000 * (calculateDay - 4) * 0.95; //-5% discount
        calculateDay = 4;
      default:
        price = price + 1000 * calculateDay; //no discount
    }
    return price;
  }

  daysBetweenDates(s_date, e_date): number {
    //Difference between 'end' and 'start' dates
    const diff_time = e_date.getTime() - s_date.getTime();
    return Math.ceil(diff_time / (1000 * 60 * 60 * 24));
  }

  addNewCar(id, regNumber): string {
    const Pool = this.getPool();
    Pool.connect();
    Pool.query(
      `INSERT INTO cars
         VALUES ($1, $2)`,
      [id, regNumber],
      (err, res) => {
        console.log(err, res);
      },
    );
    Pool.end();
    return `Added car: ${regNumber} with id: ${id}`;
  }

  addNewRent(id, car, start_date, end_date): string {
    //End date string to Date
    const eDateArr = end_date.split('.');
    const e_date = new Date(`${eDateArr[2]}-${eDateArr[1]}-${eDateArr[0]}`);
    if (e_date.getDay() > 5) {
      return "Error: end day can't be weekend!";
    }
    //Start date string to Date
    const sDateArr = start_date.split('.');
    const s_date = new Date(`${sDateArr[2]}-${sDateArr[1]}-${sDateArr[0]}`);
    if (s_date.getDay() > 5) {
      return "Error: start day can't be weekend!";
    }
    const rent_days = this.daysBetweenDates(s_date, e_date) + 1;
    if (rent_days > 30) {
      return 'Error: rend days more that 30!';
    }
    const Pool = this.getPool();
    Pool.connect();
    Pool.query(
      `INSERT INTO rent
         VALUES ($1, $2, to_date($3, 'DD.MM.YYYY'), to_date($4, 'DD.MM.YYYY'), $5, $6)`,
      [
        id,
        car,
        start_date,
        end_date,
        rent_days,
        this.getPriceByDays(rent_days),
      ],
      (err, res) => {
        // console.log(err, res);
      },
    );
    Pool.end();
    return `Added rent: ${start_date} with id: ${id}`;
  }

  async isAvalableCar(gosNumber: string): Promise<boolean> {
    console.log(gosNumber);
    const Pool = this.getPool();
    const result = await Pool.query(
      `SELECT *
         FROM rent
                INNER JOIN cars ON rent.car = cars.id
         WHERE cars.number = $1
           AND (rent.end_date + integer '3') >= current_date
           AND rent.start_date <= current_date`,
      [gosNumber],
    );
    return result.rows.length === 0;
  }

  async loadByCar(
    gosNumber: string,
    month: number,
    year: number,
  ): Promise<string> {
    console.log(gosNumber);
    const date = new Date(month + '.01.' + year);
    const Pool = this.getPool();
    const result = await Pool.query(
      `SELECT *
         FROM rent
                INNER JOIN cars ON rent.car = cars.id
         WHERE cars.number = $1
           AND rent.end_date >= $2
           AND rent.start_date <= ($2 + INTERVAL '1' MONTH)
         ORDER BY rent.start_date`,
      [gosNumber, date],
    );
    let days_in_month;
    if (month === 12) {
      days_in_month = 31;
    } else {
      days_in_month = this.daysBetweenDates(
        new Date(date),
        new Date(month + 1 + '.01.' + year),
      );
    }
    let rent_days = 0;
    result.rows.forEach((item) => {
      if (item.start_date < date) {
        console.log('FIRST IF', date, item);
        rent_days = rent_days + 1 + this.daysBetweenDates(date, item.end_date);
      } else if (item.end_date > new Date(month + 1 + '.01.' + year)) {
        console.log('SECOND IF', date, item);
        rent_days =
          rent_days +
          this.daysBetweenDates(
            item.start_date,
            new Date(month + 1 + '.01.' + year),
          );
      } else {
        console.log('THIRD IF', date, item);
        rent_days = rent_days + item.days;
      }
    });
    console.log(gosNumber);
    // console.log(days_in_month);
    // console.log('Rent days:', rent_days);
    return (
      gosNumber + ' ' + Math.round((rent_days / days_in_month) * 100) + '%'
    );
  }

  loadByAllCars = async (month, year) => {
    {
      const Pool = this.getPool();
      const result = await Pool.query(`SELECT number
                                 FROM cars`);
      const resultArray = [];
      let res;
      for (const item of result.rows) {
        res = await this.loadByCar(item.number, month, year);
        resultArray.push(res);
      }
      return resultArray;
    }
  };
}
