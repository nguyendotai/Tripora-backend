import { Module } from '@nestjs/common';
import { AirportController } from './airport.controller';
import { AirportRepository } from './airport.repository';
import { AirportService } from './airport.service';

@Module({
  controllers: [AirportController],
  providers: [AirportService, AirportRepository],
  exports: [AirportRepository],
})
export class AirportModule {}
