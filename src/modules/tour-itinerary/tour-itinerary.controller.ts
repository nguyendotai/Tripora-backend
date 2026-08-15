import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTourItineraryDto } from './dto/create-tour-itinerary.dto';
import { ListTourItinerariesDto } from './dto/list-tour-itineraries.dto';
import { UpdateTourItineraryDto } from './dto/update-tour-itinerary.dto';
import { TourItineraryService } from './tour-itinerary.service';

@ApiTags('Tour Itinerary')
@Controller('tour-itineraries')
export class TourItineraryController {
  constructor(private readonly tourItineraryService: TourItineraryService) {}

  @Get()
  list(@Query() query: ListTourItinerariesDto) {
    return this.tourItineraryService.list(BigInt(query.tourId));
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListTourItinerariesDto) {
    return this.tourItineraryService.listMine(BigInt(user.id), BigInt(query.tourId));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTourItineraryDto) {
    return this.tourItineraryService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTourItineraryDto,
  ) {
    return this.tourItineraryService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tourItineraryService.remove(BigInt(user.id), parseIdParam(id));
  }
}
