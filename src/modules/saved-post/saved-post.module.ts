import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { SavedPostController } from './saved-post.controller';
import { SavedPostRepository } from './saved-post.repository';
import { SavedPostService } from './saved-post.service';

@Module({
  imports: [PostModule],
  controllers: [SavedPostController],
  providers: [SavedPostService, SavedPostRepository],
})
export class SavedPostModule {}
