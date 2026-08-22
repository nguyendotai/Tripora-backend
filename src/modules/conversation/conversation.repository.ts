import { Injectable } from '@nestjs/common';
import { Conversation, Message } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndProvider(userId: bigint, providerId: bigint): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
  }

  findById(id: bigint): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  /** Tim-hoac-tao trong 1 transaction (backend/CLAUDE.md muc 3/5) — upsert Conversation (tao moi
   * hoac cham lastMessageAt neu da co) roi tao Message dau tien. */
  async createWithFirstMessage(
    userId: bigint,
    providerId: bigint,
    content: string,
  ): Promise<Conversation> {
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: { userId_providerId: { userId, providerId } },
        create: { userId, providerId },
        update: { lastMessageAt: new Date() },
      });
      await tx.message.create({
        data: { conversationId: conversation.id, senderId: userId, content },
      });
      return conversation;
    });
  }

  listByUserId(userId: bigint) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        provider: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  listByProviderId(providerId: bigint) {
    return this.prisma.conversation.findMany({
      where: { providerId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  /** 1 query dung chung cho ca 2 danh sach (Traveler + Provider) — Service tu gop theo senderId
   * phu hop tung phia, tranh N+1 dem unread tung Conversation rieng le. */
  countUnreadByConversationAndSender(conversationIds: bigint[]) {
    return this.prisma.message.groupBy({
      by: ['conversationId', 'senderId'],
      where: { conversationId: { in: conversationIds }, isRead: false },
      _count: { _all: true },
    });
  }

  async findMessages(
    conversationId: bigint,
    skip: number,
    take: number,
  ): Promise<[Message[], number]> {
    const where = { conversationId };
    return this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);
  }

  /** Gui tin + cham lastMessageAt trong 1 transaction (multi-table write, backend/CLAUDE.md muc 3). */
  async appendMessage(conversationId: bigint, senderId: bigint, content: string): Promise<Message> {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, senderId, content },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      return message;
    });
  }

  /** Traveler mo thread — danh dau da doc cac tin nhan phia Provider gui (khong phai cua chinh
   * Traveler). */
  markMessagesFromProviderRead(conversationId: bigint, travelerUserId: bigint) {
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: travelerUserId }, isRead: false },
      data: { isRead: true },
    });
  }

  /** Provider staff mo thread — danh dau da doc cac tin nhan Traveler gui. */
  markMessagesFromTravelerRead(conversationId: bigint, travelerUserId: bigint) {
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: travelerUserId, isRead: false },
      data: { isRead: true },
    });
  }
}
