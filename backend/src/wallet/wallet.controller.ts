import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransferDto } from './dto/transfer.dto';
import { WalletService } from './wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@CurrentUser() user: AuthUser) {
    return this.walletService.getWallet(user.id);
  }

  @Post('transfer')
  transfer(
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.walletService.transfer(
      user.id,
      dto,
      idempotencyKey?.slice(0, 100) || randomUUID(),
    );
  }
}
