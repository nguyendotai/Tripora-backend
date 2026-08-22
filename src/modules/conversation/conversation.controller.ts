import {
  Body,
  Controller,
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
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

/** Thu tu route bat buoc: 'mine'/'mine/provider' phai dung truoc ':id/*' de tranh Nest khop
 * nham ':id' voi literal segment (da tung gap bug nay o TourGuideController). */
@ApiTags('Conversation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateConversationDto) {
    return this.conversationService.startConversation(BigInt(user.id), dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationService.listMine(BigInt(user.id));
  }

  @Get('mine/provider')
  listMineForProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationService.listMineForProvider(BigInt(user.id));
  }

  @Get(':id/messages')
  listMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.conversationService.listMessages(BigInt(user.id), parseIdParam(id), query);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationService.sendMessage(BigInt(user.id), parseIdParam(id), dto);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.conversationService.markAsRead(BigInt(user.id), parseIdParam(id));
  }
}
