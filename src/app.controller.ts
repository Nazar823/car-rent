import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('addCar')
  addNewCar(@Body() car): string {
    return this.appService.addNewCar(car.id, car.number);
  }

  @Post('addRent')
  addNewRent(@Body() rent): string {
    return this.appService.addNewRent(
      rent.id,
      rent.car,
      rent.start_date,
      rent.end_date,
    );
  }

  @Get('avalable')
  async checkAvalableCar(@Body() car): Promise<boolean> {
    return await this.appService.isAvalableCar(car.gosNum);
  }
  @Get('carLoad')
  async checkLoadCar(@Body() data): Promise<string> {
    return await this.appService.loadByCar(data.gosNum, data.month, data.year);
  }
  @Get('allCarsLoad')
  async checkLoadAllCars(@Body() data): Promise<any[]> {
    return await this.appService.loadByAllCars(data.month, data.year);
  }
}
