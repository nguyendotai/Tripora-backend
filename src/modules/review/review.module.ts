import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { ReviewController } from './review.controller';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';

@Module({
  imports: [DestinationModule],
  controllers: [ReviewController],
  providers: [ReviewRepository, ReviewService],
})
export class ReviewModule {}
