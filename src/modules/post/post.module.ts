import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { PostController } from './post.controller';
import { PostRepository } from './post.repository';
import { PostService } from './post.service';

@Module({
  imports: [DestinationModule, NotificationModule],
  controllers: [PostController],
  providers: [PostRepository, PostService],
  exports: [PostRepository],
})
export class PostModule {}
