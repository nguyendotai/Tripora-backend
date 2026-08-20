import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { PostModule } from '../post/post.module';
import { CommentController } from './comment.controller';
import { CommentRepository } from './comment.repository';
import { CommentService } from './comment.service';

@Module({
  imports: [PostModule, NotificationModule],
  controllers: [CommentController],
  providers: [CommentRepository, CommentService],
})
export class CommentModule {}
