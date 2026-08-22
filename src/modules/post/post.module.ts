import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { PostController } from './post.controller';
import { PostRepository } from './post.repository';
import { PostService } from './post.service';

@Module({
  imports: [DestinationModule, NotificationModule, ActivityLogModule],
  controllers: [PostController],
  providers: [PostRepository, PostService],
  exports: [PostRepository],
})
export class PostModule {}
