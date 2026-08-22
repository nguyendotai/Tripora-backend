import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Conversation, ProviderStatus } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberRepository } from '../provider/organization-member.repository';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ROLE_PERMISSIONS } from '../provider/permissions';
import { ProviderRepository } from '../provider/provider.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationRepository } from './conversation.repository';

const MESSAGE_PREVIEW_LENGTH = 140;

type Side = 'traveler' | 'provider';

@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async startConversation(callerId: bigint, dto: CreateConversationDto) {
    const providerId = BigInt(dto.providerId);
    const provider = await this.providerRepository.findById(providerId);
    if (!provider || provider.status !== ProviderStatus.APPROVED) {
      throw new NotFoundException('Provider not found');
    }

    const conversation = await this.conversationRepository.createWithFirstMessage(
      callerId,
      providerId,
      dto.message,
    );
    await this.notifyProviderSide(conversation, dto.message);
    return conversation;
  }

  async listMine(callerId: bigint) {
    const conversations = await this.conversationRepository.listByUserId(callerId);
    const unreadCounts = await this.conversationRepository.countUnreadByConversationAndSender(
      conversations.map((c) => c.id),
    );

    return conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
      messages: undefined,
      unreadCount: unreadCounts
        .filter((row) => row.conversationId === conversation.id && row.senderId !== callerId)
        .reduce((sum, row) => sum + row._count._all, 0),
    }));
  }

  async listMineForProvider(callerId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(callerId, {
      permission: 'booking:view',
    });
    const conversations = await this.conversationRepository.listByProviderId(provider.id);
    const unreadCounts = await this.conversationRepository.countUnreadByConversationAndSender(
      conversations.map((c) => c.id),
    );

    return conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
      messages: undefined,
      unreadCount: unreadCounts
        .filter((row) => row.conversationId === conversation.id && row.senderId === conversation.userId)
        .reduce((sum, row) => sum + row._count._all, 0),
    }));
  }

  async listMessages(callerId: bigint, conversationId: bigint, query: ListMessagesDto) {
    const { conversation } = await this.requireParticipant(callerId, conversationId);
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.conversationRepository.findMessages(
      conversation.id,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async sendMessage(callerId: bigint, conversationId: bigint, dto: SendMessageDto) {
    const { conversation, side } = await this.requireParticipant(callerId, conversationId);
    const message = await this.conversationRepository.appendMessage(
      conversation.id,
      callerId,
      dto.content,
    );

    if (side === 'traveler') {
      await this.notifyProviderSide(conversation, dto.content);
    } else {
      await this.notifyTraveler(conversation, dto.content);
    }
    return message;
  }

  async markAsRead(callerId: bigint, conversationId: bigint) {
    const { conversation, side } = await this.requireParticipant(callerId, conversationId);
    if (side === 'traveler') {
      await this.conversationRepository.markMessagesFromProviderRead(
        conversation.id,
        conversation.userId,
      );
    } else {
      await this.conversationRepository.markMessagesFromTravelerRead(
        conversation.id,
        conversation.userId,
      );
    }
  }

  private async requireParticipant(
    callerId: bigint,
    conversationId: bigint,
  ): Promise<{ conversation: Conversation; side: Side }> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId === callerId) {
      return { conversation, side: 'traveler' };
    }

    const member = await this.organizationMemberRepository.findByUserId(callerId);
    if (
      member &&
      member.providerId === conversation.providerId &&
      ROLE_PERMISSIONS[member.role].has('booking:view')
    ) {
      return { conversation, side: 'provider' };
    }

    throw new ForbiddenException('You are not a participant of this conversation');
  }

  /** Best-effort — loi notify khong duoc chan luong gui tin chinh (cung triet ly voi
   * PaymentService.notifyProviderOfNewBooking). */
  private async notifyProviderSide(conversation: Conversation, content: string) {
    try {
      const members = await this.organizationMemberRepository.findByProviderId(
        conversation.providerId,
      );
      const preview = this.preview(content);
      await Promise.all(
        members
          .filter((member) => ROLE_PERMISSIONS[member.role].has('booking:view'))
          .map((member) => this.notificationService.notify(member.userId, 'Tin nhắn mới', preview)),
      );
    } catch {
      // best-effort, khong chan luong gui tin
    }
  }

  private async notifyTraveler(conversation: Conversation, content: string) {
    try {
      await this.notificationService.notify(
        conversation.userId,
        'Tin nhắn mới từ đối tác',
        this.preview(content),
      );
    } catch {
      // best-effort, khong chan luong gui tin
    }
  }

  private preview(content: string): string {
    return content.length > MESSAGE_PREVIEW_LENGTH
      ? `${content.slice(0, MESSAGE_PREVIEW_LENGTH)}…`
      : content;
  }
}
