import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let tx: any;

  const sender = { id: 'u1', email: 'a@mail.com' };
  const recipient = { id: 'u2', email: 'b@mail.com' };

  beforeEach(() => {
    tx = {
      user: { updateMany: jest.fn(), update: jest.fn() },
      transfer: { create: jest.fn() },
    };
    prisma = {
      user: { findUnique: jest.fn() },
      transfer: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    service = new WalletService(prisma as PrismaService);
  });

  it('moves money from sender to recipient', async () => {
    prisma.user.findUnique.mockResolvedValue(recipient);
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    tx.transfer.create.mockResolvedValue({
      id: 't1',
      senderId: sender.id,
      recipientId: recipient.id,
      amount: 5000,
      notes: 'lunch',
      createdAt: new Date(),
      sender: { email: sender.email },
      recipient: { email: recipient.email },
    });

    const result = await service.transfer(
      sender.id,
      { recipient: recipient.email, amount: 5000, notes: 'lunch' },
      'key-1',
    );

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: sender.id, balance: { gte: 5000 } },
      data: { balance: { decrement: 5000 } },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: recipient.id },
      data: { balance: { increment: 5000 } },
    });
    expect(result).toMatchObject({
      direction: 'out',
      counterparty: recipient.email,
      amount: 5000,
    });
  });

  it('fails when balance is not enough', async () => {
    prisma.user.findUnique.mockResolvedValue(recipient);
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.transfer(sender.id, { recipient: recipient.email, amount: 999 }, 'key-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.transfer.create).not.toHaveBeenCalled();
  });

  it('rejects transfer to yourself', async () => {
    prisma.user.findUnique.mockResolvedValue(sender);

    await expect(
      service.transfer(sender.id, { recipient: sender.email, amount: 10 }, 'key-3'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects unknown recipient', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.transfer(sender.id, { recipient: 'x@mail.com', amount: 10 }, 'key-4'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns existing transfer when idempotency key was already used', async () => {
    prisma.transfer.findUnique.mockResolvedValue({
      id: 't1',
      senderId: sender.id,
      recipientId: recipient.id,
      amount: 5000,
      notes: null,
      createdAt: new Date(),
      sender: { email: sender.email },
      recipient: { email: recipient.email },
    });

    const result = await service.transfer(
      sender.id,
      { recipient: recipient.email, amount: 5000 },
      'key-1',
    );

    expect(result.id).toBe('t1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
