import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransferDto } from './dto/transfer.dto';

const transferInclude = {
  sender: { select: { email: true } },
  recipient: { select: { email: true } },
} satisfies Prisma.TransferInclude;

type TransferWithUsers = Prisma.TransferGetPayload<{
  include: typeof transferInclude;
}>;

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transfers = await this.prisma.transfer.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      balance: user.balance,
      transfers: transfers.map((t) => this.toView(t, userId)),
    };
  }

  async transfer(senderId: string, dto: TransferDto, idempotencyKey: string) {
    const previous = await this.findByKey(senderId, idempotencyKey);
    if (previous) {
      return this.toView(previous, senderId);
    }

    const recipient = await this.prisma.user.findUnique({
      where: { email: dto.recipient.trim().toLowerCase() },
    });
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }
    if (recipient.id === senderId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    try {
      const transfer = await this.prisma.$transaction(async (tx) => {
        // conditional update so balance can't go negative under concurrent requests
        const debit = await tx.user.updateMany({
          where: { id: senderId, balance: { gte: dto.amount } },
          data: { balance: { decrement: dto.amount } },
        });
        if (debit.count === 0) {
          throw new BadRequestException('Insufficient balance');
        }

        await tx.user.update({
          where: { id: recipient.id },
          data: { balance: { increment: dto.amount } },
        });

        return tx.transfer.create({
          data: {
            senderId,
            recipientId: recipient.id,
            amount: dto.amount,
            notes: dto.notes?.trim() || null,
            idempotencyKey,
          },
          include: transferInclude,
        });
      });

      return this.toView(transfer, senderId);
    } catch (err) {
      // same key sent twice at the same time (client retry), return the first one
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findByKey(senderId, idempotencyKey);
        if (existing) return this.toView(existing, senderId);
      }
      throw err;
    }
  }

  private findByKey(senderId: string, idempotencyKey: string) {
    return this.prisma.transfer.findUnique({
      where: { senderId_idempotencyKey: { senderId, idempotencyKey } },
      include: transferInclude,
    });
  }

  private toView(t: TransferWithUsers, userId: string) {
    const outgoing = t.senderId === userId;
    return {
      id: t.id,
      direction: outgoing ? 'out' : 'in',
      counterparty: outgoing ? t.recipient.email : t.sender.email,
      amount: t.amount,
      notes: t.notes,
      createdAt: t.createdAt,
    };
  }
}
